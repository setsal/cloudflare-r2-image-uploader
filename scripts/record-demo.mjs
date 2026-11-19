import { chromium } from 'playwright'
import { spawn, execFileSync } from 'child_process'
import { mkdirSync, rmSync, existsSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = resolve(__dirname, '..')
const ASSETS_DIR = resolve(ROOT_DIR, '.github', 'assets')
const TMP_VIDEO_DIR = resolve(ROOT_DIR, '.tmp-demo-video')

const PORT = 1420
const DEV_URL = `http://localhost:${PORT}`
const VIEWPORT = { width: 800, height: 650 }

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // retry
    }
    await sleep(250)
  }
  return false
}

async function startViteServer() {
  // Check if already running
  if (await waitForServer(DEV_URL, 600)) {
    console.log(`[demo] Using existing Vite dev server at ${DEV_URL}`)
    return null
  }

  console.log(`[demo] Starting Vite dev server at ${DEV_URL}...`)
  const viteBin = resolve(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(process.execPath, [viteBin, '--port', String(PORT)], {
    cwd: ROOT_DIR,
    stdio: 'ignore'
  })

  const ready = await waitForServer(DEV_URL, 15000)
  if (!ready) {
    child.kill()
    throw new Error(`Vite server failed to start at ${DEV_URL}`)
  }
  return child
}

/**
 * Injected script before React mounts:
 * 1. Mocks window.__TAURI_INTERNALS__ so @tauri-apps/api/core invoke() works seamlessly in pure browser.
 * 2. Injects a smooth visual SVG cursor & click ripple so viewers can clearly follow UI actions.
 */
function getInitScript() {
  return () => {
    // Tiny SVG thumbnails encoded as data URLs for realistic upload history items
    const makeThumbSvg = (bg1, bg2, label) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${bg1}"/>
            <stop offset="100%" stop-color="${bg2}"/>
          </linearGradient>
        </defs>
        <rect width="80" height="80" rx="10" fill="url(#g)"/>
        <circle cx="56" cy="24" r="8" fill="rgba(255,255,255,0.85)"/>
        <path d="M8 64 L30 40 L48 56 L60 44 L72 64 Z" fill="rgba(255,255,255,0.35)"/>
        <text x="40" y="74" font-family="sans-serif" font-size="9" font-weight="bold" fill="#fff" text-anchor="middle">${label}</text>
      </svg>`
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    }

    const now = Date.now()

    let mockConfig = {
      configVersion: 2,
      profiles: {
        'Blog-R2': {
          endpoint: 'https://8f92a1c4b3e0d7f1a2b3.r2.cloudflarestorage.com',
          accessKeyId: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
          secretAccessKey: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
          bucketName: 'blog-media-prod',
          publicUrlBase: 'https://cdn.setsal.dev',
          defaultPathPrefix: 'posts/2026/'
        },
        Default: {
          endpoint: 'https://demo-account.r2.cloudflarestorage.com',
          accessKeyId: 'demo-access-key',
          secretAccessKey: 'demo-secret-key',
          bucketName: 'my-r2-bucket',
          publicUrlBase: 'https://img.example.com',
          defaultPathPrefix: 'uploads/'
        }
      },
      activeProfile: 'Blog-R2',
      autoRename: 'timestamp',
      clipboardFormat: 'markdown',
      copyToClipboard: true,
      theme: 'dark',
      minimizeToTray: true,
      imageProcessing: {
        enabled: true,
        mode: 'both',
        compression: { quality: 80 },
        resize: { percentage: 75 },
        autoConfirm: false
      }
    }

    let mockHistory = [
      {
        url: makeThumbSvg('#3b82f6', '#1d4ed8', 'ARCH'),
        key: 'posts/2026/r2-architecture-20261119.webp',
        fileName: 'r2-architecture-20261119.webp',
        originalName: 'r2-architecture.png',
        originalPath: 'C:\\Users\\setsal\\Pictures\\Blog\\r2-architecture.png',
        fileSize: 184320,
        timestamp: now - 1000 * 60 * 25,
        profile: 'Blog-R2'
      },
      {
        url: makeThumbSvg('#10b981', '#047857', 'BENCH'),
        key: 'posts/2026/compression-benchmark-20261119.webp',
        fileName: 'compression-benchmark-20261119.webp',
        originalName: 'compression-benchmark.png',
        originalPath: 'C:\\Users\\setsal\\Pictures\\Blog\\compression-benchmark.png',
        fileSize: 142600,
        timestamp: now - 1000 * 60 * 120,
        profile: 'Blog-R2'
      }
    ]

    // Fake 1x1 PNG base64 for mock file read
    const TINY_PNG_B64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    // Provide Tauri v2 internals mock
    window.__TAURI_INTERNALS__ = {
      metadata: {
        currentWindow: { label: 'main' },
        currentWebview: { windowLabel: 'main', label: 'main' }
      },
      transformCallback: () => 1,
      invoke: async (cmd, args = {}) => {
        switch (cmd) {
          case 'config_get':
            return structuredClone(mockConfig)
          case 'config_set':
            mockConfig = { ...mockConfig, ...(args.config || {}) }
            return structuredClone(mockConfig)
          case 'config_set_profile':
            mockConfig.profiles[args.name] = args.profile
            return structuredClone(mockConfig)
          case 'config_delete_profile':
            delete mockConfig.profiles[args.name]
            return structuredClone(mockConfig)
          case 'config_get_path':
            return 'C:\\Users\\setsal\\AppData\\Roaming\\com.r2-image-uploader.desktop\\config.json'
          case 'config_get_history_path':
            return 'C:\\Users\\setsal\\AppData\\Roaming\\com.r2-image-uploader.desktop\\history.json'
          case 'dialog_open_file':
            return ['C:\\Users\\setsal\\Pictures\\Screenshots\\hero-banner-4k.png']
          case 'read_local_files':
            return [
              {
                path: 'C:\\Users\\setsal\\Pictures\\Screenshots\\hero-banner-4k.png',
                name: 'hero-banner-4k.png',
                mimeType: 'image/png',
                dataBase64: TINY_PNG_B64
              }
            ]
          case 'image_process': {
            await new Promise((r) => setTimeout(r, 380))
            return {
              success: true,
              result: {
                originalSize: 2485760, // 2.4 MB
                processedSize: 634880, // 620.0 KB
                processedBufferBase64: TINY_PNG_B64,
                width: 1920,
                height: 1080,
                originalWidth: 2560,
                originalHeight: 1440,
                savings: 74,
                format: 'png',
                fileName: 'hero-banner-4k.png',
                originalPath: 'C:\\Users\\setsal\\Pictures\\Screenshots\\hero-banner-4k.png'
              }
            }
          }
          case 'upload_file': {
            await new Promise((r) => setTimeout(r, 520))
            const uploadedUrl = 'https://cdn.setsal.dev/posts/2026/hero-banner-4k-1763562000.png'
            const newItem = {
              url: makeThumbSvg('#f6821f', '#ea580c', 'HERO'),
              key: 'posts/2026/hero-banner-4k-1763562000.png',
              fileName: 'hero-banner-4k-1763562000.png',
              originalName: 'hero-banner-4k.png',
              originalPath: 'C:\\Users\\setsal\\Pictures\\Screenshots\\hero-banner-4k.png',
              fileSize: 634880,
              timestamp: Date.now(),
              profile: mockConfig.activeProfile
            }
            mockHistory = [newItem, ...mockHistory]
            return {
              success: true,
              url: uploadedUrl,
              key: newItem.key,
              fileName: newItem.fileName,
              originalName: newItem.originalName,
              originalPath: newItem.originalPath,
              fileSize: newItem.fileSize,
              timestamp: newItem.timestamp
            }
          }
          case 'history_get':
            return structuredClone(mockHistory)
          case 'history_clear':
            mockHistory = []
            return []
          case 'r2_test_connection':
            await new Promise((r) => setTimeout(r, 450))
            return { success: true }
          case 'clipboard_copy':
            return true
          case 'theme_update':
            return null
          default:
            return null
        }
      }
    }

    // Visual Demo Cursor Helper
    window.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style')
      style.textContent = `
        #demo-cursor {
          position: fixed;
          top: 0;
          left: 0;
          width: 26px;
          height: 26px;
          pointer-events: none;
          z-index: 999999;
          transform: translate(400px, 325px);
          transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.55));
        }
        .demo-click-ripple {
          position: fixed;
          width: 34px;
          height: 34px;
          margin-left: -17px;
          margin-top: -17px;
          border-radius: 50%;
          border: 2.5px solid #f6821f;
          background: rgba(246, 130, 31, 0.28);
          pointer-events: none;
          z-index: 999998;
          animation: demo-ripple-anim 480ms ease-out forwards;
        }
        @keyframes demo-ripple-anim {
          0% { transform: scale(0.35); opacity: 1; }
          100% { transform: scale(1.75); opacity: 0; }
        }
      `
      document.head.appendChild(style)

      const cursor = document.createElement('div')
      cursor.id = 'demo-cursor'
      cursor.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.5 2.5L19.5 10.5L12.2 12.6L9.5 19.8L4.5 2.5Z" fill="#FFFFFF" stroke="#111119" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
      `
      document.body.appendChild(cursor)

      window.__demoMoveCursor = (x, y) => {
        cursor.style.transform = `translate(${x}px, ${y}px)`
      }

      window.__demoRipple = (x, y) => {
        const ripple = document.createElement('div')
        ripple.className = 'demo-click-ripple'
        ripple.style.left = `${x}px`
        ripple.style.top = `${y}px`
        document.body.appendChild(ripple)
        setTimeout(() => ripple.remove(), 500)
      }
    })
  }
}

