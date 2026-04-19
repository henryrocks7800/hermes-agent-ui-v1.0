import { describe, it, expect } from 'vitest'
import { getCommandCompletions, getContextCompletions, COMMAND_MAP, PROVIDER_MODELS } from './commands'

describe('commands registry', () => {
  it('maps aliases to their canonical command', () => {
    expect(COMMAND_MAP.bg.name).toBe('background')
    expect(COMMAND_MAP.gateway.name).toBe('platforms')
  })

  it('returns base command matches', () => {
    const results = getCommandCompletions('/mo')
    expect(results.some((r) => r.value === 'model')).toBe(true)
  })

  it('returns subcommands once base command is complete', () => {
    const results = getCommandCompletions('/reasoning h')
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'high', parent: 'reasoning' }),
        expect.objectContaining({ value: 'hide', parent: 'reasoning' }),
      ])
    )
  })

  it('filters context references by prefixed token', () => {
    expect(getContextCompletions('@file:')).toEqual([
      expect.objectContaining({ value: '@file:' })
    ])
  })

  it('contains local runner model presets', () => {
    expect(PROVIDER_MODELS.ollama).toContain('qwen3-coder')
    expect(PROVIDER_MODELS.custom).toContain('qwen3-coder-next')
  })
})
