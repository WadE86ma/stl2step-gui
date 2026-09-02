# Changelog

## 0.6.2

Branding and release artifact naming update.

- Renamed the Windows application product name to `STL2STEP GUI`.
- Portable release files are now generated as `STL2STEP-GUI-${version}.exe`.
- Updated window title, header branding, footer version text and About dialog to use `STL2STEP GUI`.
- Updated Windows build instructions and scripts for the new artifact name.
- Retains all functionality and security hardening from 0.6.1.

## 0.6.1

GitHub-ready release preparation.

- Added public-facing `README.md` with clear attribution to `BlinkingSun/stl2step`.
- Added MIT `LICENSE` for the GUI project.
- Added `THIRD_PARTY_LICENSES.md` and distribution notes for OCCT and other dependencies.
- Removed generated converter/DLL binaries from the source repository package; they are now build artifacts.
- Improved `.gitignore` and added `.gitattributes` for cleaner Windows Git handling.
- Updated Windows build scripts to build/collect the native converter runtime when needed.
- Added GitHub Actions source validation workflow.
- Updated UI/version metadata to 0.6.1 and added third-party attribution to the About dialog.
- Retains all 0.6.0 functionality and the security hardening introduced in 0.5.2/0.5.3.

## 0.6.0

- Prepared portable Windows release build flow.
- Retained the CAD-style 3D preview, view cube and corrected vertical orbit direction.
- Retained explicit writable Electron cache/session locations.
