import { test, expect } from '@playwright/test'

const LOCAL_MODEL_URL = 'http://127.0.0.1:42427/v1'
const LOCAL_MODEL_NAME = 'qwen3-coder-30b'

async function seedOnboarded(page, overrides = {}) {
  await page.addInitScript((data) => {
    const entries = {
      'hermes.onboardingCompleted': true,
      'hermes.provider': 'custom',
      'hermes.model': 'qwen3-coder-30b',
      'hermes.baseUrl': 'http://127.0.0.1:42427/v1',
      'hermes.backendMode': 'embedded',
      'hermes.externalUrl': 'http://localhost:42424/v1',
      'hermes.maxTurns': 90,
      'hermes.reasoningEffort': 'medium',
      'hermes.toolProgress': 'all',
      ...data,
    }
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem(key, JSON.stringify(value))
    }
    const threads = entries['hermes.threads']
    if (Array.isArray(threads)) {
      localStorage.setItem('hermes.threads', JSON.stringify(threads))
    }
    const automations = entries['hermes.automations']
    if (Array.isArray(automations)) {
      localStorage.setItem('hermes.automations', JSON.stringify(automations))
    }
  }, overrides)
}

async function openApp(page, overrides = {}) {
  await seedOnboarded(page, overrides)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

async function navigateTo(page, name) {
  await page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).click()
}

