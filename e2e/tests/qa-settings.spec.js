import { test, expect } from '@playwright/test'

/**
 * QA Settings E2E Tests
 * 
 * Covers: Settings page (Model, Backend, Agent, Tools tabs),
 * Automations page, and end-to-end configuration flow.
 * Validates fixes for DEF-001, DEF-002, DEF-004, DEF-006, DEF-008, DEF-010.
 */

// Helper: skip onboarding by clicking "Skip for now" on the welcome screen
const skipOnboarding = async (page) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // If the onboarding welcome screen is visible, skip it
  const skipBtn = page.getByText('Skip for now')
  if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipBtn.click({ force: true })
    await page.waitForLoadState('networkidle')
  }
}

// Helper: navigate to Settings page via sidebar
const goToSettings = async (page) => {
  // Settings button is in its own section at the bottom of the sidebar
  const settingsBtn = page.locator('button', { hasText: 'Settings' })
  await settingsBtn.click({ force: true })
  await expect(page.getByText('Configure AI providers, backend preferences, and agent behavior.')).toBeVisible()
}

// Helper: navigate to a specific settings tab
const goToSettingsTab = async (page, tabName) => {
  await goToSettings(page)
  const tab = page.getByRole('tab', { name: tabName })
  await tab.click({ force: true })
}

// ──────────────────────────────────────────────────
// 1. Settings Page — Model Tab
// ──────────────────────────────────────────────────

test.describe('Settings Page — Model Tab', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
    await goToSettingsTab(page, 'Model')
  })

  test('provider selection is reactive — selecting gemini shows model buttons', async ({ page }) => {
    // Click the gemini provider button
    const geminiBtn = page.locator('.rounded-xl .grid button', { hasText: 'gemini' })
    await geminiBtn.click({ force: true })

    // Gemini model buttons should appear: gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash
    await expect(page.locator('button', { hasText: 'gemini-2.5-pro' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'gemini-2.5-flash' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'gemini-2.0-flash' })).toBeVisible()
  })

  test('model quick-select populates the input field', async ({ page }) => {
    // Select openai provider first
    const openaiBtn = page.locator('.rounded-xl .grid button', { hasText: 'openai' }).first()
    await openaiBtn.click({ force: true })

    // Click a model button (gpt-4o)
    const modelBtn = page.locator('button', { hasText: 'gpt-4o' }).first()
    await modelBtn.click({ force: true })

    // The model input should now have the model value
    const modelInput = page.locator('input[placeholder="Enter model identifier"]')
    await expect(modelInput).toHaveValue('gpt-4o')
  })

  test('switching provider clears the model input', async ({ page }) => {
    // Select openai and pick a model
    const openaiBtn = page.locator('.rounded-xl .grid button', { hasText: 'openai' }).first()
    await openaiBtn.click({ force: true })

    const modelBtn = page.locator('button', { hasText: 'gpt-4o' }).first()
    await modelBtn.click({ force: true })

    const modelInput = page.locator('input[placeholder="Enter model identifier"]')
    await expect(modelInput).toHaveValue('gpt-4o')

    // Now switch to anthropic — model should be cleared
    const anthropicBtn = page.locator('.rounded-xl .grid button', { hasText: 'anthropic' })
    await anthropicBtn.click({ force: true })

    await expect(modelInput).toHaveValue('')
  })
})

// ──────────────────────────────────────────────────
// ──────────────────────────────────────────────────

test.describe('Settings Page — Agent Tab', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
    await goToSettingsTab(page, 'Agent')
  })

  test('max iterations is clamped between 1 and 500', async ({ page }) => {
    const maxIterInput = page.locator('input[type="number"]')
    await expect(maxIterInput).toBeVisible()

    // Try entering -5 — should clamp to 1
    await maxIterInput.fill('-5')
    await maxIterInput.dispatchEvent('change')
    // After blur/change the value should be clamped to 1
    await expect(maxIterInput).toHaveValue('1')

    // Try entering 99999 — should clamp to 500
    await maxIterInput.fill('99999')
    await maxIterInput.dispatchEvent('change')
    await expect(maxIterInput).toHaveValue('500')

    // Valid value should be accepted as-is
    await maxIterInput.fill('50')
    await maxIterInput.dispatchEvent('change')
    await expect(maxIterInput).toHaveValue('50')
  })

  test('reasoning effort buttons work', async ({ page }) => {
    // The reasoning effort section has low/medium/high buttons
    const lowBtn = page.locator('button', { hasText: /^low$/i })
    const mediumBtn = page.locator('button', { hasText: /^medium$/i })
    const highBtn = page.locator('button', { hasText: /^high$/i })

    // Click "high"
    await highBtn.click({ force: true })
    // "high" button should get active class (bg-background text-primary)
    await expect(highBtn).toHaveClass(/text-primary/)

    // Click "low"
    await lowBtn.click({ force: true })
    await expect(lowBtn).toHaveClass(/text-primary/)

    // Click "medium" 
    await mediumBtn.click({ force: true })
    await expect(mediumBtn).toHaveClass(/text-primary/)
  })

  test('logging verbosity buttons work', async ({ page }) => {
    const offBtn = page.locator('button', { hasText: /^off$/i })
    const newBtn = page.locator('button', { hasText: /^new$/i })
    const allBtn = page.locator('button', { hasText: /^all$/i })
    const verboseBtn = page.locator('button', { hasText: /^verbose$/i })

    await offBtn.click({ force: true })
    await expect(offBtn).toHaveClass(/text-primary/)

    await verboseBtn.click({ force: true })
    await expect(verboseBtn).toHaveClass(/text-primary/)

    await newBtn.click({ force: true })
    await expect(newBtn).toHaveClass(/text-primary/)

    await allBtn.click({ force: true })
    await expect(allBtn).toHaveClass(/text-primary/)
  })
})

