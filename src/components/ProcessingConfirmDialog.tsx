import { ImageProcessingResult } from '@common/types'
import { IconCheck, IconX } from './Icons'

interface ProcessingConfirmDialogProps {
  results: ImageProcessingResult[]
  processing: boolean
  onConfirm: () => void
  onCancel: () => void
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function ProcessingConfirmDialog({
  results,
  processing,
  onConfirm,
  onCancel
}: ProcessingConfirmDialogProps) {
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0)
  const totalProcessed = results.reduce((sum, r) => sum + r.processedSize, 0)
  const totalSavings =
    totalOriginal > 0
      ? Math.round(((totalOriginal - totalProcessed) / totalOriginal) * 100)
      : 0

  return (
    <div className="processing-overlay" onClick={onCancel}>
      <div className="processing-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="processing-dialog__header">
          <h3 className="processing-dialog__title">Image Processing Preview</h3>
          <button className="btn btn--ghost btn--sm" onClick={onCancel}>
            <IconX size={14} />
          </button>
        </div>

        {processing ? (
          <div className="processing-dialog__loading">
            <span className="spinner" style={{ width: 24, height: 24 }} />
            <span className="text-secondary">Processing images...</span>
          </div>
        ) : (
          <>
            <div className="processing-dialog__list">
              {results.map((result, index) => (
                <div key={index} className="processing-item">
                  <div className="processing-item__header">
                    <span className="processing-item__name">{result.fileName}</span>
                    <span className="processing-item__savings">
                      {result.savings > 0 ? (
                        <span className="text-success">-{result.savings}%</span>
                      ) : (
                        <span className="text-secondary">0%</span>
                      )}
                    </span>
                  </div>

                  <div className="processing-item__details">
                    <div className="processing-item__sizes">
                      <span className="text-secondary">{formatSize(result.originalSize)}</span>
                      <span className="processing-item__arrow">→</span>
                      <span className="text-accent">{formatSize(result.processedSize)}</span>
                    </div>
                    {(result.originalWidth !== result.width ||
                      result.originalHeight !== result.height) && (
                      <div className="processing-item__dimensions text-xs text-secondary">
                        {result.originalWidth}×{result.originalHeight} → {result.width}×
                        {result.height}
                      </div>
                    )}
                  </div>

                  <div className="savings-bar">
                    <div
                      className="savings-bar__fill"
                      style={{ width: `${Math.max(0, Math.min(100, result.savings))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="processing-dialog__summary">
              <div className="processing-dialog__total">
                <span>Total: {formatSize(totalOriginal)} → {formatSize(totalProcessed)}</span>
                {totalSavings > 0 && (
                  <span className="text-success"> ({totalSavings}% saved)</span>
                )}
              </div>
            </div>

            <div className="processing-dialog__actions">
              <button className="btn btn--secondary" onClick={onCancel}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={onConfirm}>
                <IconCheck size={14} /> Upload {results.length} image{results.length !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
