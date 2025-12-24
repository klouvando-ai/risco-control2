const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getModelistas: () => ipcRenderer.invoke('db-get-modelistas'),
  saveModelista: (modelista) => ipcRenderer.invoke('db-save-modelista', modelista),
  deleteModelista: (id) => ipcRenderer.invoke('db-delete-modelista', id),
  
  getReferencias: () => ipcRenderer.invoke('db-get-referencias'),
  saveReferencia: (ref) => ipcRenderer.invoke('db-save-referencia', ref),
  deleteReferencia: (id) => ipcRenderer.invoke('db-delete-referencia', id)
});