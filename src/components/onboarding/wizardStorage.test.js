// Unit tests for the pure wizard-storage helpers. These run in plain Node
// under vitest — no DOM / React-Testing-Library needed — so they stay
// fast and deterministic.
//
// The tests exist to nail down TWO regressions:
//   1. The old onboarding wizard wrote a bunch of tools-related keys
//      (webSearchEnabled / firecrawlApiKey / visionEnabled /
//       ttsEnabled / ttsProvider). The user wanted those out of the
//      wizard. buildWizardStorageWrites must not return any of them.
//   2. The wizard must still persist the core agent settings (provider,
//      model, api key, base url, iteration + reasoning knobs, and the
//      "onboarding done" sentinel) — otherwise a completed wizard looks
//      like an incomplete one on reload and the user gets stuck in a
//      loop.

import { describe, it, expect } from 'vitest'
import { KEYS } from '@/lib/storage'
import {
  defaultWizardSettings,
  buildWizardStorageWrites,
  WIZARD_INTERMEDIATE_STEPS,
  REMOVED_WIZARD_KEYS,
} from './wizardStorage.js'

describe('defaultWizardSettings', () => {
  it('has the minimum fields the wizard steps bind to', () => {
    // If someone adds a required step later and forgets to seed the field,
    // this test fires before a runtime crash.
    expect(defaultWizardSettings).toMatchObject({
      provider: '',
      apiKey: '',
      baseUrl: '',
      model: '',
      maxTurns: expect.any(Number),
      reasoningEffort: expect.any(String),
      toolProgress: expect.any(String),
    })
  })

  it('has no leftover tools fields (webSearchEnabled, etc.)', () => {
    for (const removed of REMOVED_WIZARD_KEYS) {
      expect(defaultWizardSettings).not.toHaveProperty(removed)
    }
  })

  it('is frozen (accidental mutation would leak between wizard re-opens)', () => {
    expect(Object.isFrozen(defaultWizardSettings)).toBe(true)
  })
})

describe('WIZARD_INTERMEDIATE_STEPS', () => {
  it('is exactly 2 now that the Tools step is gone', () => {
    // Pre-change: 3 (Provider, Agent, Tools).
    // Post-change: 2 (Provider, Agent).
    expect(WIZARD_INTERMEDIATE_STEPS).toBe(2)
  })
})

describe('buildWizardStorageWrites', () => {
  const baseSettings = {
    provider: 'local',
    apiKey: '',
    baseUrl: 'http://172.30.224.1:42427/v1',
    model: 'qwen3-coder-30b',
    maxTurns: 90,
    reasoningEffort: 'medium',
    toolProgress: 'all',
  }

  it('writes every key the main app reads on boot', () => {
    const w = buildWizardStorageWrites(baseSettings)
    expect(w[KEYS.PROVIDER]).toBe('local')
    expect(w[KEYS.MODEL]).toBe('qwen3-coder-30b')
    expect(w[KEYS.API_KEY]).toBe('')
    expect(w[KEYS.BASE_URL]).toBe('http://172.30.224.1:42427/v1')
    expect(w[KEYS.MAX_TURNS]).toBe(90)
    expect(w[KEYS.REASONING]).toBe('medium')
    expect(w[KEYS.TOOL_PROGRESS]).toBe('all')
  })

  it('sets the onboarding-done sentinel so the wizard does not re-open', () => {
    const w = buildWizardStorageWrites(baseSettings)
    expect(w[KEYS.ONBOARDING_DONE]).toBe(true)
  })

  it('falls back to a default base URL when the user leaves it blank', () => {
    const w = buildWizardStorageWrites({ ...baseSettings, baseUrl: '' })
    expect(w[KEYS.BASE_URL]).toBe('http://localhost:42424/v1')
  })

  it('treats whitespace-only baseUrl as blank and falls back', () => {
    const w = buildWizardStorageWrites({ ...baseSettings, baseUrl: '   ' })
    expect(w[KEYS.BASE_URL]).toBe('http://localhost:42424/v1')
  })

  it('does NOT write any of the removed tools keys', () => {
    const w = buildWizardStorageWrites(baseSettings)
    for (const removed of REMOVED_WIZARD_KEYS) {
      expect(w).not.toHaveProperty(removed)
    }
  })

  it('throws when given a non-object (guards against null settings)', () => {
    expect(() => buildWizardStorageWrites(null)).toThrow()
    expect(() => buildWizardStorageWrites(undefined)).toThrow()
  })
})
