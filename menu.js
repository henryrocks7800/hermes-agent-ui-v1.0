// Electron application menu template for Hermes Agent Desktop.
//
// Kept as a pure function so it can be unit-tested without spinning up
// Electron. `deps` lets the test inject stubs for `shell`, `app`, `dialog`,
// and `getFocusedWindow()`; real main.js passes the Electron equivalents.

// Canonical upstream URLs — single source of truth for "Help" menu items
// so the test and the running app agree.
export const HERMES_UPSTREAM = 'https://github.com/NousResearch/hermes-agent'
export const HERMES_DOCS = 'https://github.com/NousResearch/hermes-agent#readme'
export const HERMES_ISSUES = 'https://github.com/NousResearch/hermes-agent/issues'
export const HERMES_DESKTOP_REPO = 'https://github.com/henryrocks7800/hermes-agent-desktop'
export const HERMES_DESKTOP_ISSUES = 'https://github.com/henryrocks7800/hermes-agent-desktop/issues'

/**
 * Build the application-menu template.
 *
 * @param {object} deps
 * @param {object} deps.shell              - electron.shell (needs openExternal)
 * @param {object} deps.app                - electron.app (needs getVersion, quit)
 * @param {object} deps.dialog             - electron.dialog (needs showMessageBox)
 * @param {() => object|null} deps.getFocusedWindow - returns current BrowserWindow
 * @param {(channel: string, ...args: any[]) => void} deps.sendToRenderer - send IPC
 * @returns {Array} MenuItemConstructorOptions array
 */
export function buildMenuTemplate(deps) {
  const { shell, app, dialog, getFocusedWindow, sendToRenderer } = deps
  const isMac = process.platform === 'darwin'

  const sendCommand = (cmd) => sendToRenderer('command', cmd)

  /** @type {Array} */
  const template = []

  if (isMac) {
    template.push({
      label: app.getName ? app.getName() : 'Hermes Agent',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })
  }

  template.push({
    label: 'File',
    submenu: [
      {
        label: 'New Thread',
        accelerator: 'CmdOrCtrl+N',
        click: () => sendCommand('thread:new'),
      },
      {
        label: 'Open Project Folder…',
        accelerator: 'CmdOrCtrl+O',
        click: () => sendCommand('folder:open'),
      },
      { type: 'separator' },
      {
        label: 'Settings',
        accelerator: 'CmdOrCtrl+,',
        click: () => sendCommand('navigate:settings'),
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  })

  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  })

  template.push({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  })

  template.push({
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' },
    ],
  })

  template.push({
    label: 'Help',
    submenu: [
      {
        label: 'Hermes Agent on GitHub',
        click: () => shell.openExternal(HERMES_UPSTREAM),
      },
      {
        label: 'Hermes Agent Documentation',
        click: () => shell.openExternal(HERMES_DOCS),
      },
      {
        label: 'Report a Hermes Agent Issue',
        click: () => shell.openExternal(HERMES_ISSUES),
      },
      { type: 'separator' },
      {
        label: 'Hermes Desktop UI on GitHub',
        click: () => shell.openExternal(HERMES_DESKTOP_REPO),
      },
      {
        label: 'Report a Desktop UI Issue',
        click: () => shell.openExternal(HERMES_DESKTOP_ISSUES),
      },
      { type: 'separator' },
      {
        label: 'About Hermes Agent Desktop',
        click: async () => {
          const version = app.getVersion ? app.getVersion() : 'unknown'
          const detail =
            `Hermes Agent Desktop v${version}\n\n` +
            `A chat-style front-end for Hermes Agent. The engine, tools, ` +
            `and transcript all come from the upstream Hermes Agent project ` +
            `at NousResearch/hermes-agent.\n\n` +
            `This window is the renderer; agent runs happen in a Python ` +
            `subprocess (ui-wrapper.py → run_agent.py).`
          await dialog.showMessageBox(getFocusedWindow(), {
            type: 'info',
            title: 'About Hermes Agent Desktop',
            message: 'Hermes Agent Desktop',
            detail,
            buttons: ['OK'],
          })
        },
      },
    ],
  })

  return template
}
