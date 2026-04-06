import { test, expect } from '@playwright/test'
import path from 'path'

const skipOnboarding = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('hermes.onboardingCompleted', JSON.stringify(true))
    localStorage.setItem('hermes.provider', JSON.stringify('openai'))
    localStorage.setItem('hermes.model', JSON.stringify('gpt-4o'))
    localStorage.setItem('hermes.backendMode', JSON.stringify('embedded'))
  })
}

test.describe('End-to-End Application Features', () => {

  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('User can switch between Light and Dark mode', async ({ page }) => {
    // Check initial state (should be dark mode based on initial hook state)
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
    
    // Find the theme toggle button (moon/sun icon in sidebar footer)
    const toggleButton = page.locator('.w-60 .p-3.border-t.border-border button')
    
    // Toggle to Light mode
    await toggleButton.click()
    await expect(html).not.toHaveClass(/dark/)
    
    // Toggle back to Dark mode
    await toggleButton.click()
    await expect(html).toHaveClass(/dark/)
  })

  test('User can open the model selector and change the model', async ({ page }) => {
    // Find the radix UI select trigger
    const selectTrigger = page.locator('button[role="combobox"]').first()
    
    // The initial model should be gpt-4o
    await expect(selectTrigger).toHaveText(/gpt-4o/)
    
    // Open the dropdown
    await selectTrigger.click()
    
    // Select gpt-4-turbo
    const option = page.getByRole('option', { name: 'gpt-4-turbo' })
    await option.click()
    
    // The page will reload because of the ChatPage implementation updating storage
    await page.waitForLoadState('networkidle')
    
    // Re-select the combobox and check it updated
    const updatedSelectTrigger = page.locator('button[role="combobox"]').first()
    await expect(updatedSelectTrigger).toHaveText(/gpt-4-turbo/)
  })

  test('User can use paperclip to attach a file to the context', async ({ page }) => {
    // Get the composer textarea
    const composer = page.locator('textarea').first()
    
    // The file input is hidden but we can interact with it in Playwright
    // Create a dummy file path to simulate the OS file picker
    const fileChooserPromise = page.waitForEvent('filechooser')
    
    // Click the paperclip
    await page.locator('button[title="Add context"]').click()
    const fileChooser = await fileChooserPromise
    
    // We'll upload a fake package.json to test the logic
    await fileChooser.setFiles({
      name: 'test-attachment.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is a test')
    })
    
    // The textarea value should now include the @file: reference
    await expect(composer).toHaveValue(/@file:test-attachment\.txt/)
  })

  test('User can type a message, send it, and see it in the chat UI', async ({ page }) => {
    // Send a simple message
    const composer = page.locator('textarea').first()
    await composer.fill('Hello Hermes!')
    
    // Press send
    await page.getByRole('button', { name: 'Send' }).click()
    
    // The message should appear in the chat log (user message)
    await expect(page.getByText('Hello Hermes!')).toBeVisible()
    
    // The composer should be cleared
    await expect(composer).toHaveValue('')
  })
})
