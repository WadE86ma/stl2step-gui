$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root 'stl2step-source'
$Bin = Join-Path $Root 'bin'
$LicenseDir = Join-Path $Bin 'licenses'

Write-Host '=== STL2STEP engine build ===' -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git is required. Install Git for Windows first.'
}
if (-not (Get-Command cmake -ErrorAction SilentlyContinue)) {
  throw 'CMake is required. Install Visual Studio with Desktop development with C++ and CMake tools.'
}

if (-not (Test-Path $Source)) {
  git clone https://github.com/BlinkingSun/stl2step.git $Source
  if ($LASTEXITCODE -ne 0) { throw 'Could not clone BlinkingSun/stl2step.' }
} else {
  Write-Host 'Using existing stl2step-source directory.' -ForegroundColor DarkGray
}

$vcpkg = $env:VCPKG_INSTALLATION_ROOT
if (-not $vcpkg) {
  foreach ($candidate in @('C:\vcpkg', (Join-Path ${env:ProgramFiles} 'vcpkg'))) {
    if ($candidate -and (Test-Path (Join-Path $candidate 'scripts\buildsystems\vcpkg.cmake'))) {
      $vcpkg = $candidate
      break
    }
  }
}
if (-not $vcpkg) {
  throw 'vcpkg not found. Install it (recommended C:\vcpkg) or set VCPKG_INSTALLATION_ROOT.'
}

$vcpkgExe = Join-Path $vcpkg 'vcpkg.exe'
if (-not (Test-Path $vcpkgExe)) { throw "Could not find $vcpkgExe" }

& $vcpkgExe install opencascade:x64-windows
if ($LASTEXITCODE -ne 0) { throw 'vcpkg failed to install Open CASCADE.' }

$Build = Join-Path $Source 'build'
$Toolchain = Join-Path $vcpkg 'scripts\buildsystems\vcpkg.cmake'

# Let CMake select the newest installed Visual Studio generator. This works
# with current VS installations without hard-coding a particular VS release.
cmake -S $Source -B $Build -A x64 `
  "-DCMAKE_TOOLCHAIN_FILE=$Toolchain" `
  -DSTL2STEP_BUILD_CLI=ON `
  -DSTL2STEP_BUILD_TESTS=OFF `
  -DSTL2STEP_BUILD_EXAMPLES=OFF
if ($LASTEXITCODE -ne 0) { throw 'CMake configure failed.' }

cmake --build $Build --config Release --target stl2step --parallel
if ($LASTEXITCODE -ne 0) { throw 'stl2step build failed.' }

$Exe = Join-Path $Build 'Release\stl2step.exe'
if (-not (Test-Path $Exe)) {
  $Exe = Get-ChildItem $Build -Recurse -Filter 'stl2step.exe' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $Exe -or -not (Test-Path $Exe)) { throw 'Could not find the built stl2step.exe.' }

New-Item -ItemType Directory -Force $Bin | Out-Null
Copy-Item $Exe (Join-Path $Bin 'stl2step.exe') -Force

# Copy the x64 release runtime from vcpkg. OCCT pulls its required runtime
# dependencies into this directory, so collecting DLLs here keeps the portable
# package self-contained without committing generated binaries to Git.
$Runtime = Join-Path $vcpkg 'installed\x64-windows\bin'
if (-not (Test-Path $Runtime)) { throw "vcpkg runtime directory not found: $Runtime" }
Get-ChildItem $Runtime -Filter '*.dll' | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $Bin $_.Name) -Force
}

# Preserve package copyright/license notices for the principal native runtime
# packages. Additional Electron/Chromium notices are handled by Electron itself.
New-Item -ItemType Directory -Force $LicenseDir | Out-Null
$Share = Join-Path $vcpkg 'installed\x64-windows\share'
$Packages = @('opencascade','brotli','bzip2','freetype','libpng','zlib')
foreach ($pkg in $Packages) {
  $copyright = Join-Path $Share "$pkg\copyright"
  if (Test-Path $copyright) {
    Copy-Item $copyright (Join-Path $LicenseDir "$pkg-copyright.txt") -Force
  }
}

Write-Host "Built: $(Join-Path $Bin 'stl2step.exe')" -ForegroundColor Green
Write-Host "Runtime DLLs: $((Get-ChildItem $Bin -Filter '*.dll').Count)" -ForegroundColor Green
