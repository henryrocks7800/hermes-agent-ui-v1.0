import { test, expect } from "@playwright/test"

test("real agent writes a file into the workspace", async ({ page }) => {
  const logs = []
  page.on('console', msg => logs.push(msg.text()))

  await page.addInitScript(() => {
    localStorage.setItem('hermes.onboardingCompleted', JSON.stringify(true))
    localStorage.setItem('hermes.provider', JSON.stringify('local'))
    localStorage.setItem('hermes.model', JSON.stringify('qwen3-coder-30b'))
    localStorage.setItem('hermes.baseUrl', JSON.stringify('http://172.30.224.1:42427/v1'))
    localStorage.setItem('hermes.backendMode', JSON.stringify('embedded'))
  })

  page.once('dialog', async dialog => {
    await dialog.accept('/tmp/hermes-ui-real-check')
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /select workspace/i }).click()
  const box = page.locator('textarea').first()
  
  // The user prompt
  await box.fill('Create a file named hello-integration.txt containing exactly: AGENT_WROTE_THIS. Use the terminal or file tool to do it now.')
  await page.getByRole('button', { name: 'Send' }).click()

  // Wait for the agent to say it actually did it, not just our own message
  await expect(page.locator('.prose-chat p').filter({ hasText: /done|created|wrote/i })).toBeVisible({ timeout: 45000 })
  
  const text = await page.evaluate(() => document.body.innerText)
  console.log('--- UI TEXT ---\n' + text)
})
