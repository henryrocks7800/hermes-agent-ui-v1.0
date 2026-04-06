import { app, BrowserWindow, ipcMain, shell, dialog, Notification } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const HERMES_PORT = 8642
const HERMES_API_URL = `http://localhost:${HERMES_PORT}`

let mainWindow = null
let hermesProcess = null

function resolveRenderer() {
  if (isDev) return 'http://localhost:5173'
  const distPath = path.join(process.resourcesPath, '../web-dist/index.html')
  if (fs.existsSync(distPath)) return `file://${distPath}`
  const localPath = path.join(__dirname, 'web-dist', 'index.html')
  return `file://${localPath}`
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#09090b',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  mainWindow.loadURL(resolveRenderer())

  if (isDev) mainWindow.webContents.openDevTools()

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── Hermes Agent gateway lifecycle ─────────────────────────────────────────────

function getHermesDir() {
  // Check bundled backend first, then user's local install
  const bundled = path.join(process.resourcesPath || __dirname, 'hermes-backend')
  if (fs.existsSync(path.join(bundled, 'hermes'))) return bundled
  const local = path.join(process.env.HOME || process.env.USERPROFILE, '.hermes', 'hermes-agent')
  if (fs.existsSync(path.join(local, 'hermes'))) return local
  return null
}

function findPython() {
  // On Windows, python3 usually doesn't exist — try python and py first
  if (process.platform === 'win32') {
    for (const cmd of ['python', 'py', 'python3']) {
      try {
        const { status } = require('child_process').spawnSync(cmd, ['--version'], { stdio: 'ignore' })
        if (status === 0) return cmd
      } catch { /* not found, try next */ }
    }
  }
  return 'python3'
}

async function isHermesRunning() {
  try {
    const res = await fetch(`${HERMES_API_URL}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch { return false }
}

async function startHermesGateway() {
  if (await isHermesRunning()) {
    console.log('[Hermes] Gateway already running on port', HERMES_PORT)
    return
  }

  const hermesDir = getHermesDir()
  if (!hermesDir) {
    console.warn('[Hermes] No Hermes Agent installation found — running in UI-only mode')
    return
  }

  console.log('[Hermes] Starting gateway from', hermesDir)

  const logDir = path.join(process.env.HOME || process.env.USERPROFILE, '.hermes', 'logs')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  const logStream = fs.createWriteStream(path.join(logDir, 'gateway-desktop.log'), { flags: 'a' })

  const python = findPython()
  console.log('[Hermes] Using Python:', python)

  hermesProcess = spawn(python, [path.join(hermesDir, 'hermes'), 'gateway', 'run', '--quiet'], {
    cwd: hermesDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    env: { ...process.env, API_SERVER_PORT: String(HERMES_PORT) },
  })

  hermesProcess.stdout.pipe(logStream)
  hermesProcess.stderr.pipe(logStream)

  hermesProcess.on('error', (err) => {
    console.error('[Hermes] Failed to start gateway:', err.message)
    hermesProcess = null
  })

  hermesProcess.on('exit', (code) => {
    console.log('[Hermes] Gateway exited with code', code)
    hermesProcess = null
  })

  // Wait up to 10s for the API server to become available
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500))
    if (await isHermesRunning()) {
      console.log('[Hermes] Gateway ready on port', HERMES_PORT)
      return
    }
  }
  console.warn('[Hermes] Gateway started but health check not responding yet')
}

function stopHermesGateway() {
  if (!hermesProcess) return
  console.log('[Hermes] Shutting down gateway (PID', hermesProcess.pid + ')')
  try {
    hermesProcess.kill('SIGTERM')
  } catch (err) {
    console.error('[Hermes] Error stopping gateway:', err.message)
  }
  hermesProcess = null
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  await startHermesGateway()
  createWindow()
  app.on('activate', () => { if (!mainWindow) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

app.on('before-quit', () => {
  stopHermesGateway()
})

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('app:getVersion', () => app.getVersion())

ipcMain.handle('app:checkForUpdates', () => {
  shell.openExternal('https://github.com/henryrocks7800/hermes-agent-desktop/releases')
})

ipcMain.handle('app:openExternal', (_, url) => shell.openExternal(url))

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openFile', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters ?? [{ name: 'All Files', extensions: ['*'] }],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('app:notify', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
})

ipcMain.handle('config:read', async () => {
  const configPath = path.join(app.getPath('userData'), 'backend-config.json')
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch { return null }
})

ipcMain.handle('config:write', async (_, data) => {
  const configPath = path.join(app.getPath('userData'), 'backend-config.json')
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8')
  return true
})

// Backend health check
ipcMain.handle('backend:health', async (_, url) => {
  try {
    const res = await fetch(`${url}/models`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch (err) {
    return false
  }
})

// Hermes gateway status
ipcMain.handle('hermes:status', async () => {
  const running = await isHermesRunning()
  const installed = !!getHermesDir()
  return { running, installed, port: HERMES_PORT, url: `${HERMES_API_URL}/v1` }
})

ipcMain.handle('hermes:restart', async () => {
  stopHermesGateway()
  await new Promise(r => setTimeout(r, 1000))
  await startHermesGateway()
  return await isHermesRunning()
})

ipcMain.handle('backend:update', async (event) => {
  const hermesPath = getHermesDir()
  const send = (msg) => event.sender.send('backend:update-progress', msg)

  if (!hermesPath) {
    send('No Hermes Agent installation found.')
    send('Run "npm run build:backend" to clone and install it.')
    return { success: false, message: 'Hermes Agent not installed' }
  }

  try {
    send(`Updating from: ${hermesPath}`)
    send('Pulling latest from GitHub...')

    const { stdout: gitOut } = await execAsync('git pull origin main', { cwd: hermesPath })
    send(gitOut.trim() || 'Git pull complete')

    send('Reinstalling dependencies...')
    const pipCmd = process.platform === 'win32' ? 'pip' : 'pip3'
    await execAsync(`${pipCmd} install -e . --quiet`, { cwd: hermesPath })
    send('Install complete')

    send('Restarting gateway...')
    stopHermesGateway()
    await new Promise(r => setTimeout(r, 1000))
    await startHermesGateway()
    const running = await isHermesRunning()
    send(running ? 'Gateway restarted successfully' : 'Gateway started (health check pending)')

    return { success: true, message: 'Hermes Agent updated and restarted' }
  } catch (err) {
    return { success: false, message: err.message }
  }
})
