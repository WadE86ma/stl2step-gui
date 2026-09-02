# Contributing

Thanks for your interest in STL2STEP GUI.

Please keep GUI issues and pull requests focused on this repository. Problems or feature requests concerning the actual STL → STEP conversion engine may belong in the upstream `BlinkingSun/stl2step` project instead:

https://github.com/BlinkingSun/stl2step

For code changes:

1. create a branch;
2. keep Electron security settings intact unless the change has been reviewed carefully;
3. run `node --check main.js`, `node --check preload.js` and `node --check renderer.js`;
4. test STL preview and at least one successful STL → STEP conversion on Windows;
5. do not commit `node_modules`, `dist`, `stl2step-source`, DLLs or EXEs.
