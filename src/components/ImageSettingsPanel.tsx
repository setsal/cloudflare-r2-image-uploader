import { AppConfig, ImageProcessingConfig } from '@common/types'
import { IconImage, IconCompress, IconResize } from './Icons'

interface ImageSettingsPanelProps {
  config: AppConfig
  onUpdateConfig: (updates: Partial<AppConfig>) => Promise<AppConfig>
}

export function ImageSettingsPanel({ config, onUpdateConfig }: ImageSettingsPanelProps) {
  const proc = config.imageProcessing

  const updateProcessing = async (updates: Partial<ImageProcessingConfig>) => {
    await onUpdateConfig({
      imageProcessing: { ...proc, ...updates }
    })
  }

  const presetPercentages = [25, 50, 75, 100]

  const isCompressActive = proc.enabled && (proc.mode === 'compress' || proc.mode === 'both')
  const isResizeActive = proc.enabled && (proc.mode === 'resize' || proc.mode === 'both')

  return (
    <div className="settings">
      {/* Master Toggle & Mode */}
      <div className="settings__section">
        <div className="settings__section-title">Image Processing</div>

        <div className="toggle-group">
          <div className="toggle-group__label">
            <span className="toggle-group__title">
              <IconImage size={14} /> Enable Processing
            </span>
            <span className="toggle-group__desc">
              Process images before uploading to R2
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={proc.enabled}
              onChange={(e) => updateProcessing({ enabled: e.target.checked })}
            />
            <span className="toggle-switch__slider" />
          </label>
        </div>

        <div className={`form-group ${!proc.enabled ? 'section-disabled' : ''}`}>
          <label className="form-label">Processing Mode</label>
          <div className="segmented" id="processing-mode-toggle">
            {(['compress', 'resize', 'both'] as const).map((mode) => (
              <button
                key={mode}
                className={`segmented__option ${proc.mode === mode ? 'segmented__option--active' : ''}`}
                onClick={() => updateProcessing({ mode })}
                disabled={!proc.enabled}
              >
                {mode === 'compress' && <><IconCompress size={12} /> Compress</>}
                {mode === 'resize' && <><IconResize size={12} /> Resize</>}
                {mode === 'both' && <>Both</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2-Column Grid for Compression & Resize */}
      <div className="settings__row settings__row--stretch">
        {/* Compression Settings */}
        <div className={`settings__section ${!isCompressActive ? 'section-disabled' : ''}`}>
          <div className="settings__section-header">
            <div className="settings__section-title">Compression</div>
            <span className="settings__value-badge">{proc.compression.quality}%</span>
          </div>

          <div className="form-group flex-1 justify-between">
            <label className="form-label" htmlFor="compression-quality">
              Output Quality
            </label>
            <div className="slider-container">
              <input
                id="compression-quality"
                className="slider"
                type="range"
                min={1}
                max={100}
                step={1}
                value={proc.compression.quality}
                onChange={(e) =>
                  updateProcessing({
                    compression: { quality: parseInt(e.target.value) }
                  })
                }
                disabled={!isCompressActive}
              />
              <div className="slider-labels">
                <span>Smaller file</span>
                <span>Higher quality</span>
              </div>
            </div>
            <div className="text-xs text-secondary">
              Recommended: 75%–85% for optimal size & clarity
            </div>
          </div>
        </div>

        {/* Resize Settings */}
        <div className={`settings__section ${!isResizeActive ? 'section-disabled' : ''}`}>
          <div className="settings__section-header">
            <div className="settings__section-title">Resize</div>
            <span className="settings__value-badge">{proc.resize.percentage}%</span>
          </div>

          <div className="form-group flex-1 justify-between">
            <div className="preset-buttons">
              {presetPercentages.map((pct) => (
                <button
                  key={pct}
                  className={`preset-btn flex-1 ${proc.resize.percentage === pct ? 'preset-btn--active' : ''}`}
                  onClick={() =>
                    updateProcessing({ resize: { percentage: pct } })
                  }
                  disabled={!isResizeActive}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="slider-container">
              <input
                id="resize-percentage"
                className="slider"
                type="range"
                min={10}
                max={100}
                step={5}
                value={proc.resize.percentage}
                onChange={(e) =>
                  updateProcessing({
                    resize: { percentage: parseInt(e.target.value) }
                  })
                }
                disabled={!isResizeActive}
                aria-label="Resize scale percentage"
              />
              <div className="slider-labels">
                <span>10%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="text-xs text-secondary">
              {proc.resize.percentage < 100
                ? `Scaled to ${proc.resize.percentage}% of original dimensions`
                : 'Original dimensions preserved (100%)'}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Behavior */}
      <div className={`settings__section ${!proc.enabled ? 'section-disabled' : ''}`}>
        <div className="settings__section-title">Upload Behavior</div>

        <div className="toggle-group">
          <div className="toggle-group__label">
            <span className="toggle-group__title">Auto-confirm</span>
            <span className="toggle-group__desc">
              Skip the confirmation dialog and upload processed images directly
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={proc.autoConfirm}
              onChange={(e) => updateProcessing({ autoConfirm: e.target.checked })}
              disabled={!proc.enabled}
            />
            <span className="toggle-switch__slider" />
          </label>
        </div>
      </div>
    </div>
  )
}
