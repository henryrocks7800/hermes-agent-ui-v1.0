import { test, expect } from '@playwright/test'

const LOCAL_MODEL_URL = 'http://127.0.0.1:42427/v1'

async function seedOnboarded(page, overrides = {}) {
  await page.addInitScript((data) => {
    const entries = {
      'hermes.onboardingCompleted': true,
      'hermes.provider': 'local',
      'hermes.model': 'qwen3-coder-30b',
      'hermes.baseUrl': 'http://127.0.0.1:42427/v1',
      'hermes.backendMode': 'embedded',
      'hermes.externalUrl': 'http://localhost:42424/v1',
      'hermes.projectFolder': '/home/user/project',
      'hermes.maxTurns': 90,
      'hermes.reasoningEffort': 'medium',
      'hermes.toolProgress': 'all',
      ...data,
    }
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }, overrides)
}

async function openApp(page, overrides = {}) {
  await seedOnboarded(page, overrides)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

test.describe('Chat edge cases and persistence', () => {
  test('enter sends and shift-enter preserves multiline draft', async ({ page }) => {
    await openApp(page)
    const composer = page.locator('textarea').first()

    await composer.fill('line one')
    await composer.press('Shift+Enter')
    await composer.type('line two')
    await expect(composer).toHaveValue('line one\nline two')

    await composer.press('Enter')
    await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: 'line one' })).toBeVisible()
    await expect(composer).toHaveValue('')
  })

  test('whitespace-only draft does not enable send', async ({ page }) => {
    await openApp(page)
    const composer = page.locator('textarea').first()
    await composer.fill('   ')
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  test('escape clears slash trigger text', async ({ page }) => {
    await openApp(page)
    const composer = page.locator('textarea').first()
    await composer.fill('/mod')
    await expect(page.getByText('/model', { exact: true })).toBeVisible()
    await composer.press('Escape')
    await expect(composer).toHaveValue('')
  })

  test('escape clears context trigger text', async ({ page }) => {
    await openApp(page)
    const composer = page.locator('textarea').first()
    await composer.fill('@file')
    await composer.press('Escape')
    await expect(composer).toHaveValue('')
  })

  test('new thread button keeps existing thread accessible in sidebar', async ({ page }) => {
    await openApp(page)
    const composer = page.locator('textarea').first()
    await composer.fill('Persist me')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByRole('button', { name: 'Persist me' })).toBeVisible()

    await page.getByRole('button', { name: /new thread/i }).click()
    await expect(page.getByText('New Session')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Persist me' })).toBeVisible()
  })

  test('thread selection loads historical messages from seeded state', async ({ page }) => {
    await openApp(page, {
      'hermes.threads': [
        { id: '1', title: 'Alpha', createdAt: '2026-04-19T09:00:00.000Z', messages: [{ role: 'user', content: 'alpha message' }] },
        { id: '2', title: 'Beta', createdAt: '2026-04-19T08:00:00.000Z', messages: [{ role: 'user', content: 'beta message' }] }
      ],
      'hermes.activeThreadId': '1',
    })
    await page.getByRole('button', { name: 'Beta' }).click()
    await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: 'beta message' })).toBeVisible()
  })

  test('failed stream diagnostic shows attempted URL', async ({ page }) => {
    await openApp(page, {
      'hermes.baseUrl': 'http://127.0.0.1:9/v1',
      'hermes.provider': 'local',
      'hermes.model': 'broken-local',
    })
    const composer = page.locator('textarea').first()
    await composer.fill('diagnose failure')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('Technical Diagnostic')).toBeVisible()
    await expect(page.getByRole('code')).toContainText('http://127.0.0.1:9/v1')
  })

  test('connection badge renders disconnected state for unreachable configured local model', async ({ page }) => {
    await openApp(page, {
      'hermes.baseUrl': LOCAL_MODEL_URL,
      'hermes.provider': 'local',
      'hermes.model': 'qwen3-coder-30b',
    })
    await expect(page.getByText(/connected|disconnected/i).first()).toBeVisible()
  })

  test('send stays disabled until a workspace folder is present', async ({ page }) => {
    await openApp(page, {
      'hermes.projectFolder': '',
    })
    await page.locator('textarea').first().fill('Build me an app')
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled()
    await expect(page.getByText('Workspace required')).toBeVisible()
  })
})
