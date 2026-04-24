#!/usr/bin/env node
// One-command browser dev: starts the local Hermes bridge AND Vite,
// streams both logs to the terminal, and kills both on Ctrl-C.
//
// Usage:  npm run dev:browser
//   → http://localhost:5173  (UI)
//   → http://127.0.0.1:42500 (bridge — real Hermes runtime)

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const children = []

function start(label, cmd, args, color) {
  const child = spawn(cmd, args, { cwd: ROOT, env: process.env })
  children.push(child)
  const prefix = `\x1b[${color}m[${label}]\x1b[0m `
  child.stdout.on('data', (d) => process.stdout.write(prefix + d.toString().replace(/\n(.)/g, `\n${prefix}$1`)))
  child.stderr.on('data', (d) => process.stderr.write(prefix + d.toString().replace(/\n(.)/g, `\n${prefix}$1`)))
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`)
    shutdown(code ?? 0)
  })
  return child
}

function shutdown(code = 0) {
  for (const c of children) { try { c.kill('SIGTERM') } catch {} }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

start('bridge', process.execPath, [path.join(ROOT, 'scripts', 'hermes-bridge-server.mjs')], '36')
start('vite',   process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', 'localhost', '--port', '5173'], '35')
