# Build STL2STEP GUI 0.6.2 on Windows

This repository builds the Electron GUI and the native `BlinkingSun/stl2step` conversion engine into a portable Windows executable.

## Prerequisites

Install:

- Git for Windows
- Node.js LTS
- Visual Studio with **Desktop development with C++** and CMake tools
- vcpkg

A simple vcpkg setup is:

```cmd
cd /d C:\
git clone https://github.com/microsoft/vcpkg.git
C:\vcpkg\bootstrap-vcpkg.bat
set VCPKG_INSTALLATION_ROOT=C:\vcpkg
```

You may make `VCPKG_INSTALLATION_ROOT` permanent in Windows if desired.

## Build the portable application

From the repository root:

```cmd
build-portable.cmd
```

The command launches the PowerShell build script. If `bin\stl2step.exe` or the OCCT runtime is missing, it will automatically:

1. clone `https://github.com/BlinkingSun/stl2step` into `stl2step-source`;
2. install `opencascade:x64-windows` using vcpkg;
3. configure/build the upstream converter in Release mode;
4. copy `stl2step.exe` and x64 vcpkg runtime DLLs into `bin`;
5. copy available vcpkg copyright notices for key runtime packages into `bin\licenses`;
6. run `npm ci`;
7. syntax-check `main.js`, `preload.js` and `renderer.js`;
8. run Electron Builder.

The finished application is normally:

```text
dist\STL2STEP-GUI-0.6.2.exe
```

## Build only the native converter

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-stl2step.ps1
```

## Development mode

After the native runtime exists in `bin`:

```cmd
npm ci
npm start
```

## GitHub source repository

Generated binaries are deliberately ignored by Git:

```text
bin\*.exe
bin\*.dll
node_modules\
dist\
stl2step-source\
```

This keeps the source repository small. Upload finished portable `.exe` files as GitHub **Release assets** instead of committing them to the repository history.

## Licensing

The GUI source is MIT-licensed. The converter is the separate MIT-licensed `BlinkingSun/stl2step` project. Open CASCADE is LGPL-2.1 with its additional exception. See `THIRD_PARTY_LICENSES.md` and retain generated third-party notices when publishing compiled releases.