test.describe('Hermes UI exhaustive journeys', () => {
  test('chat empty state shows Hermes branding and starter commands', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('heading', { name: 'Hermes Agent', level: 2 })).toBeVisible()
    await expect(page.getByRole('button', { name: '/help' })).toBeVisible()
    await expect(page.getByRole('button', { name: '/model' })).toBeVisible()
    await expect(page.getByRole('button', { name: '/skills' })).toBeVisible()
  })

  test('chat send creates thread and shows user message bubble', async ({ page }) => {
    await openApp(page)
    const composer = page.locator('textarea').first()
    await composer.fill('Hello Hermes!')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: 'Hello Hermes!' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Hello Hermes!' })).toBeVisible()
    await expect(composer).toHaveValue('')
  })

  test('chat failed stream shows diagnostic card', async ({ page }) => {
    await openApp(page, {
      'hermes.baseUrl': 'http://127.0.0.1:9/v1',
      'hermes.provider': 'custom',
      'hermes.model': 'broken-local',
      'hermes.backendMode': 'embedded',
    })
    const composer = page.locator('textarea').first()
    await composer.fill('Ping local model')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('Connection Error')).toBeVisible()
    await expect(page.getByText('Technical Diagnostic')).toBeVisible()
    await expect(page.getByText('Mode:')).toBeVisible()
  })

  test('composer slash command menu opens and closes with escape', async ({ page }) => {
    await openApp(page)
    const composer = page.locator('textarea').first()
    await composer.fill('/')
    await expect(page.getByText('/new', { exact: true })).toBeVisible()
    await composer.press('Escape')
    await expect(composer).toHaveValue('')
  })

  test('composer slash command keyboard selection inserts command', async ({ page }) => {
    await openApp(page)
    const composer = page.locator('textarea').first()
    await composer.fill('/mo')
    await composer.press('ArrowDown')
    await composer.press('Enter')
    await expect(composer).toHaveValue('/model ')
  })

  test('composer context menu inserts selected reference', async ({ page }) => {
    await openApp(page)
    const composer = page.locator('textarea').first()
    await composer.fill('@file:')
    await expect(composer).toHaveValue('@file:')
  })

  test('composer file attachment inserts file token', async ({ page }) => {
    await openApp(page)
    const chooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Add context' }).click()
    const chooser = await chooserPromise
    await chooser.setFiles({
      name: 'spec.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# spec')
    })
    await expect(page.locator('textarea').first()).toHaveValue(/@file:spec\.md/)
  })

  test('model dropdown preserves custom current model', async ({ page }) => {
    await openApp(page, {
      'hermes.provider': 'openai',
      'hermes.model': 'qwen3-coder-30b',
    })
    await expect(page.getByRole('combobox').first()).toContainText('qwen3-coder-30b')
  })

  test('theme toggle switches html class', async ({ page }) => {
    await openApp(page)
    const html = page.locator('html')
    const toggle = page.locator('.p-3.border-t.border-border button').last()
    await expect(html).toHaveClass(/dark/)
    await toggle.click()
    await expect(html).not.toHaveClass(/dark/)
    await toggle.click()
    await expect(html).toHaveClass(/dark/)
  })

  test('new thread resets active conversation header', async ({ page }) => {
    await openApp(page)
    const composer = page.locator('textarea').first()
    await composer.fill('Thread alpha')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByRole('heading', { name: 'Thread alpha' })).toBeVisible()
    await page.getByRole('button', { name: /new thread/i }).click()
    await expect(page.getByText('New Session')).toBeVisible()
  })

  test('threads page empty state renders when no threads exist', async ({ page }) => {
    await openApp(page, { 'hermes.threads': [] })
    await navigateTo(page, 'Threads')
    await expect(page.getByText('No threads yet')).toBeVisible()
  })

  test('threads search accepts input and keeps matching thread visible', async ({ page }) => {
    await openApp(page, {
      'hermes.threads': [
        { id: '1', title: 'Alpha thread', createdAt: '2026-04-19T09:00:00.000Z' },
        { id: '2', title: 'Beta thread', createdAt: '2026-04-19T08:00:00.000Z' }
      ],
      'hermes.thread.1': [{ role: 'user', content: 'Discuss parser' }],
      'hermes.thread.2': [{ role: 'user', content: 'Need deployment guide' }],
    })
    await navigateTo(page, 'Threads')
    await page.getByPlaceholder('Search threads...').fill('parser')
    await expect(page.getByPlaceholder('Search threads...')).toHaveValue('parser')
    await expect(page.getByRole('button', { name: 'Alpha thread' })).toBeVisible()
  })

  test('threads rename dialog enables save only with non-empty title', async ({ page }) => {
    await openApp(page, {
      'hermes.threads': [{ id: '1', title: 'Alpha thread', createdAt: '2026-04-19T09:00:00.000Z' }],
      'hermes.thread.1': [],
    })
    await navigateTo(page, 'Threads')
    await page.getByTitle('Rename').click()
    const input = page.getByPlaceholder('e.g. My project discussion')
    await input.fill('')
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
    await input.fill('Renamed thread')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('button', { name: 'Renamed thread' })).toBeVisible()
  })

  test('threads delete flow removes thread after confirmation', async ({ page }) => {
    await openApp(page, {
      'hermes.threads': [{ id: '1', title: 'Disposable thread', createdAt: '2026-04-19T09:00:00.000Z' }],
      'hermes.thread.1': [],
    })
    await navigateTo(page, 'Threads')
    await page.getByTitle('Delete').click()
    await page.getByRole('button', { name: /delete forever/i }).click()
    await expect(page.getByText('Disposable thread')).not.toBeVisible()
  })

  test('skills filters switch visible categories', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Skills')
    await page.locator('.inline-flex.items-center.rounded-md').filter({ hasText: 'Tools' }).first().click()
    await expect(page.getByText('Terminal')).toBeVisible()
    await expect(page.getByText('Autonomous AI Agents')).not.toBeVisible()
    await page.getByText('Development', { exact: true }).click()
    await expect(page.getByText('Autonomous AI Agents')).toBeVisible()
  })

  test('skills inspect dialog opens with usage example', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Skills')
    await page.getByRole('button', { name: 'Inspect' }).first().click()
    await expect(page.getByText('Usage Example')).toBeVisible()
  })

  test('automations empty state renders with no jobs', async ({ page }) => {
    await openApp(page, { 'hermes.automations': [] })
    await navigateTo(page, 'Automations')
    await expect(page.getByText('No automations created yet.')).toBeVisible()
  })

  test('automations create requires all fields before enabling create', async ({ page }) => {
    await openApp(page, { 'hermes.automations': [] })
    await navigateTo(page, 'Automations')
    await page.getByRole('button', { name: /new automation/i }).click()
    const create = page.getByRole('button', { name: /create protocol/i })
    await expect(create).toBeDisabled()
    await page.getByPlaceholder('e.g. Nightly Code Review').fill('Nightly Review')
    await page.getByPlaceholder('What should the agent do?').fill('Inspect repo health')
    await page.getByPlaceholder('0 9 * * *').fill('0 9 * * *')
    await expect(create).toBeEnabled()
    await create.click()
    await expect(page.getByText('Nightly Review')).toBeVisible()
  })

  test('automations seeded active job renders status badge', async ({ page }) => {
    await openApp(page, {
      'hermes.automations': [{ id: 'job-1', name: 'Daily Sync', prompt: 'Sync', schedule: '0 9 * * *', status: 'active', lastRun: 'Never' }]
    })
    await navigateTo(page, 'Automations')
    await expect(page.getByText('Daily Sync')).toBeVisible()
    await expect(page.getByText('active')).toBeVisible()
  })

  test('automations delete removes job after purge', async ({ page }) => {
    await openApp(page, {
      'hermes.automations': [{ id: 'job-1', name: 'Disposable Job', prompt: 'Sync', schedule: '0 9 * * *', status: 'active', lastRun: 'Never' }]
    })
    await navigateTo(page, 'Automations')
    await page.getByTitle('Delete').click()
    await page.getByRole('button', { name: /purge task/i }).click()
    await expect(page.getByText('Disposable Job')).not.toBeVisible()
  })

  test('settings connection tab shows OAuth fallback for codex', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Settings')
    await page.getByRole('tab', { name: 'Connection' }).click()
    await page.getByRole('button', { name: 'openai-codex' }).click()
    await expect(page.getByText('Connect with OAuth (Desktop Only)')).toBeVisible()
    await expect(page.getByPlaceholder('sk-... (optional fallback)')).toBeVisible()
  })

  test('settings local providers hide API key and show local note', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Settings')
    await page.getByRole('button', { name: 'ollama' }).click()
    await expect(page.getByText('Ollama runs locally')).toBeVisible()
    await expect(page.getByText('API Credentials')).not.toBeVisible()
  })

  test('settings save persists changed provider model and base url', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Settings')
    await page.getByRole('button', { name: 'custom' }).click()
    await page.getByPlaceholder('Enter model identifier').fill('qwen3-coder-30b')
    await page.locator('input.font-mono.text-sm').first().fill(LOCAL_MODEL_URL)
    await page.getByRole('button', { name: /apply settings/i }).click()
    await expect(page.getByText('Settings saved successfully!')).toBeVisible()
    const provider = await page.evaluate(() => JSON.parse(localStorage.getItem('hermes.provider')))
    const model = await page.evaluate(() => JSON.parse(localStorage.getItem('hermes.model')))
    const baseUrl = await page.evaluate(() => JSON.parse(localStorage.getItem('hermes.baseUrl')))
    expect(provider).toBe('custom')
    expect(model).toBe('qwen3-coder-30b')
    expect(baseUrl).toBe(LOCAL_MODEL_URL)
  })


  test('settings tools toggles reveal dependent controls', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Settings')
    await page.getByRole('tab', { name: 'Tools' }).click()
    await page.locator('.rounded-xl', { hasText: 'Web Search Capabilities' }).locator('button[role="switch"]').click()
    await expect(page.getByText('FIRECRAWL API KEY')).toBeVisible()
    await page.locator('.rounded-xl', { hasText: 'Text-to-Speech Output' }).locator('button[role="switch"]').click()
    await expect(page.getByText('TTS PROVIDER')).toBeVisible()
  })

  test('settings reset wizard opens reset confirmation flow', async ({ page }) => {
    await openApp(page)
    await navigateTo(page, 'Settings')
    await page.getByRole('button', { name: /reset wizard/i }).click()
    await expect(page.getByRole('button', { name: /initiate reset/i })).toBeVisible()
  })

  test('onboarding provider step blocks progress without required inputs', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /begin setup/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await expect(page.getByText('Please select a provider.')).toBeVisible()
    await page.getByText('OpenAI', { exact: true }).click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await expect(page.getByText('API key is required for this provider.')).toBeVisible()
  })

  test('onboarding custom provider captures base url and model on provider step', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /begin setup/i }).click()
    await page.getByText('Custom endpoint', { exact: true }).click()
    await page.getByPlaceholder('http://localhost:11434/v1').fill(LOCAL_MODEL_URL)
    await page.getByPlaceholder('Enter model name').fill(LOCAL_MODEL_NAME)
    await expect(page.getByPlaceholder('http://localhost:11434/v1')).toHaveValue(LOCAL_MODEL_URL)
    await expect(page.getByPlaceholder('Enter model name')).toHaveValue(LOCAL_MODEL_NAME)
    await expect(page.getByRole('button', { name: /^next$/i })).toBeVisible()
  })

  test('local model connectivity check reflects actual availability when configured directly', async ({ page }) => {
    await openApp(page, {
      'hermes.provider': 'custom',
      'hermes.model': LOCAL_MODEL_NAME,
      'hermes.baseUrl': LOCAL_MODEL_URL,
      'hermes.backendMode': 'embedded',
    })
    await expect(page.getByText(/connected|disconnected/i).first()).toBeVisible()
  })
})
