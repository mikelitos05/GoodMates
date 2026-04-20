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
    [int]$BackendPort = 5001,

    [switch]$NoUploads,
    [switch]$KeepPackage
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$InfraScript = Join-Path $Root "infra\scripts\deploy-transport-lab.ps1"
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"

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

function Invoke-LoggedNative {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory = ""
    )

    $hasNativePreference = Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue
    $oldNativePreference = $null
    if ($hasNativePreference) {
        $oldNativePreference = $PSNativeCommandUseErrorActionPreference
        $script:PSNativeCommandUseErrorActionPreference = $false
    }

    $oldLocation = Get-Location
    try {
        if ($WorkingDirectory) {
            Set-Location $WorkingDirectory
        }

        & $FilePath @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -ne 0) {
            throw "El comando '$FilePath $($Arguments -join ' ')' fallo con codigo $LASTEXITCODE."
        }
    }
    finally {
        Set-Location $oldLocation
        if ($hasNativePreference) {
            $script:PSNativeCommandUseErrorActionPreference = $oldNativePreference
        }
    }
}

function Get-StackStatus {
    $status = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query "Stacks[0].StackStatus" `
        --output text 2>$null
    if ($LASTEXITCODE -ne 0) {
        return ""
    }
    return $status
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

function Deploy-Infrastructure {
    Require-Command aws

    if (-not (Test-Path $InfraScript)) {
        throw "No existe el script de infraestructura: $InfraScript"
    }

    $status = Get-StackStatus
    if ($status -eq "ROLLBACK_COMPLETE") {
        Write-Step "Eliminando stack fallido en ROLLBACK_COMPLETE"
        aws cloudformation delete-stack --stack-name $StackName --region $Region
        aws cloudformation wait stack-delete-complete --stack-name $StackName --region $Region
    }

    Write-Step "Desplegando infraestructura Learner Lab sin RDS"
    & $InfraScript `
        -Action deploy `
        -Region $Region `
        -StackName $StackName `
        -ProjectName $ProjectName `
        -InstanceType $InstanceType `
        -SkipRds
}

function Build-Package {
    Require-Command npm
    Require-Command tar

    if (-not (Test-Path $BackendDir)) {
        throw "No existe backend: $BackendDir"
    }
    if (-not (Test-Path $FrontendDir)) {
        throw "No existe frontend: $FrontendDir"
    }

    Write-Step "Compilando frontend React"
    $oldNodeOptions = $env:NODE_OPTIONS
    try {
        $env:NODE_OPTIONS = "--no-deprecation"
        Invoke-LoggedNative -FilePath "cmd.exe" -Arguments @("/c", "npm run build 2>&1") -WorkingDirectory $FrontendDir
    }
    finally {
        $env:NODE_OPTIONS = $oldNodeOptions
    }

    Write-Step "Empaquetando frontend y backend"
    $stage = Join-Path $env:TEMP "goodmates-one-shot-package"
    $archive = Join-Path $env:TEMP "goodmates-deploy.tar.gz"

    if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
    if (Test-Path $archive) { Remove-Item -Force $archive }

    New-Item -ItemType Directory -Force -Path "$stage\backend", "$stage\frontend" | Out-Null

    Copy-Item "$BackendDir\package.json", "$BackendDir\package-lock.json" -Destination "$stage\backend"
    Copy-Item "$BackendDir\src" -Destination "$stage\backend\src" -Recurse

    $uploads = Join-Path $BackendDir "uploads"
    if ((-not $NoUploads.IsPresent) -and (Test-Path $uploads)) {
        Copy-Item $uploads -Destination "$stage\backend\uploads" -Recurse
    }

    Copy-Item "$FrontendDir\build" -Destination "$stage\frontend\build" -Recurse

    Invoke-LoggedNative -FilePath "tar" -Arguments @("-czf", $archive, "-C", $stage, ".")

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
    $s3Key = "deploy/goodmates-deploy.tar.gz"

    Write-Step "Subiendo paquete a S3"
    aws s3 cp $archive "s3://$bucket/$s3Key" --region $Region

    Write-Step "Generando URL temporal de descarga"
    $presignedUrl = aws s3 presign "s3://$bucket/$s3Key" --region $Region --expires-in 3600

    $commands = @(
        "set -euxo pipefail",
        "sudo dnf install -y tar unzip jq httpd mariadb105-server",
        "if ! command -v node >/dev/null 2>&1; then curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - && sudo dnf install -y nodejs; fi",
        "if ! command -v pm2 >/dev/null 2>&1; then sudo npm install -g pm2; fi",
        "sudo systemctl enable --now httpd",
        "sudo systemctl enable --now mariadb",
        "sudo mysql -e `"CREATE DATABASE IF NOT EXISTS $DbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`"",
        "sudo mysql -e `"CREATE USER IF NOT EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$DbPassword';`"",
        "sudo mysql -e `"GRANT ALL PRIVILEGES ON $DbName.* TO '$DbUser'@'localhost'; FLUSH PRIVILEGES;`"",
        "sudo rm -rf /opt/goodmates /tmp/goodmates-deploy /tmp/goodmates-deploy.tar.gz",
        "curl -fL '$presignedUrl' -o /tmp/goodmates-deploy.tar.gz",
        "sudo mkdir -p /opt/goodmates /tmp/goodmates-deploy",
        "sudo tar -xzf /tmp/goodmates-deploy.tar.gz -C /tmp/goodmates-deploy",
        "sudo cp -R /tmp/goodmates-deploy/backend /opt/goodmates/backend",
        "sudo rm -rf /var/www/html/*",
        "sudo cp -R /tmp/goodmates-deploy/frontend/build/* /var/www/html/",
        "sudo bash -c `"cat > /opt/goodmates/backend/.env`" <<'EOF'",
        "PORT=$BackendPort",
        "NODE_ENV=production",
        "DB_HOST=localhost",
        "DB_PORT=3306",
        "DB_USER=$DbUser",
        "DB_PASSWORD=$DbPassword",
        "DB_NAME=$DbName",
        "JWT_SECRET=goodmates_lab_jwt_secret_2026_change_me",
        "FRONTEND_URL=$webUrl",
        "EOF",
        "cd /opt/goodmates/backend && sudo npm ci --omit=dev",
        "sudo chown -R ec2-user:ec2-user /opt/goodmates",
        "pm2 delete goodmates-backend || true",
        "cd /opt/goodmates/backend && pm2 start src/server.js --name goodmates-backend",
        "pm2 save",
        "sudo find /var/www/html -type d -exec chmod 755 {} \;",
        "sudo find /var/www/html -type f -exec chmod 644 {} \;",
        "sudo restorecon -R /var/www/html || true",
        "sleep 5",
        "curl -fsS http://localhost:$BackendPort/api/health",
        "curl -I http://localhost/"
    )

    $paramsPath = Join-Path $env:TEMP "goodmates-ssm-params.json"
    @{ commands = $commands } | ConvertTo-Json -Depth 6 | Set-Content -Path $paramsPath -Encoding ascii

    Write-Step "Instalando GoodMates en EC2 por SSM"
    $commandId = aws ssm send-command `
        --region $Region `
        --instance-ids $instanceId `
        --document-name AWS-RunShellScript `
        --parameters "file://$paramsPath" `
        --comment "GoodMates one-shot deploy" `
        --query "Command.CommandId" `
        --output text

    $result = Wait-SsmCommand -CommandId $commandId -InstanceId $instanceId
    Write-Host $result.Stdout

    if (-not $KeepPackage.IsPresent) {
        Remove-Item -Path $archive -Force -ErrorAction SilentlyContinue
    }

    Write-Step "Validando URL publica"
    Invoke-WebRequest -Uri $webUrl -UseBasicParsing -TimeoutSec 30 | Select-Object StatusCode
    Invoke-WebRequest -Uri "$webUrl`:$BackendPort/api/health" -UseBasicParsing -TimeoutSec 30 | Select-Object -ExpandProperty Content

    Write-Host ""
    Write-Host "GoodMates desplegado:" -ForegroundColor Green
    Write-Host "Frontend: $webUrl"
    Write-Host "Backend:  $webUrl`:$BackendPort/api/health"
}

function Test-GoodMates {
    $webUrl = Get-StackOutput "WebUrl"
    if (-not $webUrl) {
        throw "No encontre WebUrl. Revisa que el stack exista."
    }

    Write-Step "Probando frontend"
    Invoke-WebRequest -Uri $webUrl -UseBasicParsing -TimeoutSec 30 | Select-Object StatusCode

    Write-Step "Probando backend"
    Invoke-WebRequest -Uri "$webUrl`:$BackendPort/api/health" -UseBasicParsing -TimeoutSec 30 | Select-Object -ExpandProperty Content

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
