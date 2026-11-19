import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  AppConfig,
  ImageProcessingConfig,
  ImageProcessingResult,
  R2Config,
  UploadHistoryItem,
  UploadResult
} from '@common/types'

/**
 * Tracks original local filesystem paths for File instances created via
 * Tauri drag-drop or native file picker dialogs.
 */
const filePathMap = new WeakMap<File, string>()

export function registerFilePath(file: File, fullPath: string): void {
  if (fullPath) {
    filePathMap.set(file, fullPath)
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize)
    chunks.push(String.fromCharCode.apply(null, slice as unknown as number[]))
  }
  return btoa(chunks.join(''))
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

interface RawImageProcessingResult {
  originalSize: number
  processedSize: number
  processedBufferBase64: string
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  savings: number
  format: string
  fileName: string
  originalPath?: string
}

interface RawClipboardImage {
  bufferBase64: string
  width: number
  height: number
  size: number
}

interface RawLocalFile {
  path: string
  name: string
  mimeType: string
  dataBase64: string
}

export const tauriApi: Window['api'] = {
  // ---- Config ----
  getConfig: () => invoke<AppConfig>('config_get'),

  setConfig: (config: Partial<AppConfig>) => invoke<AppConfig>('config_set', { config }),

  setProfile: (name: string, profile: Record<string, unknown>) =>
    invoke<AppConfig>('config_set_profile', { name, profile }),

  deleteProfile: (name: string) => invoke<AppConfig>('config_delete_profile', { name }),

  getConfigPath: () => invoke<string>('config_get_path'),

  getHistoryPath: () => invoke<string>('config_get_history_path'),

  exportConfig: () =>
    invoke<{ success: boolean; path?: string; error?: string }>('config_export'),

  importConfig: () =>
    invoke<{ success: boolean; config?: AppConfig; error?: string }>('config_import'),

  // ---- Path resolution & shell ----
  getPathForFile: (file: File) => {
    const mapped = filePathMap.get(file)
    if (mapped) return mapped
    return (file as unknown as { path?: string })?.path || ''
  },

  showItemInFolder: (path: string) =>
    invoke<{ success: boolean; error?: string }>('shell_show_item_in_folder', { fullPath: path }),

  readLocalFiles: async (paths: string[]): Promise<File[]> => {
    const rawFiles = await invoke<RawLocalFile[]>('read_local_files', { paths })
    return rawFiles.map((item) => {
      const buffer = base64ToArrayBuffer(item.dataBase64)
      const file = new File([buffer], item.name, { type: item.mimeType })
      registerFilePath(file, item.path)
      return file
    })
  },

  // ---- Upload ----
  uploadFile: (
    fileData: { buffer: ArrayBuffer; name: string; size: number; originalPath?: string },
    options: { targetPath: string; autoRename: string }
  ) =>
    invoke<UploadResult>('upload_file', {
      fileData: {
        bufferBase64: arrayBufferToBase64(fileData.buffer),
        name: fileData.name,
        size: fileData.size,
        originalPath: fileData.originalPath ?? null
      },
      options
    }),

  // ---- R2 connection test ----
  testConnection: (profile: R2Config) =>
    invoke<{ success: boolean; error?: string }>('r2_test_connection', { profile }),

  // ---- Clipboard ----
  copyToClipboard: (text: string) => invoke<boolean>('clipboard_copy', { text }),

  readClipboardImage: async () => {
    const raw = await invoke<RawClipboardImage | null>('clipboard_read_image')
    if (!raw) return null
    return {
      buffer: base64ToArrayBuffer(raw.bufferBase64),
      width: raw.width,
      height: raw.height,
      size: raw.size
    }
  },

  // ---- File dialog ----
  openFileDialog: () => invoke<string[] | null>('dialog_open_file'),

  // ---- History ----
  getHistory: () => invoke<UploadHistoryItem[]>('history_get'),

  clearHistory: () => invoke<UploadHistoryItem[]>('history_clear'),

  // ---- Image processing ----
  processImage: async (
    fileData: { buffer: ArrayBuffer; name: string; size: number },
    config: ImageProcessingConfig
  ) => {
    const response = await invoke<{
      success: boolean
      result?: RawImageProcessingResult
      error?: string
    }>('image_process', {
      fileData: {
        bufferBase64: arrayBufferToBase64(fileData.buffer),
        name: fileData.name,
        size: fileData.size
      },
      config
    })

    if (response.success && response.result) {
      const r = response.result
      const mappedResult: ImageProcessingResult = {
        originalSize: r.originalSize,
        processedSize: r.processedSize,
        processedBuffer: base64ToArrayBuffer(r.processedBufferBase64),
        width: r.width,
        height: r.height,
        originalWidth: r.originalWidth,
        originalHeight: r.originalHeight,
        savings: r.savings,
        format: r.format,
        fileName: r.fileName,
        originalPath: r.originalPath
      }
      return { success: true, result: mappedResult }
    }

    return {
      success: false,
      error: response.error || 'Processing failed'
    }
  },

  // ---- Theme ----
  updateTheme: (theme: string) => invoke<void>('theme_update', { theme }),

  // ---- Window controls ----
  minimizeWindow: async () => {
    await getCurrentWindow().minimize()
  },

  maximizeWindow: async () => {
    await getCurrentWindow().toggleMaximize()
  },

  closeWindow: async () => {
    await getCurrentWindow().close()
  }
}

// Expose on window.api before React mounts
window.api = tauriApi
