param (
    [string]$ResourceGroupName = "rg-znbp-pl-dev",
    [string]$Location = "polandcentral"
)

Write-Host "Creating resource group: $ResourceGroupName in region $Location..."
az group create --name $ResourceGroupName --location $Location

Write-Host "Parsing docker-compose.yml to extract secrets..."
$composePath = "../docker-compose.yml"
$djangoSecretKey = "django-insecure-default"
$dbPassword = (-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | % {[char]$_})) # Generate alphanumeric password

if (Test-Path $composePath) {
    $composeContent = Get-Content $composePath -Raw
    if ($composeContent -match 'DJANGO_SECRET_KEY:\s*([^\r\n]+)') {
        $djangoSecretKey = $matches[1].Trim().Trim('"').Trim("'")
        Write-Host "Successfully extracted DJANGO_SECRET_KEY from docker-compose.yml"
    } else {
        Write-Host "Warning: DJANGO_SECRET_KEY not found in docker-compose.yml, using default."
    }
} else {
    Write-Host "Warning: docker-compose.yml not found at $composePath"
}

Write-Host "Preparing Bicep deployment parameters..."
$bicepParams = @{
    "`$schema"     = "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#"
    contentVersion = "1.0.0.0"
    parameters     = @{
        location        = @{ value = $Location }
        dbAdminUser     = @{ value = "postgres" }
        dbAdminPassword = @{ value = $dbPassword }
        djangoSecretKey = @{ value = $djangoSecretKey }
    }
}
$bicepParams | ConvertTo-Json -Depth 5 -Compress | Out-File -FilePath ./temp-params.json -Encoding UTF8

Write-Host "Executing Bicep deployment (core infrastructure)..."
$jsonStr = az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file ./main.bicep `
    --parameters "@./temp-params.json" 

if ($LASTEXITCODE -ne 0) {
    Remove-Item -Path ./temp-params.json -ErrorAction SilentlyContinue
    throw "Error: Bicep infrastructure deployment failed. Script aborted!"
}

# Clean up temporary parameters file containing secrets
Remove-Item -Path ./temp-params.json -ErrorAction SilentlyContinue
Write-Host "Temporary deployment params deleted."

$deploymentOutput = ($jsonStr -join "`n") | ConvertFrom-Json
$backendAppName = $deploymentOutput.properties.outputs.backendAppName.value
$backendUrl = $deploymentOutput.properties.outputs.backendUrl.value
$storageName = $deploymentOutput.properties.outputs.frontendStorageAccountName.value
$frontendUrl = $deploymentOutput.properties.outputs.frontendUrl.value

Write-Host "Deploying Backend code via Zip Deploy..."
Push-Location ../backend
python zip_backend.py
az webapp deployment source config-zip --resource-group $ResourceGroupName --name $backendAppName --src backend.zip
if ($LASTEXITCODE -ne 0) {
    Remove-Item backend.zip -ErrorAction SilentlyContinue
    Pop-Location
    throw "Error: Backend code deployment failed!"
}
Remove-Item backend.zip -ErrorAction SilentlyContinue
Pop-Location

$env:VITE_API_URL = "https://$backendUrl"
Write-Host "Building frontend using npm (VITE_API_URL = $env:VITE_API_URL)..."
Push-Location ../frontend
npm install
npm run build
Pop-Location

Write-Host "Configuring static website container on Azure Storage Account..."
az storage blob service-properties update --account-name $storageName --static-website --404-document index.html --index-document index.html

Write-Host "Uploading frontend build files to Azure Blob Storage..."
az storage blob upload-batch --account-name $storageName -s ../frontend/dist -d "`$web" --overwrite

Write-Host "`n==============================================="
Write-Host "Deployment completed successfully!"
Write-Host "Your Frontend is live at: $frontendUrl"
Write-Host "Your Backend API is live at: https://$backendUrl"
Write-Host "==============================================="
