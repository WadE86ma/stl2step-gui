$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host '=== STL2STEP GUI 0.6.2 portable build ===' -ForegroundColor Cyan

$NeedNative = (-not (Test-Path 'bin\stl2step.exe')) -or (-not (Test-Path 'bin\TKernel.dll'))
if ($NeedNative) {
  Write-Host 'Native converter/runtime is missing. Building it first...' -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot 'build-stl2step.ps1')
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'Node.js/npm is required to build the UI.'
}

Write-Host 'Installing locked npm dependencies...' -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }

Write-Host 'Checking JavaScript syntax...' -ForegroundColor Cyan
node --check main.js
if ($LASTEXITCODE -ne 0) { throw 'main.js syntax check failed.' }
node --check preload.js
if ($LASTEXITCODE -ne 0) { throw 'preload.js syntax check failed.' }
node --check renderer.js
if ($LASTEXITCODE -ne 0) { throw 'renderer.js syntax check failed.' }

Write-Host 'Building portable Windows application...' -ForegroundColor Cyan
npm run dist:portable
if ($LASTEXITCODE -ne 0) { throw 'Portable build failed.' }

Write-Host ''
Write-Host 'Portable EXE:' -ForegroundColor Green
Get-ChildItem dist -Filter 'STL2STEP-GUI-0.6.2.exe' | Select-Object FullName,Length
