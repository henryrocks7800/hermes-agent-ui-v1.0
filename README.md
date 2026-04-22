# Hermes Agent Desktop

A desktop UI for the [Hermes Agent](https://github.com/nousresearch/hermes-agent) — the full tool-using coding agent (terminal, file I/O, browser, search, skills), driven through a chat window. The app runs on **Windows** as an installable Electron binary, and on **macOS / Linux / WSL** in a local browser with a thin HTTP bridge.

## What you get

- **A real agent, not a chat wrapper.** Every message you send is executed by `run_agent.py` — it plans, calls tools, writes files, runs shell commands, and reports the transcript back into the chat bubble. There is no hidden fallback to plain LLM calls.
- **Your choice of engine.** Hermes can drive OpenAI, Anthropic, OpenRouter, GitHub Copilot, Google Gemini, or any OpenAI-compatible local endpoint (Ollama, LM Studio, LocalAI, or the Hermes CLI's own OpenAI server).
- **Slash commands and context shortcuts.** `/help`, `/model`, `/tools` from the chat entry screen; `/` for autocomplete while typing; `@file:` to attach local context.
- **Live transcript.** Every run streams tool calls, file writes, and thinking summaries into the same assistant bubble.
- **Settings that actually do something.** Max iterations, logging verbosity, and provider credentials all flow through to `run_agent.py` at spawn time. The Settings page auto-tests each provider as you type and shows a ✓ / ✕ on each provider tile.

## Status

Alpha. Works end-to-end (both Windows installer and browser-bridge mode) and has a Playwright E2E test that proves a real file write. Rough edges are being filed in GitHub issues — please help.

## Running

There are two equally-supported ways to run the UI:

### 1. Windows installer (end users)

1. Download the latest `Hermes Agent Setup X.Y.Z.exe` from `distribution/` in this repo.
2. Run it, choose an install path, launch **Hermes Agent**.
3. On first launch the onboarding wizard asks for provider + model + API key. Pick any provider; Local is the zero-key default.

The installer bundles the Hermes Python backend under `resources/hermes-backend` and the Electron shell spawns it directly — no separate service to start.

### 2. Browser + bridge (developers, Linux/macOS/WSL users)

Two processes: Vite serves the UI at `localhost:5173`, and a tiny Node HTTP bridge at `127.0.0.1:42500` spawns the real Hermes agent per message. Both are started with one command:

```bash
npm install
npm run dev:browser
```

Then open <http://localhost:5173>.

Under the hood `dev:browser` runs:
- `scripts/hermes-bridge-server.mjs` — HTTP bridge (endpoint `POST /agent/run`) that invokes `bundled-backend/ui-wrapper.py` → `run_agent.py`
- `vite --host localhost --port 5173` — the UI

If you prefer, you can start them in separate terminals:

```bash
npm run bridge     # terminal 1 — http://127.0.0.1:42500
npm run dev:web    # terminal 2 — http://localhost:5173
```

#### WSL-specific behavior

The bridge is WSL-aware:
- Windows-style paths (e.g. `C:\projects\myapp`) typed into the workspace picker are auto-translated to `/mnt/c/projects/myapp` before being passed to Python.
- Browser-entered base URLs of `localhost` / `127.0.0.1` are rewritten to the Windows host's default gateway IP, so Hermes running in WSL can reach an LLM server running on Windows (LM Studio, Ollama, etc.).

Both rewrites are logged into the Hermes runtime panel so you always know what the agent actually saw.

## Build a Windows installer from source

Run from a Windows PowerShell (not inside WSL — it needs native Windows `npm`):

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\Build-Windows-Installer.ps1
```

This copies the repo out of WSL into `C:\temp\hermes-agent-build`, runs `npm install`, builds Vite + electron-builder, and writes the resulting `Hermes Agent Setup X.Y.Z.exe` into the repo's `distribution/` folder.

Manual equivalent (on Windows):

```powershell
npm install
npm run build
npm run dist:win
```

## Settings → what is wired

| Setting                | What it does                                                                 | CLI flag           |
|------------------------|------------------------------------------------------------------------------|--------------------|
| Provider + Model       | Selects the LLM Hermes uses as its reasoning engine                          | `--model`          |
| Base URL               | OpenAI-compatible endpoint                                                   | `--base_url`       |
| API Key                | Forwarded to the provider                                                    | `--api_key`        |
| Max Iterations         | Cap on agent loop iterations                                                 | `--max_turns`      |
| Logging Verbosity      | `verbose` sets `--verbose`; other values stay quiet                          | `--verbose`        |
| Reasoning Effort       | Forwarded as `HERMES_REASONING_EFFORT` env (agent core does not consume yet) | *(env only)*       |

Behavior settings are read **live from storage on every send** — you don't have to re-save Settings between runs.

## Tests

```bash
npm run test         # unit tests (Vitest)
npm run test:e2e     # full Playwright E2E, including a real-agent file-write test
```

The real-agent test (`e2e/tests/agent-integration.spec.js`) launches the Electron app, points it at a local LLM, and asserts the agent actually writes a file to disk with the expected contents.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). TL;DR: fork, branch with `feat/` / `fix/` / `docs/`, run the tests, open a PR.

## License

MIT — see [LICENSE](LICENSE).
