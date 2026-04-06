# === Hermes Agent Windows Build Script (v5 - QA Fixes Build) ===
$ErrorActionPreference = "Stop"

$wslProjectPath = "\\wsl.localhost\Ubuntu\home\henry\.hermes\hermes-agent-ui-v1"
$tempBuildPath = "C:\temp\hermes-agent-build"

Write-Host "=== Hermes Agent Desktop - Windows Installer Build ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "--- Step 1: Preparing temp directory ---"
if (Test-Path -Path $tempBuildPath) { Remove-Item -Recurse -Force $tempBuildPath }
New-Item -ItemType Directory -Force -Path $tempBuildPath | Out-Null

Write-Host "--- Step 2: Copying project files from WSL ---"
robocopy $wslProjectPath $tempBuildPath /E /XD node_modules .git dist /NFL /NDL /NJH /NJS /nc /ns /np

Write-Host "--- Step 3: Installing Windows dependencies ---"
Set-Location -Path $tempBuildPath
$ErrorActionPreference = "Continue"
npm install 2>&1 | Select-Object -Last 5
$ErrorActionPreference = "Stop"

Write-Host "--- Step 4: Building web assets (Vite) ---"
$ErrorActionPreference = "Continue"
npm run build 2>&1 | Select-Object -Last 5
$ErrorActionPreference = "Stop"

Write-Host "--- Step 5: Building the Windows Installer (electron-builder) ---"
$ErrorActionPreference = "Continue"
npm run dist:win 2>&1 | Select-Object -Last 10
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "--- Step 6: Verifying build output ---"
$installerFiles = Get-ChildItem -Path "$tempBuildPath\dist\*Setup*.exe" -ErrorAction SilentlyContinue
if ($installerFiles) {
    foreach ($f in $installerFiles) {
        Write-Host "  Installer: $($f.Name)  Size: $([math]::Round($f.Length / 1MB, 2)) MB" -ForegroundColor Green
    }
} else {
    Write-Host "  ERROR: No installer EXE found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "--- Step 7: Copying installer back to WSL project ---"
$finalInstallerPath = Join-Path -Path $wslProjectPath -ChildPath "dist"
if (-not (Test-Path -Path $finalInstallerPath)) {
    New-Item -ItemType Directory -Force -Path $finalInstallerPath | Out-Null
}
Copy-Item -Path "$tempBuildPath\dist\*Setup*.exe" -Destination $finalInstallerPath -Force
Copy-Item -Path "$tempBuildPath\dist\*Setup*.exe" -Destination "C:\tmp\" -Force -ErrorAction SilentlyContinue

$installerName = $installerFiles[0].Name
Write-Host ""
Write-Host "=== BUILD COMPLETE ===" -ForegroundColor Green
Write-Host "  Installer: $finalInstallerPath\$installerName"
Write-Host "  Also at:   C:\tmp\$installerName"
