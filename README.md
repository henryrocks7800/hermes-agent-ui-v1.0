# Hermes Agent Desktop

Welcome to **Hermes Agent Desktop**! This is a beautiful, easy-to-use Windows application that brings the power of the Hermes AI coding assistant directly to your desktop.

## What is this?
Hermes is an AI agent that helps you write code, manage files, run terminal commands, and automate software development tasks. Originally built as a Command Line (CLI) tool, this project wraps that powerful engine into a native, modern, and user-friendly desktop interface. 

Even if you aren't a terminal wizard, you can now chat with Hermes, attach files, ask it to read your code, and let it work for you—all from a sleek chat window.

## Key Features
- **Plug-and-Play AI:** Connects to OpenAI, Anthropic, OpenRouter, or even runs completely offline using local models via Ollama or LM Studio.
- **Native OS Integration:** Attach files directly from your computer to give the AI context.
- **Slash Commands & Context:** Type `/` to easily access commands, or `@` to quickly link local files and folders.
- **Light & Dark Mode:** Built-in theme toggling to suit your visual preference.
- **Complete Privacy Control:** You hold the API keys, and you choose what the AI can see.

## Free and Open Source
This project is **100% Free and Open Source** under the MIT License. You are completely free to use it, modify it, share it, and build upon it. We believe powerful AI tools should be accessible to everyone without mandatory subscriptions or walled gardens.

## ⚠️ Alpha Status
**This project is currently in Alpha.** It is functional and usable, but we're actively discovering and fixing bugs, improving stability, and refining the user experience. Your feedback and contributions are critical to making this production-ready!

## 🤝 We Need Your Help to Grow!
We want this to be the best open-source desktop AI assistant available, and we welcome contributions from developers of all skill levels! 

**TOP PRIORITY (Alpha Stabilization):**
1. **🧪 Testing & Bug Fixing:** The #1 priority right now is testing the Windows app thoroughly and fixing bugs. Try different AI providers, test edge cases, file issues for crashes or unexpected behavior. Check the [QA Test Suite](e2e/tests/qa-settings.spec.js) for what's already been validated.
2. **📋 Issue Triage:** Help us organize, reproduce, and prioritize reported bugs and feature requests.
3. **📝 Documentation:** Help improve setup guides, troubleshooting docs, and user-facing documentation based on what confuses new users.

**Future Enhancements (After Alpha):**
1. **🍏 macOS Version:** Once Windows is stable, help port to Apple Silicon! Electron supports cross-platform builds.
2. **🐧 Linux Native Version:** Package for Ubuntu/Debian (`.deb`, AppImage, or Flatpak).
3. **🎙️ Voice Chat Feature:** Add speech-to-text (STT) and text-to-speech (TTS) for hands-free interaction.

### How to Contribute
1. Fork the repository on GitHub.
2. Clone it locally and run `npm install` followed by `npm run dev:web`.
3. Make your awesome changes.
4. Run the tests with `npm run test:e2e` to make sure everything works perfectly.
5. Open a Pull Request!

## Building

### Development Mode
Run the web UI in hot-reload development mode:
```bash
npm run dev:web
```
Opens at http://localhost:5173

### Web Build
Build the web assets for production:
```bash
npm run build
```
Output goes to `web-dist/`

### Testing
Run the end-to-end test suite (Playwright):
```bash
npm run test:e2e
```

Run QA settings tests only:
```bash
npx playwright test qa-settings
```

### Windows Installer (Automated)
The easiest way to build the Windows installer is to use the provided PowerShell script. This script:
1. Copies the project to a temporary Windows build directory (avoiding WSL UNC path issues)
2. Installs dependencies
3. Builds web assets with Vite
4. Packages the app with electron-builder
5. Verifies the build output
6. Copies the installer back to the project `dist/` folder

**From Windows (PowerShell):**
```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\Build-Windows-Installer.ps1
```

**From WSL/Linux:**
```bash
powershell.exe -ExecutionPolicy Bypass -File "/mnt/c/tmp/Build-Windows-Installer.ps1"
```
(Note: copy the script to your Windows temp folder first if needed)

The resulting `.exe` installer will be in `dist/` and ready to ship.

### Windows Installer (Manual)
If you prefer to build manually on Windows:
```powershell
npm install
npm run build
npm run dist:win
```

### Electron Dev Mode
Launch the Electron app with the latest build:
```bash
npm run electron:dev
```

## License
MIT License - See the [LICENSE](LICENSE) file for details.
