@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   STL2STEP GUI 0.6.2 Portable Build
echo ========================================
echo.

where powershell >nul 2>nul || (
  echo ERROR: PowerShell saknas.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-portable.ps1"
if errorlevel 1 goto :fail

echo.
echo KLART.
echo Filen finns normalt i:
echo   dist\STL2STEP-GUI-0.6.2.exe
echo.
pause
exit /b 0

:fail
echo.
echo BYGGET MISSLYCKADES. Se felmeddelandet ovan.
pause
exit /b 1
