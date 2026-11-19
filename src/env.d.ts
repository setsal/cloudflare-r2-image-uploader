/// <reference types="vite/client" />

import {
  AppConfig,
  UploadResult,
  UploadHistoryItem,
  R2Config,
  ImageProcessingConfig,
  ImageProcessingResult
} from './common/types'

// Asset imports — Vite resolves these to URL strings at build time
declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}

declare global {
  interface Window {
    api: {
      // Config
      getConfig: () => Promise<AppConfig>
      setConfig: (config: Partial<AppConfig>) => Promise<AppConfig>
      setProfile: (name: string, profile: Record<string, unknown>) => Promise<AppConfig>
      deleteProfile: (name: string) => Promise<AppConfig>
      getConfigPath: () => Promise<string>
      getHistoryPath: () => Promise<string>
      exportConfig: () => Promise<{ success: boolean; path?: string; error?: string }>
      importConfig: () => Promise<{ success: boolean; config?: AppConfig; error?: string }>

      // Path resolution & shell
      getPathForFile: (file: File) => string
      showItemInFolder: (path: string) => Promise<{ success: boolean; error?: string }>
      readLocalFiles: (paths: string[]) => Promise<File[]>

      // Upload
      uploadFile: (
        fileData: { buffer: ArrayBuffer; name: string; size: number; originalPath?: string },
        options: { targetPath: string; autoRename: string }
      ) => Promise<UploadResult>

      // R2 connection test
      testConnection: (profile: R2Config) => Promise<{ success: boolean; error?: string }>

      // Clipboard
      copyToClipboard: (text: string) => Promise<boolean>
      readClipboardImage: () => Promise<{
        buffer: ArrayBuffer
        width: number
        height: number
        size: number
      } | null>

      // File dialog
      openFileDialog: () => Promise<string[] | null>

      // History
      getHistory: () => Promise<UploadHistoryItem[]>
      clearHistory: () => Promise<UploadHistoryItem[]>

      // Image processing
      processImage: (
        fileData: { buffer: ArrayBuffer; name: string; size: number },
        config: ImageProcessingConfig
      ) => Promise<{ success: boolean; result?: ImageProcessingResult; error?: string }>

      // Theme
      updateTheme: (theme: string) => Promise<void>

      // Window controls
      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
    }
  }
}
