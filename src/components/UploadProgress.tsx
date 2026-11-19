import { UploadResult } from '@common/types'
import { formatFileSize } from '../lib/utils'
import { IconCheck, IconX, IconCopy } from './Icons'

interface UploadProgressProps {
  results: UploadResult[]
  uploading: boolean
}

export function UploadProgress({ results, uploading }: UploadProgressProps) {
  if (results.length === 0 && !uploading) return null

  return (
    <div className="flex flex-col gap-sm">
      {uploading && (
        <div className="upload-progress">
          <div className="upload-progress__info">
            <span className="upload-progress__filename">Uploading...</span>
            <span className="spinner" />
          </div>
          <div className="upload-progress__bar">
            <div className="upload-progress__fill" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {results.map((result, index) => (
        <div
          key={index}
          className={`upload-result ${result.success ? '' : 'upload-result--error'}`}
        >
          <span className="upload-result__icon">
            {result.success ? <IconCheck size={14} /> : <IconX size={14} />}
          </span>
          <span className="upload-result__url">
            {result.success ? result.url : result.error}
          </span>
          {result.success && result.fileSize && (
            <span className="text-xs text-secondary">
              {formatFileSize(result.fileSize)}
            </span>
          )}
          {result.success && result.url && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => window.api.copyToClipboard(result.url!)}
              title="Copy URL"
            >
              <IconCopy size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