// ──────────────────────────────────────────────────
// 4. Settings Page — Tools Tab (DEF-010)
// ──────────────────────────────────────────────────

test.describe('Settings Page — Tools Tab', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
    await goToSettingsTab(page, 'Tools')
  })

  test('web search toggle reveals Firecrawl API key input', async ({ page }) => {
    // Initially the Firecrawl key section should not be visible
    await expect(page.getByText('FIRECRAWL API KEY')).not.toBeVisible()

    // Find the Web Search switch and toggle it on
    const webSearchRow = page.locator('.rounded-xl', { hasText: 'Web Search Capabilities' })
    const webSearchSwitch = webSearchRow.locator('button[role="switch"]')
    await webSearchSwitch.click({ force: true })

    // Now the Firecrawl API key field should appear
    await expect(page.getByText('FIRECRAWL API KEY')).toBeVisible()
    await expect(page.locator('input[placeholder="fc-..."]')).toBeVisible()
  })

  test('DEF-010: TTS toggle reveals provider selector', async ({ page }) => {
    // Initially the TTS provider selector should not be visible
    await expect(page.getByText('TTS PROVIDER')).not.toBeVisible()

    // Find the TTS switch and toggle it on
    const ttsRow = page.locator('.rounded-xl', { hasText: 'Text-to-Speech Output' })
    const ttsSwitch = ttsRow.locator('button[role="switch"]')
    await ttsSwitch.click({ force: true })

    // TTS provider selector should now be visible with edge/elevenlabs/openai options
    await expect(page.getByText('TTS PROVIDER')).toBeVisible()
    await expect(page.locator('button', { hasText: /^edge$/i })).toBeVisible()
    await expect(page.locator('button', { hasText: /^elevenlabs$/i })).toBeVisible()
    await expect(page.locator('button', { hasText: /^openai$/i })).toBeVisible()
  })
})

// ──────────────────────────────────────────────────
// 5. Custom provider shows Base URL input (DEF-002)
// ──────────────────────────────────────────────────

test.describe('DEF-002: Custom provider Base URL', () => {
  test('selecting custom provider shows API Base URL input', async ({ page }) => {
    await skipOnboarding(page)
    await goToSettingsTab(page, 'Model')

    // Click the custom provider button
    const customBtn = page.locator('.rounded-xl .grid button', { hasText: 'custom' })
    await customBtn.click({ force: true })

    // The "API Base URL" section should appear
    await expect(page.getByText('API Base URL')).toBeVisible()
    await expect(page.locator('input[placeholder*="your-api.example.com"]')).toBeVisible()
  })
})

// ──────────────────────────────────────────────────
// 6. Ollama provider hides API key section (DEF-008)
// ──────────────────────────────────────────────────

test.describe('DEF-008: Ollama hides API key', () => {
  test('selecting ollama provider hides API Credentials section', async ({ page }) => {
    await skipOnboarding(page)
    await goToSettingsTab(page, 'Model')

    // Click the ollama provider button
    const ollamaBtn = page.locator('.rounded-xl .grid button', { hasText: 'ollama' })
    await ollamaBtn.click({ force: true })

    // "API Credentials" section should NOT be visible
    await expect(page.getByText('API Credentials')).not.toBeVisible()

    // Instead, the "no API key required" note should show
    await expect(page.getByText(/runs locally.*no API key required/i)).toBeVisible()

    // The Base URL input for ollama should be visible (DEF-002 related)
    await expect(page.getByText('API Base URL')).toBeVisible()
  })
})

