import { useState, useEffect, useCallback } from 'react'
import { UploadHistoryItem } from '@common/types'
import { formatFileSize, formatTimestamp } from '../lib/utils'
import { useToast } from './Toast'
import { IconCopy, IconInbox, IconFolder } from './Icons'

export function UploadHistory() {
  const [history, setHistory] = useState<UploadHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  const loadHistory = useCallback(async () => {
    try {
      const items = await window.api.getHistory()
      setHistory(items)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleCopy = async (url: string) => {
    await window.api.copyToClipboard(url)
    addToast('URL copied to clipboard!', 'success')
  }

  const handleCopyPath = async (path: string) => {
    await window.api.copyToClipboard(path)
    addToast('Original path copied to clipboard!', 'success')
  }

  const handleShowInFolder = async (path: string) => {
    try {
      const res = await window.api.showItemInFolder(path)
      if (res && !res.success && res.error) {
        addToast(res.error, 'error')
      }
    } catch {
      addToast('Failed to locate file', 'error')
    }
  }

  const handleClear = async () => {
    await window.api.clearHistory()
    setHistory([])
    addToast('History cleared', 'info')
  }

  if (loading) {
    return (
      <div className="history__empty">
        <span className="spinner" />
      </div>
    )
  }

  return (
    <div className="history">
      {history.length > 0 && (
        <div className="flex justify-between items-center mb-md">
          <span className="text-sm text-secondary">{history.length} uploads</span>
          <button className="btn btn--ghost btn--sm" onClick={handleClear}>
            Clear History
          </button>
        </div>
      )}

      {history.length === 0 ? (
        <div className="history__empty">
          <IconInbox size={32} />
          <div style={{ marginTop: '8px' }}>No uploads yet. Drop a file to get started!</div>
        </div>
      ) : (
        history.map((item, index) => (
          <div key={index} className="history__item">
            <div className="history__item-info">
              <div className="history__item-name">
                <span title={item.fileName}>{item.fileName}</span>
                {item.originalName && item.originalName !== item.fileName && (
                  <span
                    className="history__item-original-name"
                    title={`Original file name: ${item.originalName}`}
                  >
                    ({item.originalName})
                  </span>
                )}
              </div>
              {item.originalPath ? (
                <div
                  className="history__item-path"
                  onClick={() => handleCopyPath(item.originalPath!)}
                  title={`Original path: ${item.originalPath}\nClick to copy path`}
                >
                  <IconFolder size={12} />
                  <span className="history__item-path-text">{item.originalPath}</span>
                </div>
              ) : (
                <div className="history__item-path history__item-path--clipboard" title="Uploaded from clipboard">
                  <span className="history__item-badge">Clipboard</span>
                </div>
              )}
              <div className="history__item-url" title={item.url}>
                {item.url}
              </div>
            </div>
            <div className="history__item-meta">
              <div>{formatFileSize(item.fileSize)}</div>
              <div>{formatTimestamp(item.timestamp)}</div>
            </div>
            <div className="history__item-actions">
              {item.originalPath && (
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => handleShowInFolder(item.originalPath!)}
                  title="Locate original file in folder"
                >
                  <IconFolder size={12} /> Locate
                </button>
              )}
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => handleCopy(item.url)}
                title="Copy URL"
              >
                <IconCopy size={12} /> Copy
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
