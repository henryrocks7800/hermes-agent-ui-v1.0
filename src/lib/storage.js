const PREFIX = 'hermes.'

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (raw === null) return fallback
      return JSON.parse(raw)
    } catch { return fallback }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch {}
  },
  remove(key) {
    localStorage.removeItem(PREFIX + key)
  },
  clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX))
    keys.forEach(k => localStorage.removeItem(k))
  },
}

// Settings keys used across the app
export const KEYS = {
  ONBOARDING_DONE: 'onboardingCompleted',
  PROVIDER:        'provider',
  MODEL:           'model',
  API_KEY:         'apiKey',
  BASE_URL:        'baseUrl',
  BACKEND_MODE:    'backendMode',
  EXTERNAL_URL:    'externalUrl',
  MAX_TURNS:       'maxTurns',
  REASONING:       'reasoningEffort',
  TOOL_PROGRESS:   'toolProgress',
  COMPRESSION:     'compressionThreshold',
  THREADS:         'threads',
  ACTIVE_THREAD:   'activeThreadId',
}
