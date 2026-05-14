$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $projectRoot

Write-Host 'Installing exact dependencies from package-lock.json...'
npm.cmd ci

Write-Host 'Running production verification...'
npm.cmd run build

Write-Host 'Checking production dependency security...'
npm.cmd audit --omit=dev

Write-Host 'Removing development-only packages for Azure package mode...'
npm.cmd prune --omit=dev

Write-Host ''
Write-Host 'Azure-ready verification complete.'
Write-Host 'Startup command: npm start'
Write-Host 'Health check path: /api/ready'