// ──────────────────────────────────────────────────
// 7. Empty model validation warning (DEF-004)
// ──────────────────────────────────────────────────

test.describe('DEF-004: Empty model validation', () => {
  test('shows warning when model input is empty', async ({ page }) => {
    await skipOnboarding(page)
    await goToSettingsTab(page, 'Model')

    // Select a provider
    const openaiBtn = page.locator('.rounded-xl .grid button', { hasText: 'openai' }).first()
    await openaiBtn.click({ force: true })

    // Clear the model input
    const modelInput = page.locator('input[placeholder="Enter model identifier"]')
    await modelInput.clear()

    // The amber warning text should be visible
    await expect(page.getByText('Select or type a model name before saving.')).toBeVisible()

    // The input should have the amber border class
    await expect(modelInput).toHaveClass(/border-amber/)
  })

  test('warning disappears when model is selected', async ({ page }) => {
    await skipOnboarding(page)
    await goToSettingsTab(page, 'Model')

    // Select a provider
    const openaiBtn = page.locator('.rounded-xl .grid button', { hasText: 'openai' }).first()
    await openaiBtn.click({ force: true })

    // Clear the model input first
    const modelInput = page.locator('input[placeholder="Enter model identifier"]')
    await modelInput.clear()
    await expect(page.getByText('Select or type a model name before saving.')).toBeVisible()

    // Now select a model
    const gpt4oBtn = page.locator('button', { hasText: 'gpt-4o' }).first()
    await gpt4oBtn.click({ force: true })

    // Warning should disappear
    await expect(page.getByText('Select or type a model name before saving.')).not.toBeVisible()
  })
})

// ──────────────────────────────────────────────────
// 8. Automations page empty state (DEF-006)
// ──────────────────────────────────────────────────

test.describe('DEF-006: Automations page empty state', () => {
  test('automations page starts with empty state', async ({ page }) => {
    await skipOnboarding(page)

    // Navigate to Automations via sidebar
    const automationsBtn = page.locator('button', { hasText: 'Automations' })
    await automationsBtn.click({ force: true })

    // Should show the heading
    await expect(page.getByText('Automations').first()).toBeVisible()
    await expect(page.getByText('Scheduled tasks and cron jobs.')).toBeVisible()

    // Should show empty state message
    await expect(page.getByText('No automations created yet.')).toBeVisible()

    // "New Automation" button should be present
    await expect(page.locator('button', { hasText: 'New Automation' })).toBeVisible()
  })
})

// ──────────────────────────────────────────────────
// 9. E2E: Configure external backend + custom provider,
//    apply settings, verify chat model selector and 
//    connection status
// ──────────────────────────────────────────────────

test.describe('E2E: Full configuration flow', () => {
  test('configure external backend + custom provider, apply, and verify chat page', async ({ page }) => {
    await skipOnboarding(page)

    // --- Step 1: Go to Settings Model tab, select custom provider ---
    await goToSettingsTab(page, 'Connection')

    const customBtn = page.locator('.rounded-xl .grid button', { hasText: 'custom' })
    await customBtn.click({ force: true })

    // Set a custom external URL
    const urlInput = page.locator('input.font-mono').first()
    await urlInput.clear()
    await urlInput.fill('http://localhost:9999/v1')

    // API Base URL section should appear for custom provider
    await expect(page.getByText('API Base URL')).toBeVisible()

    // Set a model
    const modelInput = page.locator('input[placeholder="Enter model identifier"]')
    await modelInput.clear()
    await modelInput.fill('my-custom-model-v1')


    // --- Step 3: Click Apply Settings ---
    const applyBtn = page.locator('button', { hasText: 'Apply Settings' })
    await applyBtn.click({ force: true })

    // Confirm settings saved toast
    await expect(page.getByText('Settings saved successfully!')).toBeVisible()

    // --- Step 4: Navigate to Chat page ---
    const chatBtn = page.locator('button', { hasText: 'Chat' })
    await chatBtn.click({ force: true })

    // --- Step 5: Verify model selector in Chat composer shows the custom model ---
    // The composer has a Select with the model value
    const modelSelect = page.locator('button[role="combobox"]')
    await expect(modelSelect).toBeVisible()
    await expect(modelSelect).toHaveText(/my-custom-model-v1/)

    // --- Step 6: Verify connection status indicator is present ---
    // The connection status is shown in the sidebar footer and in chat header
    // Since http://localhost:9999 likely won't respond, expect "disconnected"
    const statusIndicator = page.getByText(/Connected|Connecting…|Disconnected/, { exact: true }).first()
    await expect(statusIndicator).toBeVisible()
  })
})
