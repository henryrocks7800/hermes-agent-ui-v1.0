import { describe, it, expect, vi, beforeEach } from 'vitest'
import { streamChat, markdownToHtml } from './chatStream'

function createSseResponse(lines) {
  const encoder = new TextEncoder()
  return {
    ok: true,
    body: new ReadableStream({
      start(controller) {
        for (const line of lines) controller.enqueue(encoder.encode(line))
        controller.close()
      }
    })
  }
}

describe('streamChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('streams tokens, thinking, tool calls, and done events', async () => {
    const onToken = vi.fn()
    const onThinking = vi.fn()
    const onToolCall = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async () => createSseResponse([
      'data: {"choices":[{"delta":{"reasoning_content":"thinking"}}]}\n',
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"function":{"name":"browser"}}]}}]}\n',
      'data: [DONE]\n',
    ])))

    await streamChat({
      baseUrl: 'http://localhost:42424/v1',
      model: 'qwen3-coder-30b',
      messages: [],
      onToken,
      onThinking,
      onToolCall,
      onDone,
      onError,
    })

    expect(onThinking).toHaveBeenCalled()
    expect(onToken).toHaveBeenCalledWith('Hello')
    expect(onToolCall).toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('surfaces non-ok http responses as errors', async () => {
    const onError = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: 'bad key' } }),
    })))

    await streamChat({
      baseUrl: 'http://localhost:42424/v1',
      model: 'gpt-4o',
      messages: [],
      onToken: vi.fn(),
      onToolCall: vi.fn(),
      onDone: vi.fn(),
      onError,
    })

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'HTTP 401: bad key' }))
  })

  it('calls onError when fetch throws', async () => {
    const onError = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    await streamChat({
      baseUrl: 'http://localhost:42424/v1',
      model: 'gpt-4o',
      messages: [],
      onToken: vi.fn(),
      onToolCall: vi.fn(),
      onDone: vi.fn(),
      onError,
    })
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'network down' }))
  })
})

describe('markdownToHtml', () => {
  it('renders code blocks, emphasis, links, and lists', () => {
    const html = markdownToHtml('### Title\n\n- item\n\n`code`\n\n[Docs](https://example.com)\n\n**bold** *italic*')
    expect(html).toContain('<h3')
    expect(html).toContain('<ul')
    expect(html).toContain('<code')
    expect(html).toContain('https://example.com')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })
})
