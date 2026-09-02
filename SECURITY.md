# Security — STL2STEP GUI 0.6.2

## Supported version

The current development/release-candidate line is 0.6.2.

## Application hardening

The application retains the Electron security hardening introduced in 0.5.2 and 0.5.3:

- `contextIsolation: true`
- `nodeIntegration: false`
- renderer sandbox enabled
- strict local-only Content Security Policy
- external navigation, popups and webviews blocked
- renderer permission requests denied
- conversion always invokes the bundled `stl2step` binary rather than an arbitrary executable
- generic file-read and generic shell-path IPC APIs removed
- drag/drop limited to an existing regular `.stl` file with a preview size limit
- STEP output restricted to the safe default or a path explicitly chosen through the native Save dialog
- conversion options allow-listed and numeric values range-checked in the main process
- child processes launched with `shell: false`
- open/show-in-folder actions limited to the authorized output
- Electron cache/session data stored under `%LOCALAPPDATA%\STL2STEP`

## Dependency hygiene

Before publishing a release:

1. build from trusted source repositories;
2. review `npm audit` output and dependency updates;
3. keep Electron patched;
4. retain third-party license notices;
5. code-sign public Windows binaries when practical;
6. test the portable executable on a clean Windows installation or VM.

No static review can prove software to be vulnerability-free. Security reports should include the affected version and clear reproduction steps without publishing sensitive exploit details prematurely.
