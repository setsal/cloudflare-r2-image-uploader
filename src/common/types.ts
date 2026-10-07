export interface R2Config {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrlBase: string
  defaultPathPrefix: string
}

export interface ImageProcessingConfig {
  enabled: boolean
  mode: 'compress' | 'resize' | 'both'
  compression: {
    quality: number // 1-100
  }
  resize: {
    percentage: number // 1-100
  }
  autoConfirm: boolean
}

export interface ImageProcessingResult {
  originalSize: number
  processedSize: number
  processedBuffer: ArrayBuffer
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  savings: number // percentage saved (0-100)
  format: string
  fileName: string
  originalPath?: string
}

export interface AppConfig {
  configVersion: number
  profiles: Record<string, R2Config>
  activeProfile: string
  autoRename: 'off' | 'timestamp' | 'random'
  clipboardFormat: 'raw' | 'markdown' | 'html'
  copyToClipboard: boolean
  theme: 'light' | 'dark'
  minimizeToTray: boolean
  imageProcessing: ImageProcessingConfig
}

/** Bump this when you change the AppConfig schema and add a migration. */
export const CURRENT_CONFIG_VERSION = 2

export interface UploadOptions {
  targetPath: string
  autoRename: 'off' | 'timestamp' | 'random'
}

export interface UploadResult {
  success: boolean
  url?: string
  key?: string
  fileName?: string
  originalName?: string
  originalPath?: string
  fileSize?: number
  error?: string
  timestamp: number
}

export interface UploadHistoryItem {
  url: string
  key: string
  fileName: string
  originalName: string
  originalPath?: string
  fileSize: number
  timestamp: number
  profile: string
}

export interface FileData {
  buffer: ArrayBuffer
  name: string
  type: string
  size: number
  originalPath?: string
}

export const DEFAULT_IMAGE_PROCESSING: ImageProcessingConfig = {
  enabled: false,
  mode: 'compress',
  compression: {
    quality: 80
  },
  resize: {
    percentage: 100
  },
  autoConfirm: false
}

export const DEFAULT_CONFIG: AppConfig = {
  configVersion: CURRENT_CONFIG_VERSION,
  profiles: {
    Default: {
      endpoint: '',
      accessKeyId: '',
      secretAccessKey: '',
      bucketName: '',
      publicUrlBase: '',
      defaultPathPrefix: ''
    }
  },
  activeProfile: 'Default',
  autoRename: 'timestamp',
  clipboardFormat: 'raw',
  copyToClipboard: false,
  theme: 'dark',
  minimizeToTray: true,
  imageProcessing: DEFAULT_IMAGE_PROCESSING
}

export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'image/heic',
  'image/heif'
]
