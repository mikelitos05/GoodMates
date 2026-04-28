param(
    [ValidateSet("deploy", "outputs", "test", "ssm", "delete")]
    [string]$Action = "deploy",

    [ValidateSet("us-east-1", "us-west-2")]
    [string]$Region = "us-east-1",

    [string]$StackName = "transport-cloud-lab",
    [string]$ProjectName = "transporte-lab",

    [ValidateSet("t2.nano", "t2.micro", "t2.small", "t2.medium", "t2.large", "t3.nano", "t3.micro", "t3.small", "t3.medium", "t3.large")]
    [string]$InstanceType = "t3.micro",

    [switch]$CreateNatGateway,
    [switch]$CreateLambda,
    [switch]$SkipRds,

    [string]$DBUsername = "transportadmin",
    [string]$DBPassword = "",
    [string]$ExistingInstanceProfile = "",
    [string]$LambdaRoleArn = ""
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$TemplateFile = Join-Path $Root "infra\aws\goodmates-aws-base.yaml"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-AwsCli {
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        throw "AWS CLI no esta instalado o no esta en PATH."
    }
}

function New-LabPassword {
    $chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789".ToCharArray()
    $random = 1..20 | ForEach-Object { $chars | Get-Random }
    return (-join $random) + "A1"
}

function Get-StackOutput {
    param([string]$Key)
    $value = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='$Key'].OutputValue | [0]" `
        --output text
    if ($value -eq "None") { return "" }
    return $value
}

function Show-Outputs {
    Write-Step "Outputs del stack $StackName"
    aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query "Stacks[0].Outputs[].{Clave:OutputKey,Valor:OutputValue}" `
        --output table
}

function Get-LabInstanceProfile {
    if ($ExistingInstanceProfile) {
        return $ExistingInstanceProfile
    }

    try {
        $profile = aws iam list-instance-profiles `
            --query "InstanceProfiles[?Roles[?RoleName=='AmazonSSMRoleForInstancesQuickSetup']].InstanceProfileName | [0]" `
            --output text 2>$null

        if ($profile -and $profile -ne "None") {
            return $profile
        }
    }
    catch {
        Write-Host "No pude detectar el instance profile; usare LabInstanceProfile." -ForegroundColor Yellow
    }

    return "LabInstanceProfile"
}

function Deploy-Stack {
    Require-AwsCli

    if (-not (Test-Path $TemplateFile)) {
        throw "No existe el template: $TemplateFile"
    }

    if (-not $DBPassword) {
        $script:DBPassword = New-LabPassword
        Write-Host "Password de base de datos generado para esta sesion: $DBPassword" -ForegroundColor Yellow
        Write-Host "Guardalo si necesitas conectarte a la base de datos." -ForegroundColor Yellow
    }

    $profile = Get-LabInstanceProfile
    $createNat = if ($CreateNatGateway.IsPresent) { "true" } else { "false" }
    $createRds = if ($SkipRds.IsPresent) { "false" } else { "true" }
    $createLambda = if ($CreateLambda.IsPresent -and $LambdaRoleArn) { "true" } else { "false" }
    if ($CreateLambda.IsPresent -and -not $LambdaRoleArn) {
        Write-Host "CreateLambda fue solicitado, pero no pasaste -LambdaRoleArn. Se omitira Lambda." -ForegroundColor Yellow
    }

    Write-Step "Validando identidad AWS"
    aws sts get-caller-identity --region $Region --output table

    Write-Step "Desplegando CloudFormation en $Region"
    $parameters = @(
        "ProjectName=$ProjectName",
        "Environment=demo",
        "InstanceType=$InstanceType",
        "ExistingInstanceProfile=$profile",
        "CreateLambda=$createLambda",
        "LambdaRoleArn=$LambdaRoleArn",
        "CreateNatGateway=$createNat",
        "CreateRds=$createRds",
        "DBUsername=$DBUsername",
        "DBPassword=$DBPassword"
    )

    aws cloudformation deploy `
        --template-file $TemplateFile `
        --stack-name $StackName `
        --region $Region `
        --parameter-overrides $parameters `
        --no-fail-on-empty-changeset

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "CloudFormation fallo. Consulta los eventos con:" -ForegroundColor Red
        Write-Host "aws cloudformation describe-stack-events --stack-name $StackName --region $Region --output table" -ForegroundColor Yellow
        exit $LASTEXITCODE
    }

    Show-Outputs

    Write-Host ""
    Write-Host "Despliegue completado correctamente." -ForegroundColor Green
    Write-Host "Cuando ya no necesites el entorno, ejecuta -Action delete para liberar recursos." -ForegroundColor Yellow
}

