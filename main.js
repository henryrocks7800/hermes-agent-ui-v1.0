import electron from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

import { getBackendPath, isDevMode } from './main-utils.js'
import { buildMenuTemplate } from './menu.js'
const execAsync = promisify(exec)

const { app, BrowserWindow, Menu, ipcMain, shell, dialog, Notification } = electron
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isDev = isDevMode()

let mainWindow = null

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
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  mainWindow.loadURL(resolveRenderer())

  if (isDev && !process.env.ELECTRON_DISABLE_DEVTOOLS) mainWindow.webContents.openDevTools()

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  // Install a real application menu before the first window appears so the
  // native top bar (File / Edit / View / Window / Help) has working actions
  // instead of Electron's default placeholder.
  const template = buildMenuTemplate({
    shell,
    app,
    dialog,
    getFocusedWindow: () => BrowserWindow.getFocusedWindow(),
    sendToRenderer: (channel, ...args) => {
      const win = BrowserWindow.getFocusedWindow() || mainWindow
      if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
    },
  })
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  createWindow()
  app.on('activate', () => { if (!mainWindow) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

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

ipcMain.handle('backend:update', async (event) => {
  const hermesPath = path.join(process.env.HOME || process.env.USERPROFILE, '.hermes', 'hermes-agent')

  const send = (msg) => event.sender.send('backend:update-progress', msg)

  try {
    send('Checking for updates...')

    const { stdout: gitOut } = await execAsync('git pull origin main', { cwd: hermesPath })
    send(gitOut.trim() || 'Git pull complete')

    send('Installing latest version...')
    await execAsync('pip install -e . --quiet', { cwd: hermesPath })
    send('Install complete')

    return { success: true, message: 'Hermes Agent updated successfully' }
  } catch (err) {
    return { success: false, message: err.message }
  }
})

// Resolve which backend to spawn for the agent:run IPC. Order of preference:
//   1. The packaged PyInstaller binary at getBackendPath() — this is what the
//      Windows installer is *supposed* to ship. Requires a Windows PyInstaller
//      build of the backend to exist at that location.
//   2. The WSL dev venv at .venv-build/bin/python + bundled-backend/ui-wrapper.py —
//      only useful when running `npm run electron:dev` on this developer's WSL box.
//   3. Null — nothing executable found. Caller should fall back to the HTTP bridge.
// Returns { exePath, args } or null.
function resolveAgentSpawn(query, sessionId) {
  const backend = getBackendPath()
  const backendExe = process.platform === 'win32' ? `${backend}.exe` : backend
  if (fs.existsSync(backendExe)) {
    const args = [query]
    if (sessionId) args.push('--resume', sessionId)
    return { exePath: backendExe, args, mode: 'packaged' }
  }

  // Dev-only fallback: our WSL venv + ui-wrapper.py. Skip on Windows since the
  // hardcoded POSIX path will never exist and spawn will just fail with ENOENT.
  if (isDev && process.platform !== 'win32') {
    const devPython = path.join(__dirname, '.venv-build', 'bin', 'python')
    const wrapperPath = path.join(__dirname, 'bundled-backend', 'ui-wrapper.py')
    if (fs.existsSync(devPython) && fs.existsSync(wrapperPath)) {
      const args = [wrapperPath, query]
      if (sessionId) args.push('--resume', sessionId)
      return { exePath: devPython, args, mode: 'dev-venv' }
    }
  }

  return null
}

// Proxy an agent run to the local HTTP bridge (scripts/hermes-bridge-server.mjs).
// Streams the response body line-by-line back to the renderer on 'agent:stdout'
// and resolves with an exit code that mirrors spawn semantics (0 on success).
async function proxyAgentRunToBridge(event, { query, cwd, env }) {
  const bridgeUrl = process.env.HERMES_BRIDGE_URL || 'http://127.0.0.1:42500'
  try {
    const healthRes = await fetch(`${bridgeUrl}/health`, { signal: AbortSignal.timeout(1500) })
    if (!healthRes.ok) throw new Error(`bridge /health returned ${healthRes.status}`)
  } catch (err) {
    event.sender.send(
      'agent:stderr',
      `No bundled backend found and the local HTTP bridge at ${bridgeUrl} is not reachable.\n` +
      `Either install a build that includes the bundled backend, or start the bridge with:\n` +
      `    npm run bridge\n` +
      `in the hermes-agent-ui-v1.0 repo before sending another message.\n` +
      `(bridge health check: ${err.message})\n`
    )
    return { code: 1 }
  }

  event.sender.send('agent:stdout', `⚙  Bundled backend not found — routing this run through the HTTP bridge at ${bridgeUrl}\n`)

  try {
    const res = await fetch(`${bridgeUrl}/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, cwd, env }),
    })
    if (!res.ok || !res.body) {
      event.sender.send('agent:stderr', `bridge /agent/run returned HTTP ${res.status}\n`)
      return { code: res.status || 1 }
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      event.sender.send('agent:stdout', decoder.decode(value, { stream: true }))
    }
    return { code: 0 }
  } catch (err) {
    event.sender.send('agent:stderr', `bridge proxy error: ${err.message}\n`)
    return { code: 1 }
  }
}

ipcMain.handle('agent:run', async (event, { query, cwd, env, sessionId }) => {
  const debugLog = path.join(app.getPath('userData'), 'hermes-ui-debug.log')
  const appendDebug = (msg) => {
    try { fs.appendFileSync(debugLog, msg) } catch { /* best-effort */ }
  }

  const spawnSpec = resolveAgentSpawn(query, sessionId)
  if (!spawnSpec) {
    appendDebug(`HANDLER START (no backend found) cwd=${cwd || process.cwd()} query=${query}\n`)
    return proxyAgentRunToBridge(event, { query, cwd, env })
  }

  const { exePath, args, mode } = spawnSpec
  appendDebug(`HANDLER START mode=${mode}\nexePath=${exePath}\nargs=${JSON.stringify(args)}\ncwd=${cwd || process.cwd()}\n`)

  const child = spawn(exePath, args, {
    cwd: cwd || process.cwd(),
    env: { ...process.env, ...env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  appendDebug(`spawned pid=${child.pid || 'unknown'}\n`)

  child.stdout?.setEncoding('utf8')
  child.stderr?.setEncoding('utf8')

  child.stdout?.on('data', (data) => {
    appendDebug(data)
    event.sender.send('agent:stdout', data)
  })

  child.on('error', (err) => {
    appendDebug(`SPAWN ERR: ${err.message}\n`)
    event.sender.send('agent:stderr', `Failed to start agent: ${err.message}`)
  })

  child.stderr?.on('data', (data) => {
    appendDebug(`ERR: ${data}`)
    event.sender.send('agent:stderr', data)
  })

  return new Promise((resolve) => {
    child.on('close', (code) => {
      appendDebug(`child close code=${code}\n`)
      resolve({ code })
    })
  })
})
