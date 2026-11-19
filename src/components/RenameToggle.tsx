interface RenameToggleProps {
  value: 'off' | 'timestamp' | 'random'
  onChange: (value: 'off' | 'timestamp' | 'random') => void
}

export function RenameToggle({ value, onChange }: RenameToggleProps) {
  const options: { label: string; value: 'off' | 'timestamp' | 'random' }[] = [
    { label: 'Off', value: 'off' },
    { label: 'Timestamp', value: 'timestamp' },
    { label: 'Random', value: 'random' }
  ]

  return (
    <div className="form-group">
      <label className="form-label">Auto Rename</label>
      <div className="segmented" id="rename-toggle">
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`segmented__option ${value === opt.value ? 'segmented__option--active' : ''}`}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
