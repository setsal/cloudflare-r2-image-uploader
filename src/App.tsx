import { useState, useCallback, useEffect } from 'react'
import { ToastProvider, useToast } from './components/Toast'
import { DropZone } from './components/DropZone'
import { PathInput } from './components/PathInput'
import { RenameToggle } from './components/RenameToggle'
import { UploadProgress } from './components/UploadProgress'
import { UploadHistory } from './components/UploadHistory'
import { SettingsPanel } from './components/SettingsPanel'
import { ImageSettingsPanel } from './components/ImageSettingsPanel'
import { ProcessingConfirmDialog } from './components/ProcessingConfirmDialog'
import { IconUpload, IconImage, IconHistory, IconSettings, IconCopy } from './components/Icons'
import { useConfig } from './hooks/useConfig'
import { useUpload } from './hooks/useUpload'
import appIcon from './assets/app-icon.png'

type TabId = 'upload' | 'image' | 'history' | 'settings'

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('upload')
  const { config, loading, updateConfig, setProfile, deleteProfile } = useConfig()
  const {
    uploading,
    results,
    processing,
    processingResults,
    processFiles,
    uploadProcessedFiles,
    uploadFiles,
    clearResults,
    clearProcessing
  } = useUpload()
  const { addToast } = useToast()

  const [uploadPath, setUploadPath] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Apply theme to document root and update native title bar
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', config.theme)
    window.api.updateTheme(config.theme)
  }, [config.theme])

  // Use the config's default path if user hasn't overridden
  const effectivePath = uploadPath || config.profiles[config.activeProfile]?.defaultPathPrefix || ''

  const handleUploadComplete = useCallback(
    (uploadResults: { success: boolean }[]) => {
      const successCount = uploadResults.filter((r) => r.success).length
      const failCount = uploadResults.length - successCount

      if (successCount > 0) {
        const clipboardMsg = config.copyToClipboard ? ' — URL copied to clipboard' : ''
        addToast(
          `${successCount} image${successCount > 1 ? 's' : ''} uploaded!${clipboardMsg}`,
          'success'
        )
      }
      if (failCount > 0) {
        addToast(`${failCount} upload${failCount > 1 ? 's' : ''} failed`, 'error')
      }
    },
    [config, addToast]
  )

  const handleFiles = useCallback(
    async (files: File[]) => {
      // Check if profile is configured
      const profile = config.profiles[config.activeProfile]
      if (!profile?.endpoint || !profile?.accessKeyId || !profile?.bucketName) {
        addToast('Please configure your R2 settings first', 'error')
        setActiveTab('settings')
        return
      }

      clearResults()

      const proc = config.imageProcessing

      if (proc.enabled) {
        // Process images first
        const processed = await processFiles(files, proc)

        if (proc.autoConfirm) {
          // Auto-confirm: upload processed images directly
          const uploadResults = await uploadProcessedFiles(processed, {
            targetPath: effectivePath,
            autoRename: config.autoRename
          })
          handleUploadComplete(uploadResults)
        } else {
          // Show confirmation dialog
          setShowConfirmDialog(true)
        }
      } else {
        // No processing: upload directly
        const uploadResults = await uploadFiles(files, {
          targetPath: effectivePath,
          autoRename: config.autoRename
        })
        handleUploadComplete(uploadResults)
      }
    },
    [
      config,
      effectivePath,
      processFiles,
      uploadProcessedFiles,
      uploadFiles,
      clearResults,
      handleUploadComplete,
      addToast
    ]
  )

  const handleRejectNonImage = useCallback(
    (count: number) => {
      addToast(
        `${count} non-image file${count > 1 ? 's' : ''} rejected — only images are supported`,
        'error'
      )
    },
    [addToast]
  )

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const imageData = await window.api.readClipboardImage()
      if (!imageData) {
        addToast('No image found in clipboard', 'error')
        return
      }

      // Create a File object from the clipboard image buffer
      const blob = new Blob([imageData.buffer], { type: 'image/png' })
      const fileName = `clipboard-${Date.now()}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      handleFiles([file])
    } catch {
      addToast('Failed to read clipboard image', 'error')
    }
  }, [addToast, handleFiles])

  const handleConfirmUpload = useCallback(async () => {
    setShowConfirmDialog(false)
    const uploadResults = await uploadProcessedFiles(processingResults, {
      targetPath: effectivePath,
      autoRename: config.autoRename
    })
    handleUploadComplete(uploadResults)
  }, [processingResults, effectivePath, config.autoRename, uploadProcessedFiles, handleUploadComplete])

  const handleCancelProcessing = useCallback(() => {
    setShowConfirmDialog(false)
    clearProcessing()
  }, [clearProcessing])

  if (loading) {
    return (
      <div className="app">
        <div className="app-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    )
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'upload', label: 'Upload', icon: <IconUpload size={14} /> },
    { id: 'image', label: 'Image', icon: <IconImage size={14} /> },
    { id: 'history', label: 'History', icon: <IconHistory size={14} /> },
    { id: 'settings', label: 'Settings', icon: <IconSettings size={14} /> }
  ]

  // Show connection status
  const profile = config.profiles[config.activeProfile]
  const isConfigured = !!(profile?.endpoint && profile?.accessKeyId && profile?.bucketName)

  return (
    <div className="app">
      {/* Title Bar Area */}
      <div className="app-header" data-tauri-drag-region>
        <div className="app-header__title" data-tauri-drag-region>
          <img src={appIcon} alt="" className="app-header__title-icon" />
          Cloudflare R2 Image Uploader
        </div>
        <div className="app-header__actions">
          <span
            className={`status-badge ${isConfigured ? 'status-badge--success' : 'status-badge--error'}`}
          >
            <span className="status-badge__dot" />
            {isConfigured ? config.activeProfile : 'Not configured'}
          </span>
          <div className="window-controls">
            <button
              type="button"
              className="window-control-btn"
              onClick={() => window.api.minimizeWindow()}
              title="Minimize"
              aria-label="Minimize"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className="window-control-btn"
              onClick={() => window.api.maximizeWindow()}
              title="Maximize"
              aria-label="Maximize"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect
                  x="1.5"
                  y="1.5"
                  width="7"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            </button>
            <button
              type="button"
              className="window-control-btn window-control-btn--close"
              onClick={() => window.api.closeWindow()}
              title="Close"
              aria-label="Close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 2L8 8M8 2L2 8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: '0 24px' }}>
        <nav className="nav-tabs" id="main-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'nav-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              id={`nav-${tab.id}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="app-content">
        {activeTab === 'upload' && (
          <>
            <DropZone
              onFiles={handleFiles}
              onRejectNonImage={handleRejectNonImage}
              disabled={uploading || processing}
            />

            <div className="upload-actions">
              <button
                className="btn btn--secondary"
                onClick={handlePasteFromClipboard}
                disabled={uploading || processing}
                id="paste-clipboard"
              >
                <IconCopy size={14} /> Paste from Clipboard
              </button>
            </div>

            <div className="upload-controls">
              <PathInput
                value={uploadPath}
                onChange={setUploadPath}
                defaultPrefix={profile?.defaultPathPrefix}
              />
              <RenameToggle
                value={config.autoRename}
                onChange={(v) => updateConfig({ autoRename: v })}
              />
            </div>

            <UploadProgress results={results} uploading={uploading} />
          </>
        )}

        {activeTab === 'image' && (
          <ImageSettingsPanel config={config} onUpdateConfig={updateConfig} />
        )}

        {activeTab === 'history' && <UploadHistory />}

        {activeTab === 'settings' && (
          <SettingsPanel
            config={config}
            onUpdateConfig={updateConfig}
            onSetProfile={setProfile}
            onDeleteProfile={deleteProfile}
          />
        )}
      </div>

      {/* Processing Confirmation Dialog */}
      {showConfirmDialog && (
        <ProcessingConfirmDialog
          results={processingResults}
          processing={processing}
          onConfirm={handleConfirmUpload}
          onCancel={handleCancelProcessing}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
