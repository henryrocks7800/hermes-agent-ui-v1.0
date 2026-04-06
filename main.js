import { app, BrowserWindow, ipcMain, shell, dialog, Notification } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import http from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

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
  return new Promise(resolve => {
    const req = http.get(`${url}/health`, { timeout: 2000 }, res => {
      resolve(res.statusCode < 400)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
  })
})
