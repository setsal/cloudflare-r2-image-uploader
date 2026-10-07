import { contextBridge, ipcRenderer, webUtils } from 'electron'

const api = {
  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config: Record<string, unknown>) => ipcRenderer.invoke('config:set', config),
  setProfile: (name: string, profile: Record<string, unknown>) =>
    ipcRenderer.invoke('config:set-profile', name, profile),
  deleteProfile: (name: string) => ipcRenderer.invoke('config:delete-profile', name),
  getConfigPath: () => ipcRenderer.invoke('config:get-path'),
  getHistoryPath: () => ipcRenderer.invoke('config:get-history-path'),
  exportConfig: () => ipcRenderer.invoke('config:export'),
  importConfig: () => ipcRenderer.invoke('config:import'),

  // Path resolution
  getPathForFile: (file: File) => {
    try {
      const p = webUtils.getPathForFile(file)
      if (p) return p
    } catch {
      // fallback
    }
    return (file as unknown as { path?: string })?.path || ''
  },
  showItemInFolder: (path: string) => ipcRenderer.invoke('shell:show-item-in-folder', path),

  // Upload
  uploadFile: (
    fileData: { buffer: ArrayBuffer; name: string; size: number; originalPath?: string },
    options: { targetPath: string; autoRename: string }
  ) => ipcRenderer.invoke('upload:file', fileData, options),

  // R2 connection test
  testConnection: (profile: Record<string, unknown>) =>
    ipcRenderer.invoke('r2:test-connection', profile),

  // Clipboard
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:copy', text),
  readClipboardImage: () => ipcRenderer.invoke('clipboard:read-image'),

  // File dialog
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),

  // History
  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  // Image processing
  processImage: (
    fileData: { buffer: ArrayBuffer; name: string; size: number },
    config: Record<string, unknown>
  ) => ipcRenderer.invoke('image:process', fileData, config),

  // Theme
  updateTheme: (theme: string) => ipcRenderer.invoke('theme:update', theme),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close')
}

contextBridge.exposeInMainWorld('api', api)
