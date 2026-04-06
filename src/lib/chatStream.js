/**
 * Stream a chat completion from the Hermes backend.
 * Supports both SSE streaming and plain JSON fallback.
 *
 * @param {Object} opts
 * @param {string} opts.baseUrl - API base URL e.g. http://localhost:42424/v1
 * @param {string} opts.model
 * @param {Array}  opts.messages - OpenAI-format message array
 * @param {string} [opts.apiKey] - Bearer token if needed
 * @param {AbortSignal} [opts.signal]
 * @param {function} opts.onToken - called with each text chunk
 * @param {function} opts.onToolCall - called with tool call objects
 * @param {function} opts.onDone - called when stream ends
 * @param {function} opts.onError - called on error
 */
export async function streamChat({ baseUrl, model, messages, apiKey, signal, onToken, onToolCall, onDone, onError }) {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
  }
  const body = JSON.stringify({
    model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
  })

  let response
  try {
    response = await fetch(url, { method: 'POST', headers, body, signal })
  } catch (err) {
    onError?.(err)
    return
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    onError?.(new Error(`HTTP ${response.status}: ${text}`))
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') { onDone?.(); return }
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta
          if (delta?.content) onToken?.(delta.content)
          if (delta?.tool_calls) onToolCall?.(delta.tool_calls)
        } catch { /* malformed chunk — skip */ }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') onError?.(err)
  } finally {
    onDone?.()
  }
}

/**
 * Render markdown text to safe HTML for chat display.
 * Handles: code blocks with language, inline code, bold, italic, links, lists.
 * Does NOT execute scripts.
 */
export function markdownToHtml(text) {
  if (!text) return ''
  let html = text

  // Fenced code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const label = lang ? `<span class="text-xs text-muted-foreground absolute top-2 right-3">${lang}</span>` : ''
    return `<div class="relative"><pre class="font-mono text-xs bg-muted p-3 rounded-md overflow-x-auto my-2">${label}<code>${escaped}</code></pre></div>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">$1</code>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline underline-offset-2" target="_blank" rel="noopener">$1</a>')

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="font-semibold mb-1 mt-3">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="font-bold mb-1 mt-3">$1</h1>')

  // Unordered list
  html = html.replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, m => `<ul class="mb-2 space-y-0.5">${m}</ul>`)

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p class="mb-2">')
  if (!html.startsWith('<')) html = `<p class="mb-2">${html}</p>`

  // Single newlines
  html = html.replace(/([^>])\n([^<])/g, '$1<br>$2')

  return html
}
