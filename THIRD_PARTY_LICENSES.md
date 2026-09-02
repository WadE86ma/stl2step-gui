# Third-party software notices

STL2STEP GUI is an independent graphical front end. The following major third-party projects are used by or distributed with builds of the application.

## BlinkingSun/stl2step

Project: https://github.com/BlinkingSun/stl2step

License: MIT

The upstream project is separate from this GUI. Its upstream `LICENSE` identifies the project as MIT-licensed and notes that Open CASCADE Technology is a separate dependency.

When a Windows release is built, `stl2step.exe` is compiled from the upstream project by `scripts/build-stl2step.ps1` unless a compatible locally built binary already exists.

## Open CASCADE Technology (OCCT)

Project: https://github.com/Open-Cascade-SAS/OCCT

License: GNU Lesser General Public License version 2.1 with the Open CASCADE additional exception.

Official license files:

- `LICENSE_LGPL_21.txt` in the OCCT source distribution
- `OCCT_LGPL_EXCEPTION.txt` in the OCCT source distribution

Official licensing page: https://dev.opencascade.org/resources/licensing

The build script installs OCCT through vcpkg and copies the available vcpkg copyright notices into the packaged runtime. Release distributors should keep the OCCT DLLs dynamically linked and preserve the applicable license and notice material distributed with those libraries.

## Three.js

Project: https://github.com/mrdoob/three.js

Version used by this project: 0.149.0

License: MIT

Three.js provides the local WebGL STL preview.

## Electron

Project: https://github.com/electron/electron

License: MIT, with Chromium and additional third-party license notices included by Electron distributions.

Electron provides the desktop application runtime. Electron Builder normally preserves Electron/Chromium license material in packaged applications.

## electron-builder

Project: https://github.com/electron-userland/electron-builder

Used only as a build/development dependency for producing the Windows portable executable.

## vcpkg runtime dependencies

Open CASCADE installed through vcpkg may bring runtime libraries such as Brotli, bzip2, FreeType, libpng and zlib. `scripts/build-stl2step.ps1` copies relevant vcpkg `copyright` files, when available, into `bin\licenses` before packaging.

This file is an attribution summary, not legal advice. When redistributing a compiled release, retain all license/copyright files generated into the packaged `licenses` / `bin\licenses` directories.
