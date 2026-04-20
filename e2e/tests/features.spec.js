import { test, expect } from '@playwright/test'

const skipOnboarding = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('hermes.onboardingCompleted', JSON.stringify(true))
    localStorage.setItem('hermes.provider', JSON.stringify('local'))
    localStorage.setItem('hermes.model', JSON.stringify('qwen3-coder-30b'))
    localStorage.setItem('hermes.baseUrl', JSON.stringify('http://127.0.0.1:42427/v1'))
    localStorage.setItem('hermes.backendMode', JSON.stringify('embedded'))
    localStorage.setItem('hermes.projectFolder', JSON.stringify('/home/user/project'))
  })
}

test.describe('End-to-End Application Features', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('User can switch between Light and Dark mode', async ({ page }) => {
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)

    const toggleButton = page.locator('.w-60 .p-3.border-t.border-border button')
    await toggleButton.click()
    await expect(html).not.toHaveClass(/dark/)
    await toggleButton.click()
    await expect(html).toHaveClass(/dark/)
  })

  test('User can open the model selector and change the model', async ({ page }) => {
    const selectTrigger = page.locator('button[role="combobox"]').first()
    await expect(selectTrigger).toHaveText(/qwen3-coder-30b/)
    await selectTrigger.click()
    await page.getByRole('option', { name: 'llama3.1:8b' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button[role="combobox"]').first()).toHaveText(/llama3.1:8b/)
  })

  test('User can use paperclip to attach a file to the context', async ({ page }) => {
    const composer = page.locator('textarea').first()
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('button[title="Add context"]').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'test-attachment.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is a test')
    })
    await expect(composer).toHaveValue(/@file:test-attachment\.txt/)
  })

  test('User can type a message, send it, and see it in the chat UI', async ({ page }) => {
    const composer = page.locator('textarea').first()
    await composer.fill('Hello Hermes!')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: 'Hello Hermes!' })).toBeVisible()
    await expect(composer).toHaveValue('')
  })

  test('Connection page shows one provider list and prefilled endpoint', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click()
    await expect(page.getByText('AI Provider')).toBeVisible()
    await page.getByRole('button', { name: 'OpenAI' }).click()
    await expect(page.locator('input').filter({ has: page.locator('..') }).nth(1)).toBeVisible()
    await expect(page.getByDisplayValue('https://api.openai.com/v1')).toBeVisible()
  })
})
