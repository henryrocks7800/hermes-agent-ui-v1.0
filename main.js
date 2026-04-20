import electron from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

import { getBackendPath, isDevMode } from './main-utils.js'
const execAsync = promisify(exec)

const { app, BrowserWindow, ipcMain, shell, dialog, Notification } = electron
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

  if (isDev) mainWindow.webContents.openDevTools()

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
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

ipcMain.handle('agent:run', async (event, { query, cwd, env, sessionId }) => {
  const exePath = '/home/henry/.hermes/hermes-agent-ui-v1.0/.venv-build/bin/python'
  const wrapperPath = path.join(app.getAppPath(), 'bundled-backend', 'ui-wrapper.py')

  fs.appendFileSync('/tmp/hermes-ui-debug.log', `HANDLER START\nexePath=${exePath}\nwrapperPath=${wrapperPath}\ncwd=${cwd || process.cwd()}\nquery=${query}\n`)

  const args = [wrapperPath, query]
  if (sessionId) args.push('--resume', sessionId)
  fs.appendFileSync('/tmp/hermes-ui-debug.log', `args=${JSON.stringify(args)}\n`)

  const child = spawn(exePath, args, {
    cwd: cwd || process.cwd(),
    env: { ...process.env, ...env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  fs.appendFileSync('/tmp/hermes-ui-debug.log', `spawned pid=${child.pid || 'unknown'}\n`)

  child.stdout?.setEncoding('utf8')
  child.stderr?.setEncoding('utf8')

  child.stdout?.on('data', (data) => {
    fs.appendFileSync('/tmp/hermes-ui-debug.log', data)
    event.sender.send('agent:stdout', data)
  })

  child.on('error', (err) => {
    const msg = `SPAWN ERR: ${err.message}\n`
    fs.appendFileSync('/tmp/hermes-ui-debug-err.log', msg)
    event.sender.send('agent:stderr', `Failed to start agent: ${err.message}`)
  })

  child.stderr?.on('data', (data) => {
    fs.appendFileSync('/tmp/hermes-ui-debug-err.log', data)
    event.sender.send('agent:stderr', data)
  })

  return new Promise((resolve) => {
    child.on('close', (code) => {
      fs.appendFileSync('/tmp/hermes-ui-debug.log', `child close code=${code}\n`)
      resolve({ code })
    })
  })
})
