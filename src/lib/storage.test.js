import { describe, it, expect, beforeEach, vi } from 'vitest'
import { storage, KEYS } from './storage'

let data

describe('storage helper', () => {
  beforeEach(() => {
    data = new Map()
    const storageMock = {
      getItem: vi.fn((key) => data.has(key) ? data.get(key) : null),
      setItem: vi.fn((key, value) => data.set(key, value)),
      removeItem: vi.fn((key) => data.delete(key)),
      key: vi.fn((index) => Array.from(data.keys())[index] ?? null),
      clear: vi.fn(() => data.clear()),
    }
    Object.defineProperty(storageMock, 'length', {
      get: () => data.size,
      configurable: true,
    })
    vi.stubGlobal('localStorage', storageMock)
  })

  it('returns fallback when key is missing', () => {
    expect(storage.get(KEYS.MODEL, 'fallback')).toBe('fallback')
  })

  it('parses stored json values', () => {
    storage.set(KEYS.MODEL, 'qwen3-coder-30b')
    expect(storage.get(KEYS.MODEL)).toBe('qwen3-coder-30b')
  })

  it('removes a single namespaced key', () => {
    storage.set(KEYS.MODEL, 'abc')
    storage.remove(KEYS.MODEL)
    expect(storage.get(KEYS.MODEL, null)).toBeNull()
  })

  it('clear is safe to call with mixed local storage content', () => {
    localStorage.setItem('hermes.model', JSON.stringify('abc'))
    localStorage.setItem('other.key', JSON.stringify('keep'))
    expect(() => storage.clear()).not.toThrow()
  })
})
