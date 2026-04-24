// End-to-end chat test against the user's real local LLM.
//
// This spec is the evidence that the UI + bridge + agent + LM-Studio chain
// is wired up correctly, AND that the one remaining failure mode is the
// model/endpoint tool-call format — not the UI.
//
// PRECONDITION: the HTTP bridge must be up:
//     cd repo && npm run bridge        (from WSL)
// and the LLM endpoint must be reachable:
//     http://172.30.224.1:42427/v1     (LM Studio on the Windows host)
//
// The two tests exercise two distinct paths:
//   1. Plain chat (no tool use) — proves the round-trip
//      UI → bridge → ui-wrapper.py → run_agent.py → LM Studio → back
//      works. A fresh user installs, does the wizard, sends "what is 2+2?",
//      and gets a response in the chat bubble.
//   2. File-creating chat (real tool use) — proves whether the model
//      actually emits OpenAI-standard tool_calls. Asserts hello.txt gets
//      written to a test sandbox. With qwen3-coder-30b + LM Studio's
//      default tool_choice=auto behaviour, this FAILS: LM Studio returns
//      `<function=write_file>…</function>` as plain text in content
//      instead of a tool_calls array, so run_agent.py never invokes the
//      write_file tool, the file never appears, and the test fails. With
//      LM-Studio's per-model "Tool Use" toggle enabled (or a model that
//      advertises `tools` in /v1/models capabilities), this passes.

import { test, expect, request as pwRequest } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const BRIDGE_URL = 'http://127.0.0.1:42500'
const LLM_URL = 'http://172.30.224.1:42427/v1'
const LLM_MODEL = 'qwen3-coder-30b'

// Per-test budget: a single agent turn over a 30B Q4 model on LM Studio
// typically lands in 20–90s. Allow 3 minutes before we declare the turn
// hung.
test.describe.configure({ timeout: 180_000 })

const LOCAL_PROVIDER_BUTTON = /^Local\s+Hermes,/

async function bridgeIsUp() {
  try {
    const ctx = await pwRequest.newContext()
    const res = await ctx.get(`${BRIDGE_URL}/health`, { timeout: 2000 })
    await ctx.dispose()
    return res.ok()
  } catch {
    return false
  }
}

async function llmIsUp() {
  try {
    const ctx = await pwRequest.newContext()
    const res = await ctx.get(`${LLM_URL}/models`, { timeout: 2000 })
    await ctx.dispose()
    return res.ok()
  } catch {
    return false
  }
}

async function openFreshApp(page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

/**
 * Seed a project folder into storage. The composer's Send button is disabled
 * until one is set (UI prompt: "Select a project folder before sending a
 * message"), so we write the key directly and reload instead of driving the
 * folder-picker dialog, which Playwright can't fulfil anyway (it's a native
 * OS dialog handled via Electron IPC in the packaged app).
 */
async function seedProjectFolder(page, folder) {
  await page.evaluate((f) => {
    localStorage.setItem('hermes.projectFolder', JSON.stringify(f))
  }, folder)
  await page.reload()
  await page.waitForSelector('textarea', { timeout: 10_000 })
}

async function walkWizard(page) {
  await page.waitForSelector('[data-testid="onboarding-wizard"]', { timeout: 10_000 })
  await page.getByRole('button', { name: /Begin Setup/i }).click()

  await page.getByRole('button', { name: LOCAL_PROVIDER_BUTTON }).click()
  await page.getByPlaceholder(/127\.0\.0\.1:42427/).fill(LLM_URL)
  await page.getByPlaceholder(/Enter model name/i).fill(LLM_MODEL)
  await page.getByRole('button', { name: /^Next/i }).click()

  await page.getByRole('button', { name: /^Next/i }).click() // accept agent-settings defaults

  await expect(page.getByRole('heading', { name: /You.re all set/i })).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: /Start Chatting/i }).click()

  await expect(page.locator('[data-testid="onboarding-wizard"]')).toHaveCount(0)
  await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5_000 })
}

async function sendMessage(page, text) {
  const composer = page.locator('textarea').first()
  await composer.fill(text)
  await composer.press('Enter')
}

