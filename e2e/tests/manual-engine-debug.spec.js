import { test, expect } from "@playwright/test"

const BASE_URL = "http://172.30.224.1:42427/v1"

test("debug live engine response path", async ({ page }) => {
  const consoleLogs = []
  const errors = []
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', err => errors.push(String(err)))

  await page.addInitScript((baseUrl) => {
    localStorage.setItem('hermes.onboardingCompleted', JSON.stringify(true))
    localStorage.setItem('hermes.provider', JSON.stringify('local'))
    localStorage.setItem('hermes.model', JSON.stringify('qwen3-coder-30b'))
    localStorage.setItem('hermes.baseUrl', JSON.stringify(baseUrl))
    localStorage.setItem('hermes.backendMode', JSON.stringify('embedded'))
  }, BASE_URL)

  page.once('dialog', async dialog => {
    await dialog.accept('/tmp/hermes-debug-project')
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /select workspace/i }).click()
  await expect(page.getByRole('button', { name: /hermes-debug-project/i })).toBeVisible()

  const requests = []
  const responses = []
  page.on('request', req => {
    if (req.url().includes('/chat/completions')) requests.push(`${req.method()} ${req.url()}`)
  })
  page.on('response', async res => {
    if (res.url().includes('/chat/completions')) {
      let body = ''
      try { body = await res.text() } catch {}
      responses.push(`HTTP ${res.status()} ${res.url()}\n${body.slice(0, 2000)}`)
    }
  })

  const box = page.locator('textarea').first()
  await box.fill('Reply with exactly: HERMES_PIPE_DEBUG')
  await page.getByRole('button', { name: 'Send' }).click()

  await page.waitForTimeout(12000)

  const state = await page.evaluate(() => ({
    activeThreadId: JSON.parse(localStorage.getItem('hermes.activeThreadId') || 'null'),
    threads: JSON.parse(localStorage.getItem('hermes.threads') || '[]'),
    thread0: JSON.parse(localStorage.getItem('hermes.thread.' + (JSON.parse(localStorage.getItem('hermes.activeThreadId') || 'null') || 'missing')) || 'null'),
    bodyText: document.body.innerText,
  }))

  console.log('REQUESTS>>>\n' + requests.join('\n'))
  console.log('RESPONSES>>>\n' + responses.join('\n---\n'))
  console.log('STATE>>>\n' + JSON.stringify(state, null, 2))
  console.log('PAGEERRORS>>>\n' + errors.join('\n'))
  console.log('CONSOLE>>>\n' + consoleLogs.join('\n'))

  await expect.soft(page.getByText(/HERMES_PIPE_DEBUG/)).toBeVisible({ timeout: 1000 })
})
