import { test, expect, _electron as electron } from "@playwright/test"
import fs from "fs"

// Real agent runs a full LLM inference loop; allow plenty of wall time.
test.setTimeout(10 * 60 * 1000)

test("real agent writes a file into the workspace", async () => {
  try { fs.unlinkSync('/tmp/hermes-ui-real-check/hello-integration.txt') } catch {}
  try { fs.unlinkSync('/tmp/hermes-ui-debug.log') } catch {}
  try { fs.unlinkSync('/tmp/hermes-ui-debug-err.log') } catch {}
  fs.mkdirSync('/tmp/hermes-ui-real-check', { recursive: true })

  const electronApp = await electron.launch({ args: ['.'], env: { ...process.env, ELECTRON_DISABLE_DEVTOOLS: '1' } })
  const page = await electronApp.firstWindow()

  await page.evaluate(() => {
    localStorage.clear()
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
  await box.fill('Create a file named hello-integration.txt in the CURRENT DIRECTORY containing exactly: AGENT_WROTE_THIS. Use the terminal or write_file tool to do it now.')
  await page.getByRole('button', { name: 'Send' }).click()

  // Confirm the UI entered the Electron runtime path.
  await expect(page.getByText(/Initializing Hermes agent/i)).toBeVisible({ timeout: 10000 })

  // Confirm the main-process agent:run handler actually fired.
  await expect.poll(() => fs.existsSync('/tmp/hermes-ui-debug.log') && fs.readFileSync('/tmp/hermes-ui-debug.log', 'utf8').includes('HANDLER START'),
    { timeout: 15000 }).toBeTruthy()

  // Poll up to 8 minutes for the agent to finish completely (child process exit).
  // We wait for process close — not just file existence — so the UI has time
  // to receive the full transcript and finalize the assistant message.
  const target = '/tmp/hermes-ui-real-check/hello-integration.txt'
  const deadline = Date.now() + 8 * 60 * 1000
  while (Date.now() < deadline) {
    const debugOut = fs.existsSync('/tmp/hermes-ui-debug.log') ? fs.readFileSync('/tmp/hermes-ui-debug.log', 'utf8') : ''
    if (debugOut.includes('child close code=')) break
    await page.waitForTimeout(2000)
  }
  // Give the renderer a beat to flush the final assistant message after stdout close.
  await page.waitForTimeout(1500)

  const uiText = await page.evaluate(() => document.body.innerText)
  const debugOut = fs.existsSync('/tmp/hermes-ui-debug.log') ? fs.readFileSync('/tmp/hermes-ui-debug.log', 'utf8') : ''
  const debugErr = fs.existsSync('/tmp/hermes-ui-debug-err.log') ? fs.readFileSync('/tmp/hermes-ui-debug-err.log', 'utf8') : ''
  const wroteFile = fs.existsSync(target)
  const fileContent = wroteFile ? fs.readFileSync(target, 'utf8') : ''

  console.log('--- UI TEXT (tail 1500) ---\n' + uiText.slice(-1500))
  console.log('--- DEBUG OUT (tail 3000) ---\n' + debugOut.slice(-3000))
  console.log('--- DEBUG ERR (tail 1500) ---\n' + debugErr.slice(-1500))
  console.log('--- FILE EXISTS --- ' + String(wroteFile))
  console.log('--- FILE CONTENT ---\n' + fileContent)

  expect(debugOut.length + debugErr.length).toBeGreaterThan(0)

  await electronApp.close()

  // Real-behavior assertions: the whole point of this test.
  expect(wroteFile).toBeTruthy()
  expect(fileContent.trim()).toBe('AGENT_WROTE_THIS')
})
