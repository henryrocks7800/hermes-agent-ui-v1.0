#!/usr/bin/env node
// Local HTTP bridge that spawns the same ui-wrapper.py the Electron
// main process uses, so the web dev server (Vite at :5173) can drive the
// REAL Hermes runtime — same transcript, same tool calls, same disk writes.
//
// Endpoint:
//   POST /agent/run
//     Content-Type: application/json
//     Body: { query, cwd, env }
//   Response: chunked text/plain; one raw stdout/stderr stream.
//
// Intentionally minimal: no auth, bind to loopback only, single shot per request.

import http from 'http'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PORT = Number(process.env.HERMES_BRIDGE_PORT || 42500)
const HOST = '127.0.0.1'

const PYTHON = path.join(ROOT, '.venv-build', 'bin', 'python')
const WRAPPER = path.join(ROOT, 'bundled-backend', 'ui-wrapper.py')

// Windows drive path → /mnt/<drive>/... WSL path
function toWslPath(p) {
  if (!p) return p
  const m = /^([A-Za-z]):[\\/](.*)$/.exec(p)
  if (!m) return p
  const drive = m[1].toLowerCase()
  const rest = m[2].replace(/\\/g, '/')
  return `/mnt/${drive}/${rest}`
}

// Discover the Windows host IP as seen from WSL: the default gateway in
// /proc/net/route, which is reachable for services bound on the Windows side.
// The resolv.conf nameserver (e.g. 10.255.255.254) is NOT the host — it's WSL's DNS proxy.
let WINDOWS_HOST_IP = null
try {
  const routeText = fs.readFileSync('/proc/net/route', 'utf8')
  const lines = routeText.split('\n').slice(1)
  for (const line of lines) {
    const cols = line.trim().split(/\s+/)
    if (cols.length >= 3 && cols[1] === '00000000' && cols[2] !== '00000000') {
      const hex = cols[2]
      const bytes = [hex.slice(6, 8), hex.slice(4, 6), hex.slice(2, 4), hex.slice(0, 2)]
      WINDOWS_HOST_IP = bytes.map((b) => parseInt(b, 16)).join('.')
      break
    }
  }
} catch {}

function rewriteHostForWsl(url) {
  if (!url || !WINDOWS_HOST_IP) return url
  return url
    .replace(/\/\/127\.0\.0\.1(?=[:\/]|$)/, `//${WINDOWS_HOST_IP}`)
    .replace(/\/\/localhost(?=[:\/]|$)/, `//${WINDOWS_HOST_IP}`)
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const server = http.createServer(async (req, res) => {
  cors(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, python: PYTHON, wrapper: WRAPPER }))
    return
  }

  if (req.method !== 'POST' || req.url !== '/agent/run') {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('not found')
    return
  }

  let body
  try { body = await readJson(req) }
  catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('bad json: ' + e.message)
    return
  }

  const { query = '', cwd, env = {} } = body
  if (!query) {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('missing query')
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
  })

  let resolvedCwd = cwd || process.cwd()
  const wslCwd = toWslPath(resolvedCwd)
  if (wslCwd !== resolvedCwd) {
    res.write(`[bridge] translating Windows path "${resolvedCwd}" -> "${wslCwd}"\n`)
    resolvedCwd = wslCwd
  }
  if (!fs.existsSync(resolvedCwd)) {
    res.write(`[bridge] cwd "${resolvedCwd}" does not exist; creating it\n`)
    try { fs.mkdirSync(resolvedCwd, { recursive: true }) }
    catch (e) {
      res.write(`[bridge] mkdir failed: ${e.message}; falling back to ${process.cwd()}\n`)
      resolvedCwd = process.cwd()
    }
  }

  // Rewrite any 127.0.0.1 / localhost in the forwarded env so the Python
  // child (running in WSL) can reach a Windows-side LLM server.
  const rewrittenEnv = { ...env }
  for (const key of ['HERMES_BASE_URL', 'OPENAI_BASE_URL', 'ANTHROPIC_BASE_URL']) {
    if (rewrittenEnv[key]) {
      const before = rewrittenEnv[key]
      const after = rewriteHostForWsl(before)
      if (after !== before) {
        res.write(`[bridge] rewriting ${key}: ${before} -> ${after}\n`)
        rewrittenEnv[key] = after
      }
    }
  }
  if (!fs.existsSync(PYTHON)) {
    res.write(`[bridge] python not found at ${PYTHON}\n`)
    res.end()
    return
  }
  if (!fs.existsSync(WRAPPER)) {
    res.write(`[bridge] wrapper not found at ${WRAPPER}\n`)
    res.end()
    return
  }

  res.write(`[bridge] spawn python=${PYTHON} wrapper=${WRAPPER} cwd=${resolvedCwd}\n`)

  const child = spawn(PYTHON, [WRAPPER, query], {
    cwd: resolvedCwd,
    env: { ...process.env, ...rewrittenEnv, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const write = (prefix, data) => {
    const text = data.toString('utf8')
    res.write(text)
  }

  child.stdout.on('data', (d) => write('', d))
  child.stderr.on('data', (d) => write('', d))

  const cleanup = () => { try { child.kill('SIGTERM') } catch {} }
  req.on('close', cleanup)

  child.on('error', (err) => {
    res.write(`\n[bridge] spawn error: ${err.message}\n`)
    res.end()
  })

  child.on('close', (code) => {
    res.write(`\n[bridge] child exit ${code}\n`)
    res.end()
  })
})

server.listen(PORT, HOST, () => {
  console.log(`hermes-bridge listening on http://${HOST}:${PORT}`)
  console.log(`  python:  ${PYTHON}`)
  console.log(`  wrapper: ${WRAPPER}`)
  console.log(`  windows host (auto): ${WINDOWS_HOST_IP || '(not detected)'}`)
})
