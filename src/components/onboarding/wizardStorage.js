// Pure helper for the onboarding wizard's storage layer.
//
// Kept DOM-free so vitest can exercise it in a plain Node environment
// (no jsdom / React Testing Library dependency). The wizard component
// imports `defaultWizardSettings` to seed its local state and
// `buildWizardStorageWrites` to compute which `storage.set` calls it
// should emit when the user finishes.

import { KEYS } from '@/lib/storage'

/**
 * Initial state for the onboarding wizard form.
 * Kept in sync with the fields actually written by
 * `buildWizardStorageWrites` so a test can catch silent drift.
 */
export const defaultWizardSettings = Object.freeze({
  provider: '',
  apiKey: '',
  baseUrl: '',
  model: '',
  maxTurns: 90,
  reasoningEffort: 'medium',
  toolProgress: 'all',
})

/**
 * Number of intermediate (non-Welcome, non-Completion) steps the wizard
 * renders. Tests assert this because the pre-deletion wizard had 3
 * (Provider + Agent + Tools) and we need to know the Tools step is gone.
 */
export const WIZARD_INTERMEDIATE_STEPS = 2

/**
 * Compute the flat set of `storage.set(key, value)` calls the wizard
 * should perform on completion. Returned as an object so the test can
 * assert exact keys/values without running React.
 *
 * The earlier wizard also wrote webSearchEnabled / firecrawlApiKey /
 * visionEnabled / ttsEnabled / ttsProvider — those have been removed
 * along with the ToolsStep. If you bring the tools-step back, update
 * BOTH this function and the test.
 */
export function buildWizardStorageWrites(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('buildWizardStorageWrites: settings object is required')
  }

  const writes = {
    [KEYS.PROVIDER]: settings.provider,
    [KEYS.MODEL]: settings.model,
    [KEYS.API_KEY]: settings.apiKey,
    // Empty baseUrl falls back to the local Hermes default so the first
    // message has SOMETHING to hit even if the user skipped the input.
    [KEYS.BASE_URL]: (settings.baseUrl && settings.baseUrl.trim())
      ? settings.baseUrl
      : 'http://localhost:42424/v1',
    [KEYS.MAX_TURNS]: settings.maxTurns,
    [KEYS.REASONING]: settings.reasoningEffort,
    [KEYS.TOOL_PROGRESS]: settings.toolProgress,
    [KEYS.ONBOARDING_DONE]: true,
  }

  return writes
}

/**
 * List of storage keys the wizard MUST NOT write anymore (they belonged
 * to the removed ToolsStep). Exposed so a test can prove future
 * regressions don't re-introduce them.
 */
export const REMOVED_WIZARD_KEYS = Object.freeze([
  'webSearchEnabled',
  'firecrawlApiKey',
  'visionEnabled',
  'ttsEnabled',
  'ttsProvider',
])
