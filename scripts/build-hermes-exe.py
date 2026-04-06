#!/usr/bin/env python3
"""
Build a standalone hermes-gateway.exe using PyInstaller.

This script:
1. Clones or updates the Hermes Agent repo
2. Installs it + PyInstaller into a venv
3. Runs PyInstaller to produce a single-folder distribution
4. Copies the output into bundled-backend/hermes-backend/

Usage:
    python scripts/build-hermes-exe.py

Requirements:
    Python 3.11+ on the build machine (not needed by end users)
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

REPO_URL = "https://github.com/nousresearch/hermes-agent.git"
ROOT = Path(__file__).resolve().parent.parent
HERMES_SRC = ROOT / "bundled-backend" / "hermes-src"
OUTPUT_DIR = ROOT / "bundled-backend" / "hermes-backend"
VENV_DIR = ROOT / "bundled-backend" / ".build-venv"

def run(cmd, **kwargs):
    print(f"  $ {cmd if isinstance(cmd, str) else ' '.join(cmd)}")
    subprocess.check_call(cmd, **kwargs)

def main():
    print("=" * 60)
    print("Hermes Agent — Standalone Windows Build")
    print("=" * 60)

    # ── 1. Clone or update source ──────────────────────────────
    if (HERMES_SRC / ".git").exists():
        print("\n[1/5] Updating Hermes Agent source...")
        run(["git", "pull", "origin", "main"], cwd=HERMES_SRC)
    else:
        print("\n[1/5] Cloning Hermes Agent...")
        HERMES_SRC.parent.mkdir(parents=True, exist_ok=True)
        run(["git", "clone", "--depth", "1", REPO_URL, str(HERMES_SRC)])

    # ── 2. Create/update build venv ────────────────────────────
    python = sys.executable
    if sys.platform == "win32":
        venv_python = VENV_DIR / "Scripts" / "python.exe"
        venv_pip = VENV_DIR / "Scripts" / "pip.exe"
    else:
        venv_python = VENV_DIR / "bin" / "python"
        venv_pip = VENV_DIR / "bin" / "pip"

    if not venv_python.exists():
        print("\n[2/5] Creating build virtualenv...")
        run([python, "-m", "venv", str(VENV_DIR)])
    else:
        print("\n[2/5] Build virtualenv exists, reusing...")

    print("\n[3/5] Installing Hermes Agent + gateway deps + PyInstaller...")
    run([str(venv_pip), "install", "-e", f"{HERMES_SRC}[messaging,cron,cli,mcp,pty]", "--quiet"])
    run([str(venv_pip), "install", "pyinstaller>=6.0", "--quiet"])

    # ── 3. Write PyInstaller spec ──────────────────────────────
    print("\n[4/5] Running PyInstaller...")

    spec_content = f"""
# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from pathlib import Path

block_cipher = None

hermes_src = r"{HERMES_SRC}"

# Collect all hermes packages
packages_to_collect = [
    "hermes_cli", "agent", "gateway", "tools", "cron",
    "plugins", "acp_adapter",
    # Key dependencies that have data files
    "openai", "anthropic", "httpx", "rich", "pydantic",
    "certifi", "charset_normalizer", "jinja2",
]

a = Analysis(
    [os.path.join(hermes_src, "hermes")],
    pathex=[hermes_src],
    binaries=[],
    datas=[
        (os.path.join(hermes_src, "tools", "neutts_samples"), os.path.join("tools", "neutts_samples")),
        (os.path.join(hermes_src, "acp_registry"), "acp_registry"),
    ],
    hiddenimports=[
        "hermes_cli", "hermes_cli.main", "hermes_cli.gateway",
        "gateway.run", "gateway.config", "gateway.platforms.api_server",
        "agent.anthropic_adapter", "agent.auxiliary_client",
        "agent.prompt_builder",
        "aiohttp", "aiohttp.web",
        "openai", "anthropic",
        "yaml", "jinja2", "pydantic",
        "rich", "rich.console", "rich.markdown",
        "prompt_toolkit",
        "edge_tts",
        "exa_py", "firecrawl",
        "tenacity", "httpx",
        "sqlite3",
        "ssl", "certifi",
        "_cffi_backend",
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "scipy", "numpy.testing"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="hermes-gateway",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="hermes-gateway",
)
"""

    spec_path = ROOT / "bundled-backend" / "hermes-gateway.spec"
    spec_path.write_text(spec_content.strip())

    run([
        str(venv_python), "-m", "PyInstaller",
        "--distpath", str(ROOT / "bundled-backend" / "pyinstaller-dist"),
        "--workpath", str(ROOT / "bundled-backend" / "pyinstaller-build"),
        "--noconfirm",
        str(spec_path),
    ])

    # ── 4. Copy output to final location ───────────────────────
    print("\n[5/5] Copying to bundled-backend/hermes-backend/...")
    pyinstaller_output = ROOT / "bundled-backend" / "pyinstaller-dist" / "hermes-gateway"

    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    shutil.copytree(pyinstaller_output, OUTPUT_DIR)

    # Verify the exe exists
    exe_name = "hermes-gateway.exe" if sys.platform == "win32" else "hermes-gateway"
    exe_path = OUTPUT_DIR / exe_name
    if exe_path.exists():
        size_mb = exe_path.stat().st_size / (1024 * 1024)
        print(f"\n{'=' * 60}")
        print(f"SUCCESS: {exe_path}")
        print(f"Size: {size_mb:.1f} MB")
        print(f"{'=' * 60}")
    else:
        print(f"\nWARNING: Expected exe not found at {exe_path}")
        print("Check the PyInstaller output above for errors.")
        sys.exit(1)

    # Cleanup build artifacts
    for cleanup in ["pyinstaller-dist", "pyinstaller-build", "hermes-gateway.spec"]:
        p = ROOT / "bundled-backend" / cleanup
        if p.is_dir():
            shutil.rmtree(p)
        elif p.is_file():
            p.unlink()

    print("\nDone! The Electron app will now use this bundled exe.")
    print("Run 'npm run dist:full' to build the Windows installer.")

if __name__ == "__main__":
    main()
