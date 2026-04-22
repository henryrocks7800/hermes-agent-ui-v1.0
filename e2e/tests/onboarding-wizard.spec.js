// End-to-end test for the onboarding wizard.
//
// Spec the test enforces, derived from the "further requirements" on the
// wizard after removing the old Tools step:
//   1. A fresh user (no onboardingCompleted in storage) lands on the
//      welcome screen, NOT on the chat UI.
//   2. The welcome screen no longer advertises a "Tools" step — that
//      step was moved entirely to Settings.
//   3. The visible progress indicator has exactly 2 dots (Provider +
//      Agent Settings), not 3.
//   4. Walking through the wizard with local provider + a real model
//      reaches the completion screen with the expected summary.
//   5. Clicking "Start Chatting" lands the user in the main chat page
//      AND persists the settings (so a subsequent reload does not
//      re-open the wizard).
//   6. The removed tools keys (webSearchEnabled, firecrawlApiKey,
//      visionEnabled, ttsEnabled, ttsProvider) are NOT written to
//      localStorage by the wizard.
//   7. The "Skip for now" path also clears the wizard without writing
//      the removed keys.

import { test, expect } from '@playwright/test'

// Override the default 10-minute-per-test budget. The wizard flow is
// synchronous UI work and should finish in a couple of seconds; any
// 30-second test is a broken selector, not slow work.
test.describe.configure({ timeout: 30_000 })

// Local LLM that the user confirmed is up at 172.30.224.1:42427 (LM Studio on
// the Windows host, reachable from WSL via the default gateway). The wizard
// doesn't actually hit the LLM during this flow — it just persists the URL —
// but using a real reachable URL keeps the integration honest.
const LOCAL_BASE_URL = 'http://172.30.224.1:42427/v1'
const LOCAL_MODEL = 'qwen3-coder-30b'

// The Local-provider button renders its label and sublabel as two nested
// divs, so the button's accessible name is "Local Hermes, Ollama, ..." —
// a plain /^Local$/ filter never matches. Match the whole visible text
// instead (sublabel starts with "Hermes," which only appears on the
// Local button).
const LOCAL_PROVIDER_BUTTON = /^Local\s+Hermes,/

async function openFreshWizard(page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.reload()
  await page.waitForSelector('[data-testid="onboarding-wizard"]', { timeout: 10_000 })
}

test.describe('onboarding wizard', () => {
  test('new user sees the wizard, not the chat UI', async ({ page }) => {
    await openFreshWizard(page)
    await expect(page.getByRole('heading', { name: /Hermes Agent Setup/i })).toBeVisible()
    // Main chat textarea must not be present yet.
    await expect(page.locator('textarea')).toHaveCount(0)
  })

  test('welcome screen no longer advertises a "Tools" step', async ({ page }) => {
    await openFreshWizard(page)
    const covered = page.locator('text=/What we.ll cover/i').locator('..')
    await expect(covered).not.toContainText(/Tools \(optional\)/i)
    await expect(covered).toContainText(/AI Provider/i)
    await expect(covered).toContainText(/Agent Settings/i)
  })

  test('progress indicator has exactly 2 dots (Provider + Agent)', async ({ page }) => {
    await openFreshWizard(page)
    await page.getByRole('button', { name: /Begin Setup/i }).click()
    const dots = page.locator('[data-testid="wizard-progress"] > div')
    await expect(dots).toHaveCount(2)
  })

  test('completes the wizard end-to-end, lands on chat, persists settings', async ({ page }) => {
    await openFreshWizard(page)
    await page.getByRole('button', { name: /Begin Setup/i }).click()

    // Step 1: Provider
    await page.getByRole('button', { name: LOCAL_PROVIDER_BUTTON }).click()
    // The "Base URL" <label> isn't linked to the <Input> via htmlFor, so
    // getByLabel() can't find it. Select by the placeholder that comes from
    // PROVIDER_URLS.local ("http://127.0.0.1:42427/v1") — unique to the
    // Local provider in the ProviderStep.
    const baseUrlInput = page.getByPlaceholder(/127\.0\.0\.1:42427/)
    await baseUrlInput.fill(LOCAL_BASE_URL)
    await page.getByPlaceholder(/Enter model name/i).fill(LOCAL_MODEL)
    await page.getByRole('button', { name: /^Next/i }).click()

    // Step 2: Agent Settings — accept defaults.
    await page.getByRole('button', { name: /^Next/i }).click()

    // Step 3: Completion (the Tools step is gone, so Next on Agent Settings
    // must deposit us on the completion screen directly).
    await expect(page.getByRole('heading', { name: /You.re all set/i })).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /Start Chatting/i }).click()

    // Must now be in the chat UI — textarea present, wizard gone.
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toHaveCount(0)
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5_000 })

    // Storage: expected keys present.
    const persisted = await page.evaluate(() => ({
      done: localStorage.getItem('hermes.onboardingCompleted'),
      provider: localStorage.getItem('hermes.provider'),
      model: localStorage.getItem('hermes.model'),
      baseUrl: localStorage.getItem('hermes.baseUrl'),
    }))
    expect(persisted.done).toBe('true')
    expect(persisted.provider).toBe(JSON.stringify('local'))
    expect(persisted.model).toBe(JSON.stringify(LOCAL_MODEL))
    expect(persisted.baseUrl).toBe(JSON.stringify(LOCAL_BASE_URL))

    // Storage: none of the removed tools keys.
    const toolsKeys = await page.evaluate(() => [
      'hermes.webSearchEnabled',
      'hermes.firecrawlApiKey',
      'hermes.visionEnabled',
      'hermes.ttsEnabled',
      'hermes.ttsProvider',
    ].map(k => ({ key: k, value: localStorage.getItem(k) })))
    for (const { key, value } of toolsKeys) {
      expect(value, `wizard must not write ${key}`).toBeNull()
    }

    // A hard reload should stay on chat, not re-open the wizard.
    await page.reload()
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toHaveCount(0)
  })

  test('"Skip for now" dismisses the wizard without writing removed tools keys', async ({ page }) => {
    await openFreshWizard(page)
    await page.getByRole('button', { name: /Skip for now/i }).click()
    await expect(page.locator('[data-testid="onboarding-wizard"]')).toHaveCount(0)

    const toolsKeysWritten = await page.evaluate(() => [
      'hermes.webSearchEnabled',
      'hermes.firecrawlApiKey',
      'hermes.visionEnabled',
      'hermes.ttsEnabled',
      'hermes.ttsProvider',
    ].some(k => localStorage.getItem(k) !== null))
    expect(toolsKeysWritten).toBe(false)

    // onboardingCompleted must still be set so reload doesn't re-open it.
    const done = await page.evaluate(() => localStorage.getItem('hermes.onboardingCompleted'))
    expect(done).toBe('true')
  })

  test('Back button on Agent Settings returns to Provider step (no lost state)', async ({ page }) => {
    await openFreshWizard(page)
    await page.getByRole('button', { name: /Begin Setup/i }).click()
    await page.getByRole('button', { name: LOCAL_PROVIDER_BUTTON }).click()
    await page.getByPlaceholder(/Enter model name/i).fill(LOCAL_MODEL)
    await page.getByRole('button', { name: /^Next/i }).click()

    // Back from Agent Settings -> Provider.
    await page.getByRole('button', { name: /Back/i }).click()
    // Model field should still hold the value we typed.
    await expect(page.getByPlaceholder(/Enter model name/i)).toHaveValue(LOCAL_MODEL)
  })
})