async function moveAndClick(page, selector, options = {}) {
  const { waitBeforeClick = 460, waitAfterClick = 650, offsetX = 0, offsetY = 0 } = options
  const locator = typeof selector === 'string' ? page.locator(selector).first() : selector
  await locator.waitFor({ state: 'visible', timeout: 8000 })
  const box = await locator.boundingBox()
  if (!box) throw new Error(`Could not find boundingBox for ${selector}`)

  const x = Math.round(box.x + box.width / 2 + offsetX)
  const y = Math.round(box.y + box.height / 2 + offsetY)

  await page.evaluate(({ x, y }) => window.__demoMoveCursor?.(x, y), { x, y })
  await sleep(waitBeforeClick)
  await page.evaluate(({ x, y }) => window.__demoRipple?.(x, y), { x, y })
  await locator.click({ force: true })
  await sleep(waitAfterClick)
}

async function moveCursorTo(page, x, y, waitMs = 450) {
  await page.evaluate(({ x, y }) => window.__demoMoveCursor?.(x, y), { x, y })
  await sleep(waitMs)
}

async function recordDemo() {
  mkdirSync(ASSETS_DIR, { recursive: true })
  if (existsSync(TMP_VIDEO_DIR)) {
    rmSync(TMP_VIDEO_DIR, { recursive: true, force: true })
  }
  mkdirSync(TMP_VIDEO_DIR, { recursive: true })

  // Ensure Playwright has an ffmpeg binary available (reuse system ffmpeg if needed)
  try {
    const pwFfmpegDir = resolve(
      process.env.LOCALAPPDATA || '',
      'ms-playwright',
      'ffmpeg-1013'
    )
    const pwFfmpegExe = resolve(pwFfmpegDir, 'ffmpeg-win64.exe')
    if (process.platform === 'win32' && !existsSync(pwFfmpegExe)) {
      const sysFfmpeg = execFileSync('where.exe', ['ffmpeg'], { encoding: 'utf8' })
        .split(/\r?\n/)[0]
        ?.trim()
      if (sysFfmpeg && existsSync(sysFfmpeg)) {
        mkdirSync(pwFfmpegDir, { recursive: true })
        const { copyFileSync } = await import('fs')
        copyFileSync(sysFfmpeg, pwFfmpegExe)
        console.log(`[demo] Linked system FFmpeg for Playwright video recorder`)
      }
    }
  } catch {
    // ignore if non-windows or already installed
  }

  const viteProcess = await startViteServer()

  let browser
  try {
    console.log('[demo] Launching headless browser...')
    try {
      browser = await chromium.launch({ channel: 'msedge', headless: true })
    } catch {
      browser = await chromium.launch({ channel: 'chrome', headless: true })
    }

    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      recordVideo: {
        dir: TMP_VIDEO_DIR,
        size: VIEWPORT
      }
    })

    await context.addInitScript(getInitScript())
    const page = await context.newPage()

    console.log('[demo] Loading application UI...')
    await page.goto(DEV_URL, { waitUntil: 'networkidle' })
    await sleep(600)

    // Save clean static screenshot (without cursor overlay) for main.png
    await page.evaluate(() => {
      const c = document.getElementById('demo-cursor')
      if (c) c.style.display = 'none'
    })
    const mainPngPath = resolve(ASSETS_DIR, 'main.png')
    await page.screenshot({ path: mainPngPath })
    console.log(`[demo] Updated static screenshot: ${mainPngPath}`)
    await page.evaluate(() => {
      const c = document.getElementById('demo-cursor')
      if (c) c.style.display = 'block'
    })

    // --- SCENE 1: Upload Tab & Drag-and-Drop / Click to Upload ---
    console.log('[demo] Scene 1: Triggering image upload & compression preview...')
    await sleep(500)
    await moveAndClick(page, '#dropzone', { offsetY: -15, waitBeforeClick: 500, waitAfterClick: 1100 })

    // --- SCENE 2: Pre-Upload Compression Preview Dialog ---
    console.log('[demo] Scene 2: Confirming processed image upload (74% savings)...')
    await sleep(650)
    const confirmBtn = page.locator('.processing-dialog__actions .btn--primary')
    await moveAndClick(page, confirmBtn, { waitBeforeClick: 500, waitAfterClick: 1500 })

    // Pause briefly so user sees the uploaded URL card + success Toast
    await moveCursorTo(page, 650, 520, 700)

    // --- SCENE 3: Image Processing Tab ---
    console.log('[demo] Scene 3: Exploring Image Processing settings...')
    await moveAndClick(page, '#nav-image', { waitBeforeClick: 450, waitAfterClick: 700 })
    // Click 50% resize preset to show interactive controls, then back to 75%
    const preset50 = page.locator('.preset-btn', { hasText: '50%' })
    await moveAndClick(page, preset50, { waitBeforeClick: 420, waitAfterClick: 550 })
    const preset75 = page.locator('.preset-btn', { hasText: '75%' })
    await moveAndClick(page, preset75, { waitBeforeClick: 380, waitAfterClick: 700 })

    // --- SCENE 4: Upload History Tab ---
    console.log('[demo] Scene 4: Browsing Upload History & local file tracking...')
    await moveAndClick(page, '#nav-history', { waitBeforeClick: 450, waitAfterClick: 800 })
    const firstCopyBtn = page.locator('.history__item-actions button', { hasText: 'Copy' }).first()
    await moveAndClick(page, firstCopyBtn, { waitBeforeClick: 450, waitAfterClick: 950 })

    // --- SCENE 5: Settings Tab & Light/Dark Theme Switch ---
    console.log('[demo] Scene 5: Exploring Settings, R2 Connection test & Theme switch...')
    await moveAndClick(page, '#nav-settings', { waitBeforeClick: 450, waitAfterClick: 700 })
    await moveAndClick(page, '#test-connection', { waitBeforeClick: 450, waitAfterClick: 1000 })

    // Switch to Light theme and back to Dark theme
    const lightBtn = page.locator('.segmented__option', { hasText: 'Light' })
    await moveAndClick(page, lightBtn, { waitBeforeClick: 450, waitAfterClick: 1050 })
    const darkBtn = page.locator('.segmented__option', { hasText: 'Dark' })
    await moveAndClick(page, darkBtn, { waitBeforeClick: 450, waitAfterClick: 800 })

    // Return to Upload tab for a clean loop transition
    await moveAndClick(page, '#nav-upload', { waitBeforeClick: 420, waitAfterClick: 800 })

    const video = page.video()
    await context.close()
    const rawVideoPath = await video.path()
    console.log(`[demo] Raw video recorded: ${rawVideoPath}`)

    // Convert raw WebM to high-quality GIF and MP4 via FFmpeg
    const gifOutputPath = resolve(ASSETS_DIR, 'demo.gif')
    const mp4OutputPath = resolve(ASSETS_DIR, 'demo.mp4')

    console.log('[demo] Converting video to optimized GIF and MP4 with FFmpeg...')
    // Trim the initial 0.4s loading frame and generate high-fidelity 15fps palette GIF
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-ss',
        '0.45',
        '-i',
        rawVideoPath,
        '-vf',
        'fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=none:diff_mode=rectangle',
        '-loop',
        '0',
        gifOutputPath
      ],
      { stdio: 'inherit' }
    )

    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-ss',
        '0.45',
        '-i',
        rawVideoPath,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-crf',
        '20',
        '-preset',
        'slow',
        '-movflags',
        '+faststart',
        mp4OutputPath
      ],
      { stdio: 'inherit' }
    )

    const gifSizeKB = (statSync(gifOutputPath).size / 1024).toFixed(1)
    const mp4SizeKB = (statSync(mp4OutputPath).size / 1024).toFixed(1)
    console.log(`[demo] Success! Generated:`)
    console.log(`  - GIF: ${gifOutputPath} (${gifSizeKB} KB)`)
    console.log(`  - MP4: ${mp4OutputPath} (${mp4SizeKB} KB)`)
    console.log(`  - PNG: ${mainPngPath}`)
  } finally {
    if (browser) await browser.close()
    if (viteProcess) viteProcess.kill()
    if (existsSync(TMP_VIDEO_DIR)) {
      rmSync(TMP_VIDEO_DIR, { recursive: true, force: true })
    }
  }
}

recordDemo().catch((err) => {
  console.error('[demo] Error recording demo:', err)
  process.exit(1)
})
