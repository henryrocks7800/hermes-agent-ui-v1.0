#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /AIza[a-zA-Z0-9-_]{35}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/,
  /\/home\/[a-zA-Z0-9]+\//,
]

const SKIP = ['node_modules', '.git', 'dist', 'web-dist', 'bundled-backend', 'scripts']

function scan(dir) {
  let found = 0
  for (const entry of readdirSync(dir)) {
    if (SKIP.includes(entry)) continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) { found += scan(full); continue }
    if (!/\.(js|jsx|ts|tsx|json|md|yaml|yml|html|css)$/.test(entry)) continue
    const content = readFileSync(full, 'utf8')
    for (const pat of PATTERNS) {
      if (pat.test(content)) {
        console.error(`SECRET FOUND in ${full}: ${pat}`)
        found++
      }
    }
  }
  return found
}

const count = scan('.')
if (count > 0) { console.error(`\n${count} potential secret(s) found. Fix before committing.`); process.exit(1) }
console.log('No secrets found.')
