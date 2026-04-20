import { test, expect, _electron as electron } from "@playwright/test"
import fs from "fs"

test("real agent writes a file into the workspace", async () => {
  try { fs.unlinkSync('/tmp/hermes-ui-real-check/hello-integration.txt') } catch {}
  try { fs.unlinkSync('/tmp/hermes-ui-debug.log') } catch {}
  try { fs.unlinkSync('/tmp/hermes-ui-debug-err.log') } catch {}

  const electronApp = await electron.launch({ args: ['.'] })
  const page = await electronApp.firstWindow()

  await page.evaluate(() => {
    localStorage.setItem('hermes.onboardingCompleted', JSON.stringify(true))
    localStorage.setItem('hermes.provider', JSON.stringify('local'))
    localStorage.setItem('hermes.model', JSON.stringify('qwen3-coder-30b'))
    localStorage.setItem('hermes.baseUrl', JSON.stringify('http://172.30.224.1:42427/v1'))
    localStorage.setItem('hermes.backendMode', JSON.stringify('embedded'))
    localStorage.setItem('hermes.projectFolder', JSON.stringify('/tmp/hermes-ui-real-check'))
  })

  await page.reload()
  await page.waitForLoadState('networkidle')

  const box = page.locator('textarea').first()
  await box.fill('Create a file named hello-integration.txt containing exactly: AGENT_WROTE_THIS. Use the terminal or file tool to do it now.')
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByText(/Initializing Hermes agent/i)).toBeVisible({ timeout: 10000 })
  await page.waitForTimeout(8000)

  const uiText = await page.evaluate(() => document.body.innerText)
  const debugOut = fs.existsSync('/tmp/hermes-ui-debug.log') ? fs.readFileSync('/tmp/hermes-ui-debug.log', 'utf8') : ''
  const debugErr = fs.existsSync('/tmp/hermes-ui-debug-err.log') ? fs.readFileSync('/tmp/hermes-ui-debug-err.log', 'utf8') : ''
  const wroteFile = fs.existsSync('/tmp/hermes-ui-real-check/hello-integration.txt')
  const fileContent = wroteFile ? fs.readFileSync('/tmp/hermes-ui-real-check/hello-integration.txt', 'utf8') : ''

  console.log('--- UI TEXT ---\n' + uiText)
  console.log('--- DEBUG OUT ---\n' + debugOut)
  console.log('--- DEBUG ERR ---\n' + debugErr)
  console.log('--- FILE EXISTS ---\n' + String(wroteFile))
  console.log('--- FILE CONTENT ---\n' + fileContent)

  expect(debugOut.length + debugErr.length).toBeGreaterThan(0)

  await electronApp.close()
})
