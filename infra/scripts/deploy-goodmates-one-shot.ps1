param(
    [ValidateSet("all", "infra", "app", "test", "delete")]
    [string]$Action = "all",

    [ValidateSet("us-east-1", "us-west-2")]
    [string]$Region = "us-east-1",

    [string]$StackName = "transport-cloud-lab",
    [string]$ProjectName = "transporte-lab",

    [ValidateSet("t2.nano", "t2.micro", "t2.small", "t2.medium", "t2.large", "t3.nano", "t3.micro", "t3.small", "t3.medium", "t3.large")]
    [string]$InstanceType = "t3.micro",

    [string]$DbName = "goodmates",
    [string]$DbUser = "goodmates_user",
    [string]$DbPassword = "GoodMatesLab2026",
    [string]$DbRootPassword = "",
    [string]$JwtSecret = "",
    [string]$GoogleClientId = "",
    [int]$BackendPort = 5001,

    [switch]$NoUploads,
    [switch]$KeepPackage
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$InfraScript = Join-Path $Root "infra\scripts\deploy-transport-lab.ps1"
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$DockerDir = Join-Path $Root "infra\docker"
$ComposeFile = Join-Path $Root "docker-compose.yml"
$AwsComposeFile = Join-Path $DockerDir "docker-compose.aws.yml"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "No encontre '$Name' en PATH. Instala la herramienta y vuelve a ejecutar."
    }
}

function ConvertTo-ProcessArgument {
    param([string]$Value)

    if ($null -eq $Value) {
        return '""'
    }

    if ($Value -notmatch '[\s"]') {
        return $Value
    }

    return '"' + ($Value -replace '\\', '\\' -replace '"', '\"') + '"'
}

function Invoke-AwsText {
    param(
        [string[]]$Arguments,
        [switch]$AllowFailure
    )

    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = "aws"
    $psi.Arguments = ($Arguments | ForEach-Object { ConvertTo-ProcessArgument $_ }) -join " "
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    if ($process.ExitCode -ne 0) {
        if ($AllowFailure.IsPresent) {
            return ""
        }
        $message = $stderr.Trim()
        if (-not $message) {
            $message = "AWS CLI fallo con codigo $($process.ExitCode)."
        }
        throw $message
    }

    return $stdout.Trim()
}

