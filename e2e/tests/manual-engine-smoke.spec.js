import { test, expect } from "@playwright/test"

const BASE_URL = "http://172.30.224.1:42427/v1"

test("manual engine smoke via chat UI", async ({ page }) => {
  await page.addInitScript((baseUrl) => {
    localStorage.setItem('hermes.onboardingCompleted', JSON.stringify(true))
    localStorage.setItem('hermes.provider', JSON.stringify('local'))
    localStorage.setItem('hermes.model', JSON.stringify('qwen3-coder-30b'))
    localStorage.setItem('hermes.baseUrl', JSON.stringify(baseUrl))
    localStorage.setItem('hermes.backendMode', JSON.stringify('embedded'))
  }, BASE_URL)

  page.once('dialog', async dialog => {
    await dialog.accept('/tmp/hermes-smoke-project')
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(/connected|disconnected/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled()
  await expect(page.getByText('Workspace required')).toBeVisible()

  await page.getByRole('button', { name: /select workspace/i }).click()
  await expect(page.getByRole('button', { name: /hermes-smoke-project/i })).toBeVisible()

  const box = page.locator('textarea').first()
  await box.fill('Reply with exactly: HERMES_ENGINE_OK')
  await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled()
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: 'Reply with exactly: HERMES_ENGINE_OK' })).toBeVisible()
  await expect(page.getByText('HERMES_ENGINE_OK', { exact: true })).toBeVisible({ timeout: 30000 })
})
