import { ipcMain, clipboard, dialog, BrowserWindow, shell } from 'electron'
import { existsSync } from 'fs'
import { uploadFile, testConnection } from './r2-client'
import { processImage } from './image-processor'
import {
  getConfig,
  setConfig,
  getActiveProfile,
  setProfile,
  deleteProfile,
  getHistory,
  addHistoryItem,
  clearHistory,
  getConfigPath,
  getHistoryPath,
  exportConfigToFile,
  importConfigFromFile
} from './config-store'
import { UploadHistoryItem, ImageProcessingConfig } from '../common/types'

export function registerIpcHandlers() {
  // ---- Config ----
  ipcMain.handle('config:get', () => {
    return getConfig()
  })

  ipcMain.handle('config:set', (_event, config) => {
    return setConfig(config)
  })

  ipcMain.handle('config:set-profile', (_event, name: string, profile) => {
    return setProfile(name, profile)
  })

  ipcMain.handle('config:delete-profile', (_event, name: string) => {
    return deleteProfile(name)
  })

  // ---- Config path & export/import ----
  ipcMain.handle('config:get-path', () => {
    return getConfigPath()
  })

  ipcMain.handle('config:get-history-path', () => {
    return getHistoryPath()
  })

  ipcMain.handle('config:export', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { success: false, error: 'No window' }

    const result = await dialog.showSaveDialog(window, {
      title: 'Export Settings',
      defaultPath: 'r2-uploader-config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (result.canceled || !result.filePath) return { success: false }

    try {
      exportConfigToFile(result.filePath)
      return { success: true, path: result.filePath }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Export failed' }
    }
  })

  ipcMain.handle('config:import', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { success: false, error: 'No window' }

    const result = await dialog.showOpenDialog(window, {
      title: 'Import Settings',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) return { success: false }

    try {
      const config = importConfigFromFile(result.filePaths[0])
      return { success: true, config }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Import failed' }
    }
  })

  // ---- Upload ----
  ipcMain.handle(
    'upload:file',
    async (
      _event,
      fileData: { buffer: ArrayBuffer; name: string; size: number; originalPath?: string },
      options: { targetPath: string; autoRename: 'off' | 'timestamp' | 'random' }
    ) => {
      const profile = getActiveProfile()
      if (!profile) {
        return {
          success: false,
          error: 'No active R2 profile configured. Please configure your R2 settings first.',
          timestamp: Date.now()
        }
      }

      const buffer = Buffer.from(fileData.buffer)
      const result = await uploadFile(
        profile,
        buffer,
        fileData.name,
        options.targetPath,
        options.autoRename
      )

      // If successful, conditionally copy to clipboard and add to history
      if (result.success && result.url) {
        const config = getConfig()

        // Only copy to clipboard if enabled
        if (config.copyToClipboard) {
          let clipboardText = result.url

          switch (config.clipboardFormat) {
            case 'markdown':
              clipboardText = `![${result.fileName || 'image'}](${result.url})`
              break
            case 'html':
              clipboardText = `<img src="${result.url}" alt="${result.fileName || 'image'}" />`
              break
            case 'raw':
            default:
              clipboardText = result.url
          }

          clipboard.writeText(clipboardText)
        }

        // Add to history (including original local path if available, or undefined if from clipboard)
        const historyItem: UploadHistoryItem = {
          url: result.url,
          key: result.key || '',
          fileName: result.fileName || '',
          originalName: fileData.name,
          originalPath: fileData.originalPath || undefined,
          fileSize: fileData.size,
          timestamp: result.timestamp,
          profile: config.activeProfile
        }
        addHistoryItem(historyItem)
      }

      return {
        ...result,
        originalName: fileData.name,
        originalPath: fileData.originalPath
      }
    }
  )

  // ---- Shell ----
  ipcMain.handle('shell:show-item-in-folder', (_event, fullPath: string) => {
    if (!fullPath) return { success: false, error: 'No path specified' }
    try {
      if (!existsSync(fullPath)) {
        return { success: false, error: 'Original file no longer exists at this location' }
      }
      shell.showItemInFolder(fullPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to locate file' }
    }
  })

  // ---- Connection test ----
  ipcMain.handle('r2:test-connection', async (_event, profile) => {
    return testConnection(profile)
  })

  // ---- Clipboard ----
  ipcMain.handle('clipboard:copy', (_event, text: string) => {
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle('clipboard:read-image', () => {
    const image = clipboard.readImage()
    if (image.isEmpty()) return null

    const pngBuffer = image.toPNG()
    const size = image.getSize()
    return {
      buffer: pngBuffer.buffer.slice(
        pngBuffer.byteOffset,
        pngBuffer.byteOffset + pngBuffer.byteLength
      ),
      width: size.width,
      height: size.height,
      size: pngBuffer.length
    }
  })

  // ---- File dialog ----
  ipcMain.handle('dialog:open-file', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return null

    const result = await dialog.showOpenDialog(window, {
      title: 'Select Image(s)',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'tiff', 'tif', 'ico', 'heic', 'heif']
        }
      ]
    })

    if (result.canceled) return null
    return result.filePaths
  })

  // ---- History ----
  ipcMain.handle('history:get', () => {
    return getHistory()
  })

  ipcMain.handle('history:clear', () => {
    return clearHistory()
  })

  // ---- Image processing ----
  ipcMain.handle(
    'image:process',
    async (
      _event,
      fileData: { buffer: ArrayBuffer; name: string; size: number },
      config: ImageProcessingConfig
    ) => {
      try {
        const buffer = Buffer.from(fileData.buffer)
        const result = await processImage(buffer, fileData.name, config)
        return { success: true, result }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Processing failed'
        return { success: false, error: message }
      }
    }
  )
}
