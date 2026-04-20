import { test, expect } from '@playwright/test'

const skipOnboarding = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('hermes.onboardingCompleted', JSON.stringify(true))
    localStorage.setItem('hermes.provider', JSON.stringify('openai'))
    localStorage.setItem('hermes.model', JSON.stringify('gpt-4o'))
    localStorage.setItem('hermes.backendMode', JSON.stringify('embedded'))
    localStorage.setItem('hermes.projectFolder', JSON.stringify('/home/user/project'))
  })
}

test.describe('Onboarding', () => {
  test('shows welcome screen on first load', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Begin Setup')).toBeVisible()
    await expect(page).toHaveScreenshot('onboarding-welcome.png', { maxDiffPixelRatio: 0.02 })
  })

  test('step 1 — provider selection', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Begin Setup').click()
    await expect(page.getByText('AI Provider & Model')).toBeVisible()
    await expect(page).toHaveScreenshot('onboarding-step1.png', { maxDiffPixelRatio: 0.02 })
  })

  test('can select a provider', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Begin Setup').click()
    await page.getByText('OpenAI', { exact: true }).click()
    await expect(page).toHaveScreenshot('onboarding-step1-openai.png', { maxDiffPixelRatio: 0.02 })
  })
})

test.describe('Main UI', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('renders sidebar and main area', async ({ page }) => {
    await expect(page.getByText('New thread', { exact: true })).toBeVisible()
    await expect(page).toHaveScreenshot('main-ui.png', { maxDiffPixelRatio: 0.02 })
  })

  test('sidebar navigation — Threads', async ({ page }) => {
    await page.getByRole('button', { name: /threads/i }).click()
    await expect(page).toHaveScreenshot('page-threads.png', { maxDiffPixelRatio: 0.02 })
  })

  test('sidebar navigation — Settings', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click()
    await expect(page).toHaveScreenshot('page-settings.png', { maxDiffPixelRatio: 0.02 })
  })

  test('slash command typeahead appears on /', async ({ page }) => {
    const composer = page.locator('textarea').first()
    await composer.click()
    await composer.type('/')
    await expect(page.getByText('/new', { exact: true })).toBeVisible()
    await expect(page).toHaveScreenshot('slash-command-menu.png', { maxDiffPixelRatio: 0.02 })
  })

  test('slash command filters as you type', async ({ page }) => {
    const composer = page.locator('textarea').first()
    await composer.click()
    await composer.type('/mo')
    await expect(page.getByText('/model', { exact: true })).toBeVisible()
    await expect(page).toHaveScreenshot('slash-command-filtered.png', { maxDiffPixelRatio: 0.02 })
  })

  test('new thread button works', async ({ page }) => {
    await page.getByRole('button', { name: /new thread/i }).click()
    await expect(page).toHaveScreenshot('new-thread.png', { maxDiffPixelRatio: 0.02 })
  })

  test('no errors in console on load', async ({ page }) => {
    const errors = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await page.reload()
    await page.waitForLoadState('networkidle')
    const real = errors.filter(e => !e.includes('favicon') && !e.includes('net::ERR'))
    expect(real).toHaveLength(0)
  })
})