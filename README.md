# STL2STEP GUI

Unofficial Windows desktop GUI for converting STL mesh files to STEP, powered by the open-source [`BlinkingSun/stl2step`](https://github.com/BlinkingSun/stl2step) conversion engine.

> This project is an independent GUI project. It is not the official user interface for `BlinkingSun/stl2step` and is not affiliated with or endorsed by the upstream maintainers.

## Features

- Dark CAD-style Windows interface
- Drag-and-drop STL loading
- Interactive 3D STL preview
- TrueForm and Verbatim conversion modes
- STEP AP203 / AP214 / AP242 selection
- Millimetre and inch input handling
- Scale, weld, sew, unify-angle and thread controls
- Optional shell/solid, verification and DXF settings
- Portable Windows build
- Security-hardened Electron renderer/main-process boundary

## Upstream conversion engine

The actual STL → STEP conversion is performed by **stl2step**, maintained separately at:

**https://github.com/BlinkingSun/stl2step**

`stl2step` is licensed under the MIT License. This GUI launches the native converter as a child process and reads its machine-readable result output.

## Download / release builds

For normal Windows use, download the portable `.exe` from this repository's **Releases** page when a release asset is available. No Node.js installation is needed to run the finished portable application.

The source repository intentionally does **not** commit generated `stl2step.exe` or Open CASCADE DLL files. They are created/collected during the Windows build so that generated third-party binaries do not bloat Git history.

## Build on Windows

Requirements:

- Windows 10/11 x64
- Git for Windows
- Node.js LTS
- Visual Studio with **Desktop development with C++** and CMake tools
- vcpkg

Recommended vcpkg location:

```text
C:\vcpkg
```

Then run:

```cmd
build-portable.cmd
```

The build script will:

1. build the upstream `BlinkingSun/stl2step` converter if it is not already present;
2. install Open CASCADE through vcpkg;
3. collect the required runtime DLLs and available vcpkg copyright notices;
4. install the Electron dependencies;
5. syntax-check the JavaScript files;
6. build the portable Windows executable.

The result is normally:

```text
dist\STL2STEP-GUI-0.6.2.exe
```

See [README-BUILD-WINDOWS.md](README-BUILD-WINDOWS.md) for more detail.

## Security

The Electron application uses `contextIsolation`, disables Node.js integration in the renderer, blocks external navigation/network access, validates IPC input and starts the converter with `shell: false`.

See [SECURITY.md](SECURITY.md).

## Third-party software and licensing

This project uses third-party open-source software, notably:

- [`BlinkingSun/stl2step`](https://github.com/BlinkingSun/stl2step) — MIT
- [Open CASCADE Technology](https://github.com/Open-Cascade-SAS/OCCT) — LGPL-2.1 with the Open CASCADE additional exception
- [Three.js](https://github.com/mrdoob/three.js) — MIT
- [Electron](https://github.com/electron/electron) — MIT and bundled Chromium/third-party notices

See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for distribution notes. Open CASCADE's official repository states that OCCT is licensed under LGPL-2.1 with its additional exception; distributors of binaries should preserve the applicable notices and license material.

## License

The GUI source in this repository is licensed under the MIT License. See [LICENSE](LICENSE).

Copyright © 2026 WadE86ma.
