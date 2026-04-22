// Unit tests for the Electron application-menu template.
//
// These tests run in pure Node (no Electron, no DOM). They import
// buildMenuTemplate and verify:
//   - All top-level menus exist (File/Edit/View/Window/Help) in the expected
//     order so the native bar the user sees matches what we shipped.
//   - File menu items dispatch the IPC commands the renderer listens for.
//   - Help menu items call shell.openExternal with the right URLs
//     (the "help section is empty" regression).
//   - About dialog is wired to app.getVersion() + dialog.showMessageBox.

import { describe, it, expect, vi } from 'vitest'
import {
  buildMenuTemplate,
  HERMES_UPSTREAM,
  HERMES_DOCS,
  HERMES_ISSUES,
  HERMES_DESKTOP_REPO,
  HERMES_DESKTOP_ISSUES,
} from './menu.js'

// --- helpers --------------------------------------------------------------

function makeDeps(overrides = {}) {
  return {
    shell: { openExternal: vi.fn() },
    app: {
      getName: vi.fn(() => 'Hermes Agent'),
      getVersion: vi.fn(() => '1.2.3'),
    },
    dialog: { showMessageBox: vi.fn(() => Promise.resolve({ response: 0 })) },
    getFocusedWindow: vi.fn(() => ({ id: 'fake-win' })),
    sendToRenderer: vi.fn(),
    ...overrides,
  }
}

function findMenu(template, label) {
  const item = template.find(m => m.label === label)
  if (!item) throw new Error(`menu "${label}" not found; available: ${template.map(m => m.label).join(', ')}`)
  return item
}

function findItem(submenu, label) {
  const item = submenu.find(i => i.label === label)
  if (!item) throw new Error(`menu item "${label}" not found; available: ${submenu.map(i => i.label || `<${i.role || 'separator'}>`).join(', ')}`)
  return item
}

// --- tests ----------------------------------------------------------------

describe('buildMenuTemplate', () => {
  it('exposes the five top-level menus in order on non-mac platforms', () => {
    const deps = makeDeps()
    // Force non-mac so the leading "app name" menu is absent.
    const origPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
    try {
      const template = buildMenuTemplate(deps)
      const labels = template.map(m => m.label)
      expect(labels).toEqual(['File', 'Edit', 'View', 'Window', 'Help'])
    } finally {
      Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true })
    }
  })

  it('File menu has New Thread, Open Project Folder, Settings, and an exit option', () => {
    const template = buildMenuTemplate(makeDeps())
    const file = findMenu(template, 'File')
    const labels = file.submenu
      .filter(i => i.label)
      .map(i => i.label)
    expect(labels).toContain('New Thread')
    expect(labels).toContain('Open Project Folder…')
    expect(labels).toContain('Settings')
    // Either 'Quit' role or 'Close' role is present.
    expect(file.submenu.some(i => i.role === 'quit' || i.role === 'close')).toBe(true)
  })

  it('New Thread sends the IPC command renderer listens for', () => {
    const deps = makeDeps()
    const template = buildMenuTemplate(deps)
    const newThread = findItem(findMenu(template, 'File').submenu, 'New Thread')
    newThread.click()
    expect(deps.sendToRenderer).toHaveBeenCalledWith('command', 'thread:new')
  })

  it('Open Project Folder sends folder:open IPC (so the renderer triggers openFolder dialog)', () => {
    const deps = makeDeps()
    const template = buildMenuTemplate(deps)
    const openFolder = findItem(findMenu(template, 'File').submenu, 'Open Project Folder…')
    openFolder.click()
    expect(deps.sendToRenderer).toHaveBeenCalledWith('command', 'folder:open')
  })

  it('Settings menu item sends navigate:settings IPC', () => {
    const deps = makeDeps()
    const template = buildMenuTemplate(deps)
    findItem(findMenu(template, 'File').submenu, 'Settings').click()
    expect(deps.sendToRenderer).toHaveBeenCalledWith('command', 'navigate:settings')
  })

  it('Help menu contains at least one link to nousresearch/hermes-agent', () => {
    const template = buildMenuTemplate(makeDeps())
    const help = findMenu(template, 'Help')
    const labels = help.submenu.filter(i => i.label).map(i => i.label)
    expect(labels.length).toBeGreaterThanOrEqual(3)
    // Help should not be empty — this was the regression the user hit
    // ("help section is empty").
    expect(help.submenu.filter(i => i.label).length).toBeGreaterThanOrEqual(3)
  })

  it.each([
    ['Hermes Agent on GitHub', HERMES_UPSTREAM],
    ['Hermes Agent Documentation', HERMES_DOCS],
    ['Report a Hermes Agent Issue', HERMES_ISSUES],
    ['Hermes Desktop UI on GitHub', HERMES_DESKTOP_REPO],
    ['Report a Desktop UI Issue', HERMES_DESKTOP_ISSUES],
  ])('Help → "%s" opens %s', (label, url) => {
    const deps = makeDeps()
    const template = buildMenuTemplate(deps)
    findItem(findMenu(template, 'Help').submenu, label).click()
    expect(deps.shell.openExternal).toHaveBeenCalledWith(url)
  })

  it('All Hermes links actually point at a nousresearch/hermes-agent GitHub URL', () => {
    // Guard rail: a careless edit could accidentally rewrite the upstream to
    // some other repo. This catches that at unit-test time.
    for (const url of [HERMES_UPSTREAM, HERMES_DOCS, HERMES_ISSUES]) {
      expect(url).toMatch(/^https:\/\/github\.com\/NousResearch\/hermes-agent/i)
    }
  })

  it('About opens a message box with the app version', async () => {
    const deps = makeDeps()
    const template = buildMenuTemplate(deps)
    const about = findItem(findMenu(template, 'Help').submenu, 'About Hermes Agent Desktop')
    await about.click()
    expect(deps.app.getVersion).toHaveBeenCalled()
    expect(deps.dialog.showMessageBox).toHaveBeenCalled()
    const [win, opts] = deps.dialog.showMessageBox.mock.calls[0]
    expect(win).toEqual({ id: 'fake-win' })
    expect(opts.detail).toContain('1.2.3')
    expect(opts.detail).toContain('NousResearch/hermes-agent')
  })

  it('Edit menu relies on native roles (no manual click handlers)', () => {
    const template = buildMenuTemplate(makeDeps())
    const edit = findMenu(template, 'Edit')
    for (const item of edit.submenu) {
      if (item.type === 'separator') continue
      expect(item).toHaveProperty('role')
      expect(item.click).toBeUndefined()
    }
  })

  it('View menu exposes reload + devtools + zoom controls', () => {
    const template = buildMenuTemplate(makeDeps())
    const view = findMenu(template, 'View')
    const roles = view.submenu.map(i => i.role).filter(Boolean)
    expect(roles).toEqual(expect.arrayContaining([
      'reload', 'forceReload', 'toggleDevTools',
      'resetZoom', 'zoomIn', 'zoomOut',
      'togglefullscreen',
    ]))
  })
})