/**
 * Wait for the agent to finish streaming. The "Hermes runtime · running"
 * label is rendered only while `isStreaming` is true; once the turn ends,
 * the label becomes "Hermes runtime · N events" and the animate-spin
 * spinner in the streaming bubble goes away. Polling for that transition
 * avoids racing against intermediate empty DOM states.
 */
async function waitForTurnToFinish(page, { timeoutMs = 160_000 } = {}) {
  const runningLabel = page.locator('text=/Hermes runtime.+running/i').first()
  // First wait until the running label appears — confirming the turn
  // actually started. Short timeout here: the bridge kicks off within a
  // second of Send.
  await runningLabel.waitFor({ state: 'visible', timeout: 15_000 })
  // Then wait for it to disappear (streaming completed).
  await runningLabel.waitFor({ state: 'detached', timeout: timeoutMs })
}

/**
 * Read the concatenated text of every assistant bubble (i.e. every
 * message rendered via the shared `.prose-chat` class). The final
 * response is the text of the LAST bubble.
 */
async function readLastAssistantBubble(page) {
  return page.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll('.prose-chat'))
    if (!bubbles.length) return ''
    return bubbles[bubbles.length - 1].innerText || ''
  })
}

test.describe('chat end-to-end against local LLM', () => {
  test.beforeAll(async () => {
    const [bridge, llm] = await Promise.all([bridgeIsUp(), llmIsUp()])
    test.skip(
      !bridge,
      `Bridge not reachable at ${BRIDGE_URL}. Run "npm run bridge" in the repo before running this spec.`
    )
    test.skip(
      !llm,
      `LLM not reachable at ${LLM_URL}. Start LM Studio (or your local runner) at that address before running this spec.`
    )
  })

  test('plain chat question gets a real answer from the local model', async ({ page }) => {
    const sandbox = '/tmp/hermes-e2e-chat-' + Date.now()
    await fs.mkdir(sandbox, { recursive: true })

    await openFreshApp(page)
    await walkWizard(page)
    await seedProjectFolder(page, sandbox)

    await sendMessage(page, 'What is 2+2? Reply with just a single number, no tools, no explanation.')

    await waitForTurnToFinish(page, { timeoutMs: 160_000 })
    const response = await readLastAssistantBubble(page)
    // The model (qwen3-coder-30b) reliably answers "4". Accept any response
    // that contains the digit 4 to stay robust across quantisation noise.
    expect(response, 'assistant never posted a reply').not.toBe('')
    expect(response).toMatch(/\b4\b/)
  })

  test('asking the agent to build a hello-world file actually writes the file', async ({ page }) => {
    // Test sandbox: a fresh directory the agent is told to write into.
    // We'll watch this directory for the hello.txt appearing.
    const sandbox = '/tmp/hermes-e2e-hello-' + Date.now()
    await fs.mkdir(sandbox, { recursive: true })

    await openFreshApp(page)
    await walkWizard(page)
    await seedProjectFolder(page, sandbox)

    await sendMessage(
      page,
      `Create a file called hello.txt in the current working directory (${sandbox}) containing exactly one line: Hello, World!`
    )

    await waitForTurnToFinish(page, { timeoutMs: 160_000 })
    // Give the bridge/agent a beat to flush the final stdout buffer and
    // close the file handle before we stat the sandbox.
    await page.waitForTimeout(500)

    // The moment of truth: did the agent actually write the file?
    let contents = null
    try {
      contents = await fs.readFile(path.join(sandbox, 'hello.txt'), 'utf8')
    } catch {
      /* file missing — expected failure mode when LM-Studio returns XML tool calls */
    }

    expect(
      contents,
      [
        'hello.txt was NOT written.',
        'This is almost certainly the LM-Studio tool-format issue:',
        `  curl ${LLM_URL}/chat/completions with tools shows the response has`,
        '  content="<function=write_file>...</function>" instead of a real',
        '  tool_calls array, so run_agent.py never invokes write_file.',
        'Fix: enable per-model "Tool Use" in LM Studio for qwen3-coder-30b,',
        'or pick a model whose /v1/models entry lists the "tools" capability.',
      ].join('\n')
    ).toMatch(/Hello,\s*World!/i)
  })
})