function Get-StackStatus {
    return Invoke-AwsText -AllowFailure -Arguments @(
        "cloudformation", "describe-stacks",
        "--stack-name", $StackName,
        "--region", $Region,
        "--query", "Stacks[0].StackStatus",
        "--output", "text"
    )
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

function Wait-SsmCommand {
    param(
        [string]$CommandId,
        [string]$InstanceId
    )

    for ($i = 0; $i -lt 90; $i++) {
        $status = aws ssm get-command-invocation `
            --region $Region `
            --command-id $CommandId `
            --instance-id $InstanceId `
            --query Status `
            --output text 2>$null

        Write-Host "SSM status: $status"

        if ($status -in @("Success", "Failed", "Cancelled", "TimedOut", "Cancelling")) {
            break
        }
        Start-Sleep -Seconds 10
    }

    $resultPath = Join-Path $env:TEMP "goodmates-ssm-result.json"
    aws ssm get-command-invocation `
        --region $Region `
        --command-id $CommandId `
        --instance-id $InstanceId `
        --query "{Status:Status,ResponseCode:ResponseCode,Stdout:StandardOutputContent,Stderr:StandardErrorContent}" `
        --output json | Set-Content -Path $resultPath -Encoding utf8

    $result = Get-Content $resultPath -Raw | ConvertFrom-Json
    Remove-Item -Path $resultPath -Force

    if ($result.Status -ne "Success") {
        Write-Host $result.Stdout
        Write-Host $result.Stderr -ForegroundColor Red
        throw "El comando SSM fallo con estado $($result.Status)."
    }

    return $result
}

function New-RandomSecret {
    param([int]$Length = 48)

    $chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789".ToCharArray()
    $random = 1..$Length | ForEach-Object { $chars | Get-Random }
    return -join $random
}

function Copy-IfExists {
    param(
        [string]$Source,
        [string]$Destination
    )

    if (Test-Path $Source) {
        Copy-Item $Source -Destination $Destination -Recurse -Force
    }
}

function Deploy-Infrastructure {
    Require-Command aws

    if (-not (Test-Path $InfraScript)) {
        throw "No existe el script de infraestructura: $InfraScript"
    }

    Write-Step "Validando credenciales AWS"
    try {
        $identity = Invoke-AwsText -Arguments @("sts", "get-caller-identity", "--region", $Region, "--output", "table")
        Write-Host $identity
    }
    catch {
        throw "No hay credenciales validas de AWS. Configura Access Key, Secret Key y Session Token, y ejecuta: aws configure; aws configure set aws_session_token `"TU_TOKEN`". Detalle: $($_.Exception.Message)"
    }

    $status = Get-StackStatus
    if ($status -eq "ROLLBACK_COMPLETE") {
        Write-Step "Eliminando stack fallido en ROLLBACK_COMPLETE"
        aws cloudformation delete-stack --stack-name $StackName --region $Region
        aws cloudformation wait stack-delete-complete --stack-name $StackName --region $Region
    }

    Write-Step "Desplegando infraestructura base compatible con AWS Lab Learner"
    & $InfraScript `
        -Action deploy `
        -Region $Region `
        -StackName $StackName `
        -ProjectName $ProjectName `
        -InstanceType $InstanceType `
        -SkipRds
}

function Build-Package {
    Require-Command tar

    foreach ($path in @($BackendDir, $FrontendDir, $DockerDir, $ComposeFile, $AwsComposeFile)) {
        if (-not (Test-Path $path)) {
            throw "Falta un archivo o directorio requerido para Docker: $path"
        }
    }

    Write-Step "Preparando paquete Docker de GoodMates"
    $stage = Join-Path $env:TEMP "goodmates-docker-package"
    $archive = Join-Path $env:TEMP "goodmates-docker-deploy.tar.gz"

    if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
    if (Test-Path $archive) { Remove-Item -Force $archive }

    New-Item -ItemType Directory -Force -Path `
        "$stage\backend", `
        "$stage\frontend", `
        "$stage\infra", `
        "$stage\infra\docker" | Out-Null

    Copy-Item $ComposeFile -Destination "$stage\docker-compose.yml"
    Copy-IfExists -Source (Join-Path $Root ".dockerignore") -Destination "$stage\.dockerignore"

    Copy-Item "$BackendDir\package.json", "$BackendDir\package-lock.json" -Destination "$stage\backend"
    Copy-Item "$BackendDir\src" -Destination "$stage\backend\src" -Recurse
    if (-not $NoUploads.IsPresent) {
        Copy-IfExists -Source "$BackendDir\uploads" -Destination "$stage\backend\uploads"
    }

    Copy-Item "$FrontendDir\package.json", "$FrontendDir\package-lock.json" -Destination "$stage\frontend"
    Copy-Item "$FrontendDir\public" -Destination "$stage\frontend\public" -Recurse
    Copy-Item "$FrontendDir\src" -Destination "$stage\frontend\src" -Recurse

    Copy-Item "$DockerDir\Dockerfile.backend", "$DockerDir\Dockerfile.frontend", "$DockerDir\nginx.conf", "$AwsComposeFile" -Destination "$stage\infra\docker"

    tar -czf $archive -C $stage .

    if (-not (Test-Path $archive)) {
        throw "No se genero el paquete: $archive"
    }

    return (Get-Item $archive).FullName
}

function Deploy-Application {
    Require-Command aws

    $instanceId = Get-StackOutput "WebInstanceId"
    $bucket = Get-StackOutput "StaticAssetsBucketName"
    $webUrl = Get-StackOutput "WebUrl"

    if (-not $instanceId -or -not $bucket -or -not $webUrl) {
        throw "No encontre outputs del stack. Ejecuta primero -Action infra o -Action all."
    }

    $archive = Build-Package
    $s3Key = "deploy/goodmates-docker-deploy.tar.gz"
    $effectiveDbRootPassword = if ($DbRootPassword) { $DbRootPassword } else { $DbPassword }
    $effectiveJwtSecret = if ($JwtSecret) { $JwtSecret } else { New-RandomSecret }

    Write-Step "Subiendo paquete a S3"
    aws s3 cp $archive "s3://$bucket/$s3Key" --region $Region

    Write-Step "Generando URL temporal de descarga"
    $presignedUrl = aws s3 presign "s3://$bucket/$s3Key" --region $Region --expires-in 3600

    $commands = @(
        "set -euxo pipefail",
        "sudo systemctl disable --now httpd || true",
        "if ! command -v docker >/dev/null 2>&1; then sudo dnf install -y docker; fi",
        "sudo systemctl enable --now docker",
        "if ! docker compose version >/dev/null 2>&1; then sudo dnf install -y docker-compose-plugin || true; fi",
        "if ! docker compose version >/dev/null 2>&1; then sudo mkdir -p /usr/local/lib/docker/cli-plugins && sudo curl -fsSL https://github.com/docker/compose/releases/download/v2.27.2/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose && sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose; fi",
        "docker compose version",
        "sudo rm -rf /opt/goodmates /tmp/goodmates-deploy /tmp/goodmates-deploy.tar.gz",
        "curl -fL '$presignedUrl' -o /tmp/goodmates-deploy.tar.gz",
        "sudo mkdir -p /opt/goodmates /tmp/goodmates-deploy",
        "sudo tar -xzf /tmp/goodmates-deploy.tar.gz -C /tmp/goodmates-deploy",
        "sudo cp -R /tmp/goodmates-deploy/. /opt/goodmates/",
        "sudo bash -c `"cat > /opt/goodmates/.env.aws`" <<'EOF'",
        "DB_HOST=db",
        "BACKEND_PORT=$BackendPort",
        "DB_PORT=3306",
        "DB_NAME=$DbName",
        "DB_USER=$DbUser",
        "DB_PASSWORD=$DbPassword",
        "DB_ROOT_PASSWORD=$effectiveDbRootPassword",
        "JWT_SECRET=$effectiveJwtSecret",
        "GOOGLE_CLIENT_ID=$GoogleClientId",
        "FRONTEND_URL=$webUrl",
        "EOF",
        "cd /opt/goodmates",
        "COMPOSE_ARGS='-f infra/docker/docker-compose.aws.yml --env-file .env.aws'",
        "trap 'cd /opt/goodmates && sudo docker compose `$COMPOSE_ARGS ps && sudo docker compose `$COMPOSE_ARGS logs --no-color --tail=200 || true' ERR",
        "sudo docker compose `$COMPOSE_ARGS build --pull",
        "sudo docker compose `$COMPOSE_ARGS up -d --remove-orphans",
        "sudo docker compose `$COMPOSE_ARGS ps",
        "for i in `$(seq 1 30); do if curl -fsS http://localhost/api/health >/dev/null; then break; fi; sleep 10; done",
        "curl -fsS http://localhost/api/health",
        "curl -I http://localhost/"
    )

    $paramsPath = Join-Path $env:TEMP "goodmates-ssm-params.json"
    @{ commands = $commands } | ConvertTo-Json -Depth 6 | Set-Content -Path $paramsPath -Encoding ascii

    Write-Step "Levantando GoodMates con Docker Compose en EC2 por SSM"
    $commandId = aws ssm send-command `
        --region $Region `
        --instance-ids $instanceId `
        --document-name AWS-RunShellScript `
        --parameters "file://$paramsPath" `
        --comment "GoodMates docker deploy" `
        --query "Command.CommandId" `
        --output text

    $result = Wait-SsmCommand -CommandId $commandId -InstanceId $instanceId
    Write-Host $result.Stdout

    if (-not $KeepPackage.IsPresent) {
        Remove-Item -Path $archive -Force -ErrorAction SilentlyContinue
    }

    Write-Step "Validando URL publica"
    Invoke-WebRequest -Uri $webUrl -UseBasicParsing -TimeoutSec 30 | Select-Object StatusCode
    Invoke-WebRequest -Uri "$webUrl/api/health" -UseBasicParsing -TimeoutSec 30 | Select-Object -ExpandProperty Content

    Write-Host ""
    Write-Host "GoodMates desplegado con Docker:" -ForegroundColor Green
    Write-Host "Frontend: $webUrl"
    Write-Host "Backend:  $webUrl/api/health"
}

function Test-GoodMates {
    $webUrl = Get-StackOutput "WebUrl"
    if (-not $webUrl) {
        throw "No encontre WebUrl. Revisa que el stack exista."
    }

    Write-Step "Probando frontend"
    Invoke-WebRequest -Uri $webUrl -UseBasicParsing -TimeoutSec 30 | Select-Object StatusCode

    Write-Step "Probando backend via proxy Docker/Nginx"
    Invoke-WebRequest -Uri "$webUrl/api/health" -UseBasicParsing -TimeoutSec 30 | Select-Object -ExpandProperty Content

    Write-Step "Probando JS principal"
    $html = Invoke-WebRequest -Uri $webUrl -UseBasicParsing -TimeoutSec 30
    $match = [regex]::Match($html.Content, 'src="([^"]*static/js/main[^"]+\.js)"')
    if ($match.Success) {
        $jsUrl = "$webUrl$($match.Groups[1].Value)"
        Invoke-WebRequest -Uri $jsUrl -UseBasicParsing -TimeoutSec 30 | Select-Object StatusCode, @{Name = "Length"; Expression = { $_.Content.Length } }
    }
    else {
        Write-Host "No encontre el bundle main de React en index.html." -ForegroundColor Yellow
    }
}

function Delete-All {
    if (-not (Test-Path $InfraScript)) {
        throw "No existe el script de infraestructura: $InfraScript"
    }
    & $InfraScript -Action delete -Region $Region -StackName $StackName -ProjectName $ProjectName
}

switch ($Action) {
    "all" {
        Deploy-Infrastructure
        Deploy-Application
    }
    "infra" { Deploy-Infrastructure }
    "app" { Deploy-Application }
    "test" { Test-GoodMates }
    "delete" { Delete-All }
}
