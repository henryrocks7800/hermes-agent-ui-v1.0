# Contributing to Hermes Agent UI

## Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later

## Local Development Setup

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/hermes-agent-ui-v1.0.git
   cd hermes-agent-ui-v1.0
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev:web
   ```
   The app will be available at `http://localhost:5173`.

## Running Tests

Run the full Playwright E2E test suite:

```bash
npm run test:e2e
```

To update visual regression snapshots:

```bash
npm run test:e2e:update
```

Playwright browsers are installed separately. If you haven't done so:

```bash
npx playwright install --with-deps
```

## Branch Naming Convention

Use one of the following prefixes when naming your branch:

| Prefix   | Use for                              |
|----------|--------------------------------------|
| `feat/`  | New features                         |
| `fix/`   | Bug fixes                            |
| `docs/`  | Documentation changes only           |

Example: `feat/add-model-selector`, `fix/sidebar-scroll-bug`

## Pull Request Process

1. Fork the repo and create a branch from `main` using the naming convention above.
2. Make your changes and ensure `npm run test:e2e` passes locally.
3. Open a pull request targeting the `main` branch.
4. Fill out the PR template with a clear description of what changed and why.
5. PRs are merged using **squash merge** — keep your commit history tidy but don't stress about it.

## Roadmap: Bundled Hermes Backend

> **This is the primary outstanding engineering goal for the project.**

Currently the UI connects to external AI providers (OpenAI, Anthropic, Ollama, etc.) via a configurable base URL. The goal is to bundle the **Hermes Agent binary** directly into the Electron app so it runs as the local engine behind the UI — no external setup required for end users.

What this involves:

- `scripts/build-bundled-backend.sh` — needs to pull the Hermes Agent release binary and place it in `bundled-backend/hermes-backend`
- `scripts/update-bundled-backend.sh` — needs to keep the bundled binary up to date
- `main.js` — needs to spawn the Hermes backend process on app launch and shut it down on close
- The UI should auto-detect and connect to the local Hermes instance, with external providers as a fallback

If you want to contribute, this is the highest-impact area. The backend repo is at [https://github.com/nousresearch/hermes-agent](https://github.com/nousresearch/hermes-agent).

## Code Style

- Formatting is handled by the project's existing Tailwind + Vite setup — don't introduce a separate formatter config without discussion.
- Use existing shadcn/ui components and Radix primitives before reaching for new dependencies.
- Prefer small, focused components. If a component is getting large, consider splitting it.
- Match the naming and file structure patterns already present in `src/`.
