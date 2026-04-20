import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { app } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

export function getBackendPath() {
  if (isDev) {
    return path.join(__dirname, 'bundled-backend', 'hermes-backend', 'hermes-backend')
  }
  return path.join(process.resourcesPath, 'hermes-backend', 'hermes-backend')
}