function Test-Stack {
    Require-AwsCli
    $instanceId = Get-StackOutput "WebInstanceId"
    $webUrl = Get-StackOutput "WebUrl"
    $bucket = Get-StackOutput "StaticAssetsBucketName"
    $table = Get-StackOutput "DynamoTableName"
    $lambda = Get-StackOutput "LambdaFunctionName"

    Write-Step "Probando pagina EC2"
    try {
        $response = Invoke-WebRequest -Uri $webUrl -UseBasicParsing -TimeoutSec 20
        Write-Host "HTTP $($response.StatusCode) - $webUrl" -ForegroundColor Green
    }
    catch {
        Write-Host "No respondio todavia. Espera 2 minutos y repite -Action test." -ForegroundColor Yellow
    }

    Write-Step "Verificando instancia administrada por SSM"
    aws ssm describe-instance-information `
        --region $Region `
        --filters "Key=InstanceIds,Values=$instanceId" `
        --query "InstanceInformationList[].{InstanceId:InstanceId,PingStatus:PingStatus,Platform:PlatformName}" `
        --output table

    Write-Step "Subiendo archivo de verificacion a S3"
    $tempFile = Join-Path $env:TEMP "transport-s3-check.txt"
    "Verificacion S3 generada el $(Get-Date -Format s) para $StackName" | Set-Content -Path $tempFile -Encoding UTF8
    aws s3 cp $tempFile "s3://$bucket/checks/s3-check.txt" --region $Region
    Remove-Item -Path $tempFile -Force

    Write-Step "Insertando item de prueba en DynamoDB"
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $itemFile = Join-Path $env:TEMP "transport-dynamodb-item.json"
    $item = @{
        shipmentId = @{ S = "LAB-001" }
        eventTimestamp = @{ S = $timestamp }
        status = @{ S = "TEST_FROM_SCRIPT" }
    }
    $item | ConvertTo-Json -Depth 4 | Set-Content -Path $itemFile -Encoding ascii
    aws dynamodb put-item `
        --region $Region `
        --table-name $table `
        --item "file://$itemFile" `
        --output table
    Remove-Item -Path $itemFile -Force

    if ($lambda) {
        Write-Step "Invocando Lambda para registrar evento en DynamoDB"
        $lambdaOut = Join-Path $env:TEMP "transport-lambda-output.json"
        aws lambda invoke `
            --region $Region `
            --function-name $lambda `
            --cli-binary-format raw-in-base64-out `
            --payload "{`"shipmentId`":`"LAB-002`",`"status`":`"DELIVERED`"}" `
            $lambdaOut `
            --output table
        Get-Content $lambdaOut
        Remove-Item -Path $lambdaOut -Force
    }
    else {
        Write-Host "Lambda no se desplego porque no se proporciono un rol asumible por Lambda." -ForegroundColor Yellow
    }

    Write-Step "Consultando alarma de CloudWatch"
    aws cloudwatch describe-alarms `
        --region $Region `
        --alarm-name-prefix "$ProjectName-demo-ec2-cpu-high" `
        --query "MetricAlarms[].{Nombre:AlarmName,Estado:StateValue,Umbral:Threshold}" `
        --output table
}

function Start-SsmSession {
    Require-AwsCli
    $instanceId = Get-StackOutput "WebInstanceId"
    Write-Step "Abriendo Session Manager contra $instanceId"
    aws ssm start-session --target $instanceId --region $Region
}

function Delete-Stack {
    Require-AwsCli
    Write-Step "Eliminando stack $StackName en $Region"
    aws cloudformation delete-stack --stack-name $StackName --region $Region
    aws cloudformation wait stack-delete-complete --stack-name $StackName --region $Region
    Write-Host "Stack eliminado. Verifica que no queden recursos asociados en ejecucion." -ForegroundColor Green
}

switch ($Action) {
    "deploy" { Deploy-Stack }
    "outputs" { Show-Outputs }
    "test" { Test-Stack }
    "ssm" { Start-SsmSession }
    "delete" { Delete-Stack }
}
