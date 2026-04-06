const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('hermesDesktop', {
  isDesktop: true,
  getVersion:       () => ipcRenderer.invoke('app:getVersion'),
  checkForUpdates:  () => ipcRenderer.invoke('app:checkForUpdates'),
  openExternal:     (url) => ipcRenderer.invoke('app:openExternal', url),
  openFolder:       () => ipcRenderer.invoke('dialog:openFolder'),
  openFile:         (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  notify:           (opts) => ipcRenderer.invoke('app:notify', opts),
  readConfig:       () => ipcRenderer.invoke('config:read'),
  writeConfig:      (data) => ipcRenderer.invoke('config:write', data),
  checkBackendHealth: (url) => ipcRenderer.invoke('backend:health', url),
  onCommand:        (cb) => ipcRenderer.on('command', (_, cmd) => cb(cmd)),
  updateBackend:    () => ipcRenderer.invoke('backend:update'),
  onUpdateProgress: (cb) => ipcRenderer.on('backend:update-progress', (_, msg) => cb(msg)),
})
