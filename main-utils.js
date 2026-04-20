import path from 'path'
import { fileURLToPath } from 'url'
import electron from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function isDevMode() {
  const app = electron?.app
  return process.env.NODE_ENV === 'development' || !app || !app.isPackaged
}

export function getBackendPath() {
  if (isDevMode()) {
    return path.join(__dirname, 'bundled-backend', 'hermes-backend', 'hermes-backend')
  }
  return path.join(process.resourcesPath, 'hermes-backend', 'hermes-backend')
}
