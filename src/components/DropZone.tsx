import { useState, useCallback, useEffect, DragEvent } from 'react'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { IconUpload } from './Icons'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  onRejectNonImage?: (count: number) => void
  disabled?: boolean
}

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'avif',
  'svg',
  'bmp',
  'tiff',
  'tif',
  'ico',
  'heic',
  'heif'
])

function isImagePath(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  return IMAGE_EXTENSIONS.has(ext)
}

export function DropZone({ onFiles, onRejectNonImage, disabled }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  // Listen to Tauri native file drag-and-drop events (provides full originalPath)
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupTauriDragDrop = async () => {
      try {
        unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
          if (event.payload.type === 'enter' || event.payload.type === 'over') {
            setIsDragActive(true)
          } else if (event.payload.type === 'leave') {
            setIsDragActive(false)
          } else if (event.payload.type === 'drop') {
            setIsDragActive(false)
            if (disabled) return

            const allPaths = event.payload.paths || []
            if (allPaths.length === 0) return

            const imagePaths = allPaths.filter(isImagePath)
            const rejectedCount = allPaths.length - imagePaths.length

            if (rejectedCount > 0 && onRejectNonImage) {
              onRejectNonImage(rejectedCount)
            }

            if (imagePaths.length > 0) {
              const files = await window.api.readLocalFiles(imagePaths)
              if (files.length > 0) {
                onFiles(files)
              }
            }
          }
        })
      } catch {
        // Fallback to HTML5 drag-drop if running outside Tauri webview
      }
    }

    setupTauriDragDrop()
    return () => {
      if (unlisten) unlisten()
    }
  }, [onFiles, onRejectNonImage, disabled])

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true)
    }
  }, [])

  const handleDragOut = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)

      if (disabled) return

      const allFiles = Array.from(e.dataTransfer.files)
      if (allFiles.length === 0) return

      const imageFiles = allFiles.filter((f) => f.type.startsWith('image/'))
      const rejectedCount = allFiles.length - imageFiles.length

      if (rejectedCount > 0 && onRejectNonImage) {
        onRejectNonImage(rejectedCount)
      }

      if (imageFiles.length > 0) {
        onFiles(imageFiles)
      }
    },
    [onFiles, onRejectNonImage, disabled]
  )

  const handleClick = useCallback(async () => {
    if (disabled) return

    try {
      const selectedPaths = await window.api.openFileDialog()
      if (selectedPaths && selectedPaths.length > 0) {
        const files = await window.api.readLocalFiles(selectedPaths)
        if (files.length > 0) {
          onFiles(files)
        }
      }
      return
    } catch {
      // Fallback to browser file input
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = () => {
      if (input.files) {
        const files = Array.from(input.files)
        if (files.length > 0) {
          onFiles(files)
        }
      }
    }
    input.click()
  }, [onFiles, disabled])

  return (
    <div
      className={`dropzone ${isDragActive ? 'dropzone--active' : ''}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      id="dropzone"
    >
      <div className="dropzone__icon">
        <IconUpload size={24} />
      </div>
      <div className="dropzone__text">
        {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
      </div>
      <div className="dropzone__subtext">
        {isDragActive
          ? 'Release to start upload'
          : 'or click to browse — JPEG, PNG, WebP, AVIF, GIF, SVG'}
      </div>
    </div>
  )
}
