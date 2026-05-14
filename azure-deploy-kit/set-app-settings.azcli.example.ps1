param(
  [Parameter(Mandatory = $true)]
  [string] $ResourceGroup,

  [Parameter(Mandatory = $true)]
  [string] $AppName
)

$ErrorActionPreference = 'Stop'

# Replace placeholder values before running.
az webapp config appsettings set `
  --resource-group $ResourceGroup `
  --name $AppName `
  --settings `
    NODE_ENV=production `
    WEBSITE_NODE_DEFAULT_VERSION=~22 `
    MONGODB_URI='mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/unipaper' `
    JWT_SECRET='replace_with_a_long_random_secret_at_least_32_characters' `
    JWT_EXPIRES_IN=24h `
    CLIENT_URL="https://$AppName.azurewebsites.net" `
    API_PUBLIC_URL="https://$AppName.azurewebsites.net" `
    COOKIE_SAME_SITE=lax `
    COOKIE_SECURE=true `
    STORAGE_PROVIDER=uploadthing `
    UPLOADTHING_TOKEN='replace_with_uploadthing_token' `
    UPLOADTHING_APP_ID='replace_with_uploadthing_app_id' `
    UPLOADTHING_STORAGE_KEY=uploadthing-1 `
    UPLOADTHING_STORAGE_LABEL='UploadThing 1'

az webapp config set `
  --resource-group $ResourceGroup `
  --name $AppName `
  --startup-file 'npm start'

Write-Host "App settings and startup command applied to $AppName."
