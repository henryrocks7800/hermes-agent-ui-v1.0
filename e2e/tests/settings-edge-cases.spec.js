import { test, expect } from '@playwright/test'

async function seedOnboarded(page, overrides = {}) {
  await page.addInitScript((data) => {
    const entries = {
      'hermes.onboardingCompleted': true,
      'hermes.provider': 'openai',
      'hermes.model': 'gpt-4o',
      'hermes.baseUrl': 'http://localhost:42424/v1',
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

async function openSettings(page, overrides = {}) {
  await seedOnboarded(page, overrides)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
}

test.describe('Settings edge cases and persistence', () => {
  test('saving with empty model auto-selects a provider default', async ({ page }) => {
    await openSettings(page)
    await page.getByRole('tab', { name: 'Connection' }).click()
    await page.getByRole('button', { name: 'openai', exact: true }).click()
    const modelInput = page.getByPlaceholder('Enter model identifier')
    await modelInput.fill('')
    await page.getByRole('button', { name: /apply settings/i }).click()
    await expect(modelInput).not.toHaveValue('')
  })

  test('switching to oauth provider hides required key warning path and shows oauth prompt', async ({ page }) => {
    await openSettings(page)
    await page.getByRole('tab', { name: 'Connection' }).click()
    await page.getByRole('button', { name: 'openai-codex' }).click()
    await expect(page.getByText('Connect with OAuth (Desktop Only)')).toBeVisible()
    await expect(page.getByPlaceholder('sk-... (optional fallback)')).toBeVisible()
  })

  test('lmstudio provider shows base url and hides api credentials', async ({ page }) => {
    await openSettings(page)
    await page.getByRole('tab', { name: 'Connection' }).click()
    await page.getByRole('button', { name: 'lmstudio' }).click()
    await expect(page.getByText('API Base URL')).toBeVisible()
    await expect(page.getByText('API Credentials')).not.toBeVisible()
  })

  test('agent max turns recovers to bounds after extreme edits', async ({ page }) => {
    await openSettings(page)
    await page.getByRole('tab', { name: 'Agent' }).click()
    const input = page.locator('input[type="number"]').first()
    await input.fill('9999')
    await expect(input).toHaveValue('500')
    await input.fill('0')
    await expect(input).toHaveValue('1')
  })

  test('web search toggle can be enabled and disabled without leaving stale field visibility', async ({ page }) => {
    await openSettings(page)
    await page.getByRole('tab', { name: 'Tools' }).click()
    const card = page.locator('.rounded-xl', { hasText: 'Web Search Capabilities' })
    const toggle = card.locator('button[role="switch"]')
    await toggle.click()
    await expect(page.getByText('FIRECRAWL API KEY')).toBeVisible()
    await toggle.click()
    await expect(page.getByText('FIRECRAWL API KEY')).not.toBeVisible()
  })

  test('tts provider selection becomes visible only when tts is enabled', async ({ page }) => {
    await openSettings(page)
    await page.getByRole('tab', { name: 'Tools' }).click()
    await expect(page.getByText('TTS PROVIDER')).not.toBeVisible()
    const card = page.locator('.rounded-xl', { hasText: 'Text-to-Speech Output' })
    await card.locator('button[role="switch"]').click()
    await expect(page.getByText('TTS PROVIDER')).toBeVisible()
  })
})
