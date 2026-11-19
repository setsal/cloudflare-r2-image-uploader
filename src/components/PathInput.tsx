interface PathInputProps {
  value: string
  onChange: (value: string) => void
  defaultPrefix?: string
}

export function PathInput({ value, onChange, defaultPrefix }: PathInputProps) {
  return (
    <div className="form-group upload-controls__path">
      <label className="form-label" htmlFor="path-input">Upload Path</label>
      <input
        id="path-input"
        className="form-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultPrefix || 'e.g. blog/images/2026/'}
        spellCheck={false}
      />
    </div>
  )
}
