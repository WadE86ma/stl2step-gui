Generated Windows runtime files are placed in this directory during the build.

The Git repository intentionally does not track stl2step.exe or Open CASCADE /
vcpkg DLLs. Run build-portable.cmd (or scripts\build-portable.ps1) to build the
upstream converter and collect the native runtime before packaging.

The upstream conversion engine is:
https://github.com/BlinkingSun/stl2step
