import { useState, useCallback } from 'react'
import { UploadResult, ImageProcessingConfig, ImageProcessingResult } from '@common/types'
import { fileToArrayBuffer } from '../lib/utils'

interface UploadState {
  uploading: boolean
  results: UploadResult[]
  processing: boolean
  processingResults: ImageProcessingResult[]
  pendingFiles: File[]
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    results: [],
    processing: false,
    processingResults: [],
    pendingFiles: []
  })

  /**
   * Process files through sharp in the main process.
   * Returns processing results for confirmation.
   */
  const processFiles = useCallback(
    async (files: File[], processingConfig: ImageProcessingConfig) => {
      setState((prev) => ({
        ...prev,
        processing: true,
        processingResults: [],
        pendingFiles: files
      }))

      const results: ImageProcessingResult[] = []

      for (const file of files) {
        const originalPath = window.api.getPathForFile(file) || undefined
        try {
          const buffer = await fileToArrayBuffer(file)
          const response = await window.api.processImage(
            { buffer, name: file.name, size: file.size },
            processingConfig
          )
          if (response.success && response.result) {
            results.push({
              ...response.result,
              originalPath
            })
          } else {
            // If processing fails, pass the original through
            results.push({
              originalSize: file.size,
              processedSize: file.size,
              processedBuffer: buffer,
              width: 0,
              height: 0,
              originalWidth: 0,
              originalHeight: 0,
              savings: 0,
              format: 'unknown',
              fileName: file.name,
              originalPath
            })
          }
        } catch {
          // On error, pass original through
          const buffer = await fileToArrayBuffer(file)
          results.push({
            originalSize: file.size,
            processedSize: file.size,
            processedBuffer: buffer,
            width: 0,
            height: 0,
            originalWidth: 0,
            originalHeight: 0,
            savings: 0,
            format: 'unknown',
            fileName: file.name,
            originalPath
          })
        }
      }

      setState((prev) => ({
        ...prev,
        processing: false,
        processingResults: results
      }))

      return results
    },
    []
  )

  /**
   * Upload processed files using pre-processed buffers.
   */
  const uploadProcessedFiles = useCallback(
    async (
      processedResults: ImageProcessingResult[],
      options: { targetPath: string; autoRename: 'off' | 'timestamp' | 'random' }
    ) => {
      setState((prev) => ({ ...prev, uploading: true, results: [] }))

      const results: UploadResult[] = []

      for (const processed of processedResults) {
        try {
          const result = await window.api.uploadFile(
            {
              buffer: processed.processedBuffer,
              name: processed.fileName,
              size: processed.processedSize,
              originalPath: processed.originalPath
            },
            options
          )
          results.push(result)
        } catch (err) {
          results.push({
            success: false,
            error: err instanceof Error ? err.message : 'Upload failed',
            timestamp: Date.now()
          })
        }

        setState((prev) => ({ ...prev, results: [...results] }))
      }

      setState((prev) => ({
        ...prev,
        uploading: false,
        processingResults: [],
        pendingFiles: []
      }))
      return results
    },
    []
  )

  /**
   * Upload files directly (no processing).
   */
  const uploadFiles = useCallback(
    async (
      files: File[],
      options: { targetPath: string; autoRename: 'off' | 'timestamp' | 'random' }
    ) => {
      setState((prev) => ({ ...prev, uploading: true, results: [] }))

      const results: UploadResult[] = []

      for (const file of files) {
        try {
          const buffer = await fileToArrayBuffer(file)
          const originalPath = window.api.getPathForFile(file) || undefined
          const result = await window.api.uploadFile(
            { buffer, name: file.name, size: file.size, originalPath },
            options
          )
          results.push(result)
        } catch (err) {
          results.push({
            success: false,
            error: err instanceof Error ? err.message : 'Upload failed',
            timestamp: Date.now()
          })
        }

        // Update results progressively
        setState((prev) => ({ ...prev, results: [...results] }))
      }

      setState((prev) => ({ ...prev, uploading: false }))
      return results
    },
    []
  )

  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      results: [],
      processingResults: [],
      pendingFiles: []
    }))
  }, [])

  const clearProcessing = useCallback(() => {
    setState((prev) => ({
      ...prev,
      processing: false,
      processingResults: [],
      pendingFiles: []
    }))
  }, [])

  return {
    uploading: state.uploading,
    results: state.results,
    processing: state.processing,
    processingResults: state.processingResults,
    pendingFiles: state.pendingFiles,
    processFiles,
    uploadProcessedFiles,
    uploadFiles,
    clearResults,
    clearProcessing
  }
}
