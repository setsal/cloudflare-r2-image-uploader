/**
 * Inline SVG icons — renders consistently across all platforms.
 * Each icon is a 16×16 SVG using currentColor so it inherits text color.
 */

interface IconProps {
  size?: number
  className?: string
}

function svg(d: string, props: IconProps = {}, viewBox = '0 0 16 16') {
  const { size = 16, className } = props
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  )
}

// Cloud upload
export function IconUpload(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M4.5 11.5A3.5 3.5 0 0 1 3.1 4.6a4.5 4.5 0 0 1 8.8-0.1A3 3 0 0 1 12.5 10.5" />
      <path d="M8 7v6" />
      <path d="M5.5 9.5L8 7l2.5 2.5" />
    </svg>
  )
}

// History / clock
export function IconHistory(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  )
}

// Settings gear
export function IconSettings(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="2" />
      <path d="M13.5 8a5.5 5.5 0 0 0-.1-.8l1.3-1-1.2-2-1.5.5a5.5 5.5 0 0 0-1.4-.8L10.2 2.5h-2.4l-.4 1.4a5.5 5.5 0 0 0-1.4.8l-1.5-.5-1.2 2 1.3 1a5.5 5.5 0 0 0 0 1.6l-1.3 1 1.2 2 1.5-.5c.4.3.9.6 1.4.8l.4 1.4h2.4l.4-1.4c.5-.2 1-.5 1.4-.8l1.5.5 1.2-2-1.3-1a5.5 5.5 0 0 0 .1-.8z" />
    </svg>
  )
}

// Copy / clipboard
export function IconCopy(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <rect x="5" y="5" width="8" height="8" rx="1" />
      <path d="M11 3H4a1 1 0 0 0-1 1v7" />
    </svg>
  )
}

// Check mark
export function IconCheck(props: IconProps = {}) {
  return svg('M3.5 8.5L6.5 11.5L12.5 4.5', props)
}

// X / close
export function IconX(props: IconProps = {}) {
  return svg('M4 4L12 12M12 4L4 12', props)
}

// Info circle
export function IconInfo(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7v4" />
      <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Eye open
export function IconEye(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  )
}

// Eye closed / off
export function IconEyeOff(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M2.5 2.5l11 11" />
      <path d="M6.7 6.7a1.5 1.5 0 0 0 2.1 2.1" />
      <path d="M4.2 4.2C3 5.2 2 8 2 8s2.5 4 6 4c1 0 2-.3 2.8-.8" />
      <path d="M14 8s-1-1.8-2.5-3" />
    </svg>
  )
}

// Trash / delete
export function IconTrash(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M3 4.5h10" />
      <path d="M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" />
      <path d="M4.5 4.5L5 13a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8.5" />
    </svg>
  )
}

// Sun (light mode)
export function IconSun(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
    </svg>
  )
}

// Moon (dark mode)
export function IconMoon(props: IconProps = {}) {
  return svg('M13 8A5 5 0 1 1 5.5 3a4 4 0 0 0 7.5 5z', props)
}

// Link / connection
export function IconLink(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M6.5 9.5a3 3 0 0 0 4.2.3L12.5 8a3 3 0 0 0-4.2-4.2L7 5" />
      <path d="M9.5 6.5a3 3 0 0 0-4.2-.3L3.5 8a3 3 0 0 0 4.2 4.2L9 11" />
    </svg>
  )
}

// Export / upload out
export function IconExport(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M8 2v8" />
      <path d="M5 4.5L8 2l3 2.5" />
      <path d="M3 10v3h10v-3" />
    </svg>
  )
}

// Import / download in
export function IconImport(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M8 2v8" />
      <path d="M5 7.5L8 10l3-2.5" />
      <path d="M3 10v3h10v-3" />
    </svg>
  )
}

// Empty inbox
export function IconInbox(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M2.5 5.5L1 10v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3l-1.5-4.5a1 1 0 0 0-.9-.7H3.4a1 1 0 0 0-.9.7z" />
      <path d="M1 10h4l1 2h4l1-2h4" />
    </svg>
  )
}

// Image / photo
export function IconImage(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <circle cx="5.5" cy="5.5" r="1" />
      <path d="M14 10l-3-3-7 7" />
    </svg>
  )
}

// Compress / squeeze
export function IconCompress(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M4 2v4l4-2-4-2z" fill="currentColor" stroke="none" />
      <path d="M12 14v-4l-4 2 4 2z" fill="currentColor" stroke="none" />
      <path d="M2 8h12" />
    </svg>
  )
}

// Resize / scale
export function IconResize(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" strokeDasharray="3 2" />
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <path d="M12.5 8.5l-2-2" />
      <path d="M12.5 8.5h-2v-2" />
    </svg>
  )
}

// Folder / locate directory
export function IconFolder(props: IconProps = {}) {
  const { size = 16, className } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M2 3.5a1.5 1.5 0 0 1 1.5-1.5h3l1.5 2h4.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11V3.5z" />
    </svg>
  )
}


