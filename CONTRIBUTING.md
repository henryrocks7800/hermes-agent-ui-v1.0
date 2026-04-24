# Contributing to Hermes Agent Desktop

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Python 3.12+** with the Hermes Agent checked out at `~/.hermes/hermes-agent` (see `bundled-backend/ui-wrapper.py` for the hard-coded path — see "Adjusting the Hermes path" below to customise)
- A Python venv at `<repo>/.venv-build/bin/python` with Hermes' dependencies installed. `scripts/build-bundled-backend.sh` creates one.

## Getting the UI running

```bash
git clone https://github.com/<your-username>/hermes-agent-ui-v1.0.git
cd hermes-agent-ui-v1.0
npm install
npm run dev:browser      # starts bridge + vite together
```

Open <http://localhost:5173>. The first message you send spawns `ui-wrapper.py → run_agent.py` and streams its transcript into the chat bubble.

If the chat window shows **"Hermes runtime is not reachable"**, the bridge is down. Start it by itself:

```bash
npm run bridge
# → hermes-bridge listening on http://127.0.0.1:42500
```

## Architecture in one diagram

```
Browser / Electron renderer  ─┐
                              │  POST /agent/run  (bridge mode)
                              │  window.hermesDesktop.runAgent (Electron mode)
                              ▼
                    scripts/hermes-bridge-server.mjs  (Node)
                              │  spawn
                              ▼
                    bundled-backend/ui-wrapper.py
                              │  subprocess
                              ▼
                    ~/.hermes/hermes-agent/run_agent.py
                              │  OpenAI / Anthropic / local
                              ▼
                    your configured LLM
```

The UI never calls an LLM directly. A message always produces a real agent run.

## Layout

- `src/components/chat/ChatPage.jsx` — message flow, runtime-event rendering, bridge/IPC dispatch
- `src/components/chat/Composer.jsx` — entry box, slash-command menu, workspace picker, file attach
- `src/components/pages/SettingsPage.jsx` — provider/model/keys, max iterations, live connection check
- `scripts/hermes-bridge-server.mjs` — HTTP bridge used by the browser dev path
- `bundled-backend/ui-wrapper.py` — translates `HERMES_*` env vars into `run_agent.py` CLI flags
- `main.js` + `preload.cjs` — Electron main + preload (note: `.cjs` because the repo is an ES module)
- `e2e/tests/agent-integration.spec.js` — real-agent E2E that asserts a file write on disk

## Running tests

```bash
npm run test          # unit (Vitest)
npm run test:e2e      # full Playwright suite (launches Electron)
npx playwright test qa-settings   # settings-only subset
```

Playwright browsers:

```bash
npx playwright install --with-deps
```

## Building a Windows installer

From Windows PowerShell (not WSL):

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\Build-Windows-Installer.ps1
```

The script excludes `node_modules`, `.git`, `.venv-build`, `dist`, `distribution`, `test-results`, and `web-dist` during the copy (broken symlinks in the Linux venv otherwise break robocopy). The resulting `.exe` is written to `distribution/` in the repo.

## Adjusting the Hermes path

`bundled-backend/ui-wrapper.py` currently hard-codes `/home/henry/.hermes/hermes-agent` at the top. If your Hermes checkout lives elsewhere, patch that constant or set `HERMES_AGENT_ROOT` in your env (the wrapper should prefer env when set — good first contribution 🙂).

## Branch naming

| Prefix   | Use for                              |
|----------|--------------------------------------|
| `feat/`  | New features                         |
| `fix/`   | Bug fixes                            |
| `docs/`  | Documentation changes only           |
| `chore/` | Tooling, CI, dependency bumps        |

## PR process

1. Fork the repo and branch from `main`.
2. `npm run test` and `npm run test:e2e` should pass locally.
3. Include a screenshot or short clip if your change is visual.
4. Open a PR. We squash-merge.

## Code style

- Tailwind + shadcn/ui + Radix — reuse before introducing new UI primitives.
- Don't add formatters / linters without discussion.
- Small focused components. Split files when they grow past ~400 lines.
- Match the file structure under `src/` rather than inventing new top-level folders.

## Common pitfalls

- **WSL paths vs Windows paths.** Anything entered through the UI in the browser dev path is post-processed by the bridge: `C:\foo` → `/mnt/c/foo`, and `localhost`/`127.0.0.1` base URLs → the Windows host's gateway IP. If you change the bridge, keep those transforms intact or you'll break cross-WSL dev for everyone.
- **`main` is ESM (`"type": "module"`).** The Electron preload must stay `preload.cjs` (CommonJS) or the preload silently fails to load.
- **`.venv-build` has Linux-only symlinks.** Don't commit it; robocopy from Windows will choke. The Windows installer script excludes it.

## Roadmap priorities (where help is most useful)

1. **macOS build target** — electron-builder config is there; we just need a runner and a test workflow.
2. **Linux native packaging** (`.deb`, AppImage).
3. **Agent-side support for reasoning_effort** so the UI toggle is not a no-op.
4. **Replacing the hard-coded Hermes path** with an env var + onboarding-time path picker.
5. **Voice chat (STT/TTS)** using the existing `text_to_speech` tool.
