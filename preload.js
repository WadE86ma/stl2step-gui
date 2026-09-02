const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Deliberately expose only task-specific operations. No generic fs, shell,
// process or command-execution primitive is available to renderer code.
contextBridge.exposeInMainWorld('api', Object.freeze({
  pickFile: () => ipcRenderer.invoke('pick-file'),
  authorizeDroppedStl: file => {
    let p = '';
    try { p = webUtils.getPathForFile(file); } catch {}
    return p ? ipcRenderer.invoke('authorize-dropped-stl', p) : Promise.resolve(null);
  },
  readActiveStl: () => ipcRenderer.invoke('read-active-stl'),
  pickOutput: suggested => ipcRenderer.invoke('pick-output', suggested),
  convert: options => ipcRenderer.invoke('run-conversion', options),
  clearSession: () => ipcRenderer.invoke('clear-session'),
  openOutput: () => ipcRenderer.invoke('open-output'),
  showOutputInFolder: () => ipcRenderer.invoke('show-output-in-folder')
}));
