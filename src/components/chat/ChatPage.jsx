import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { storage, KEYS } from '@/lib/storage'
import { streamChat, markdownToHtml } from '@/lib/chatStream'
import Composer from './Composer.jsx'
import { Bot, User, Loader2, Link2Off, AlertCircle, FolderOpen, TerminalSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatPage({ thread, onUpdateThread, connectionStatus, setConnectionStatus, settings }) {
  const [messages, setMessages] = useState(thread?.messages || [])
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const [toolCalls, setToolCalls] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const [runtimeEvents, setRuntimeEvents] = useState([])
  const scrollAreaRef = useRef(null)
  const currentResponseRef = useRef('')
  const runtimeEventsRef = useRef([])

  const appendRuntimeEvent = (event) => {
    runtimeEventsRef.current = [...runtimeEventsRef.current, event]
    setRuntimeEvents(runtimeEventsRef.current)
  }

  const resetRuntimeEvents = (initial = []) => {
    runtimeEventsRef.current = initial
    setRuntimeEvents(initial)
  }

  const { baseUrl, model, apiKey, provider, mode } = settings

  useEffect(() => {
    if (thread?.messages) {
      setMessages(thread.messages)
    } else if (!thread) {
      setMessages([{
        role: 'assistant',
        content: `Hermes is ready. Select a project folder, then tell me what you want to build or change.`,
        timestamp: Date.now()
      }])
    }
  }, [thread?.id])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, currentResponse])

  const handleSendMessage = async (content) => {
    if (!content.trim() || isStreaming) return

    const userMessage = { role: 'user', content, timestamp: Date.now() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    currentResponseRef.current = ''
    setCurrentResponse('')
    setToolCalls([])
    setIsThinking(false)
    resetRuntimeEvents([
      { type: 'status', text: 'Initializing Hermes agent...' },
      { type: 'meta', text: `Provider: ${provider} · Model: ${model || 'none selected'}` },
      { type: 'meta', text: `Endpoint: ${baseUrl}` },
    ])
    setIsStreaming(true)

    let currentThread = thread
    if (thread) {
      onUpdateThread({ ...thread, messages: updatedMessages })
    } else {
      currentThread = {
        id: Date.now().toString(),
        title: content.slice(0, 40),
        createdAt: new Date().toISOString(),
        messages: updatedMessages
      }
      onUpdateThread(currentThread)
    }

    const projectFolder = storage.get('projectFolder', '')
    const systemPrompt = `You are Hermes, an autonomous software engineering agent.\nWork agentically, by planning changes and producing filesystem-oriented work for the selected project folder when appropriate.\nProject folder: ${projectFolder || 'not selected'}.\nDo not dump large implementation files into chat unless explicitly asked.\nBe concise, direct, and action-oriented.`
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...updatedMessages.map(m => ({ role: m.role, content: m.content })),
    ]

    const onDone = () => {
      const assistantMessage = {
        role: 'assistant',
        content: currentResponseRef.current,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        runtimeEvents: [...runtimeEventsRef.current],
        timestamp: Date.now(),
      }
      const finalMessages = [...updatedMessages, assistantMessage]
      setMessages(finalMessages)

      if (currentThread) {
        onUpdateThread({ ...currentThread, messages: finalMessages })
      }

      currentResponseRef.current = ''
      setCurrentResponse('')
      resetRuntimeEvents([])
      setIsStreaming(false)
    }

    const onError = (err) => {
      console.error('Stream error:', err)
      const message = err.message || 'Connection failed'
      setConnectionStatus('disconnected')

      const errorMessage = {
        role: 'assistant',
        content: `### Connection error\n\nI could not verify the selected provider.\n\n**Provider:** ${provider}\n**Model:** ${model || 'none selected'}\n**Base URL:** \`${baseUrl}\`\n**Error:** ${message}`,
        timestamp: Date.now(),
        isError: true,
        runtimeEvents: [
          ...runtimeEventsRef.current,
          { type: 'warning', text: 'The request failed before Hermes could complete the turn.' },
        ],
        debug: { baseUrl, provider, model, mode, hasKey: !!apiKey }
      }
      const errorMessages = [...updatedMessages, errorMessage]
      setMessages(errorMessages)
      
      if (currentThread) {
        onUpdateThread({ ...currentThread, messages: errorMessages })
      }
      
      setIsStreaming(false)
    }

    // Pull behaviour settings live from storage so the user does not need to
    // re-save Settings to make them take effect on the next run.
    const maxTurns = storage.get('maxTurns', 90)
    const reasoningEffort = storage.get('reasoningEffort', 'medium')
    const toolProgress = storage.get('toolProgress', 'all')

    const runAgentEnv = {
      HERMES_MODEL: model || '',
      HERMES_BASE_URL: baseUrl || '',
      HERMES_PROVIDER: provider || '',
      HERMES_API_KEY: apiKey || '',
      HERMES_MAX_TURNS: String(maxTurns || ''),
      HERMES_REASONING_EFFORT: reasoningEffort || '',
      HERMES_TOOL_PROGRESS: toolProgress || '',
      OPENAI_BASE_URL: baseUrl,
      OPENROUTER_API_KEY: provider === 'openrouter' ? apiKey : undefined,
      ANTHROPIC_API_KEY: provider === 'anthropic' ? apiKey : undefined,
      OPENAI_API_KEY: provider === 'openai' ? apiKey : (provider === 'local' ? 'local-no-auth' : undefined),
    }

    const emitTranscript = (data) => {
      setIsThinking(false)
      if (!data) return
      data.split(/\r?\n/).forEach((line) => {
        if (line.trim()) appendRuntimeEvent({ type: 'tool', text: line })
      })
    }

    const finalizeAgentTranscript = () => {
      if (!currentResponseRef.current) {
        const rawTranscript = runtimeEventsRef.current
          .map((event) => event.text)
          .filter(Boolean)
          .join('\n')
          .trim()
        if (rawTranscript) {
          currentResponseRef.current = '```\n' + rawTranscript + '\n```'
        } else {
          currentResponseRef.current = 'Task completed. See runtime logs for details.'
        }
        setCurrentResponse(currentResponseRef.current)
      }
    }

    const bridgeUrl = (typeof window !== 'undefined' && window.__HERMES_BRIDGE_URL) || 'http://127.0.0.1:42500'
    let bridgeAvailable = false
    if (!window.hermesDesktop?.runAgent) {
      try {
        const healthRes = await fetch(`${bridgeUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(500) })
        bridgeAvailable = healthRes.ok
      } catch { bridgeAvailable = false }
    }

    try {
      if (window.hermesDesktop?.runAgent) {
        window.hermesDesktop.onAgentStdout((data) => emitTranscript(data))
        window.hermesDesktop.onAgentStderr((data) => emitTranscript(data))

        const res = await window.hermesDesktop.runAgent({
          query: content,
          cwd: projectFolder,
          env: runAgentEnv,
          sessionId: currentThread.id
        })

        if (res.code !== 0) {
          throw new Error(`Hermes agent exited with code ${res.code}`)
        }

        finalizeAgentTranscript()
        onDone()

      } else if (bridgeAvailable) {
        appendRuntimeEvent({ type: 'meta', text: `Bridge: ${bridgeUrl}` })
        const bridgeRes = await fetch(`${bridgeUrl}/agent/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: content, cwd: projectFolder, env: runAgentEnv }),
        })
        if (!bridgeRes.ok || !bridgeRes.body) {
          throw new Error(`bridge HTTP ${bridgeRes.status}`)
        }
        const reader = bridgeRes.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split(/\r?\n/)
          buffer = lines.pop() || ''
          lines.forEach((line) => { if (line.trim()) appendRuntimeEvent({ type: 'tool', text: line }) })
        }
        if (buffer.trim()) appendRuntimeEvent({ type: 'tool', text: buffer })

        finalizeAgentTranscript()
        onDone()

      } else {
        await streamChat({
          baseUrl,
          model,
          messages: apiMessages,
          apiKey,
          onToken: (token) => {
            setIsThinking(false)
            currentResponseRef.current += token
            setCurrentResponse(currentResponseRef.current)
          },
          onThinking: () => {
            setIsThinking(true)
            setRuntimeEvents(prev => prev.some(event => event.type === 'thinking') ? prev : [...prev, { type: 'thinking', text: 'Hermes is thinking and preparing the next step...' }])
          },
          onToolCall: (tools) => {
            setToolCalls(prev => [...prev, ...tools])
            setRuntimeEvents(prev => [...prev, ...tools.map(tool => ({ type: 'tool', text: `Tool call: ${tool.function?.name || 'Engine Protocol'}` }))])
          },
          onDone,
          onError
        })
      }
    } catch (err) {
      console.error('Stream failed:', err)
      setIsStreaming(false)
    }
  }

  const renderRuntimeEvents = (events = []) => {
    if (!events.length) return null
    return (
      <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <TerminalSquare className="h-3 w-3" />
          Hermes runtime
        </div>
        {events.map((event, idx) => (
          <div key={idx} className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
            {event.text}
          </div>
        ))}
      </div>
    )
  }

  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user'
    return (
      <div key={index} className={cn('flex gap-3 p-4', isUser ? 'justify-end' : 'justify-start')}>
        {!isUser && (
          <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 shadow-sm", msg.isError ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-muted border-border text-foreground")}>
            {msg.isError ? <Link2Off className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </div>
        )}
        <div className={cn(
          'max-w-[80%] rounded-xl px-4 py-2.5 text-sm shadow-sm border transition-all', 
          isUser 
            ? 'bg-primary text-primary-foreground border-primary' 
            : msg.isError 
              ? 'bg-destructive/5 border-destructive/20 prose-chat text-destructive' 
              : 'bg-card border-border/50 prose-chat'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
          )}
          
          {renderRuntimeEvents(msg.runtimeEvents)}

          {msg.isError && msg.debug && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20 space-y-2">
               <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <AlertCircle className="h-3 w-3" />
                  Technical Diagnostic
               </div>
               <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono opacity-80">
                  <span className="text-muted-foreground">Provider:</span> <span>{msg.debug.provider}</span>
                  <span className="text-muted-foreground">Mode:</span> <span>{msg.debug.mode}</span>
                  <span className="text-muted-foreground">Target URL:</span> <span className="truncate">{msg.debug.baseUrl}</span>
                  <span className="text-muted-foreground">API Key:</span> <span>{msg.debug.provider === 'local' ? 'Not required ✅' : (msg.debug.hasKey ? 'Configured ✅' : 'Missing ❌')}</span>
               </div>
            </div>
          )}

          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="mt-3 space-y-2">
              {msg.toolCalls.map((tool, i) => (
                <div key={i} className="tool-block border-primary/10 bg-primary/5">
                  <div className="tool-block-header text-primary font-bold">
                    <span>🔧 {tool.function?.name || 'Engine Protocol'}</span>
                  </div>
                  <pre className="text-[10px] text-muted-foreground/80 overflow-x-auto p-1 font-mono">
                    {JSON.stringify(tool.function?.arguments || {}, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-md">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background relative selection:bg-primary/10">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/60 bg-background/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          {thread ? (
             <>
              <h2 className="font-bold text-sm tracking-tight truncate max-w-[200px] sm:max-w-md">{thread.title || 'Conversation'}</h2>
              <div className="flex gap-1.5">
                <Badge variant="secondary" className="text-[10px] uppercase font-black tracking-widest px-2 h-5 bg-primary/10 text-primary border-none">{provider}</Badge>
                <Badge variant="outline" className="text-[10px] font-medium px-2 h-5 bg-muted/50 border-border/50">{model}</Badge>
              </div>
             </>
          ) : (
            <div className="text-sm font-bold text-muted-foreground italic flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-primary/20 animate-pulse" />
               New Session
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter">
          {isStreaming && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-500 shadow-sm", connectionStatus === 'connected' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-destructive/10 border-destructive/20 text-destructive")}>
             <div className={cn("w-1.5 h-1.5 rounded-full", connectionStatus === 'connected' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
             <span>{connectionStatus === 'connected' ? `${provider}${model ? ` · ${model}` : ''}` : 'disconnected'}</span>
          </div>
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-y-auto">
        <div className="pb-32 pt-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 mt-12 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 rounded-3xl bg-muted border border-border text-foreground flex items-center justify-center mb-6 shadow-xl relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-xl group-hover:bg-primary/10 transition-colors" />
                <span className="font-black text-3xl z-10">⚕</span>
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2 underline decoration-primary/20 underline-offset-8">Hermes Agent</h2>
              <p className="text-muted-foreground mb-10 max-w-sm text-xs font-medium leading-relaxed uppercase tracking-widest opacity-60">
                 Autonomous workflows. Infinite possibilities.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {['/help', '/model', '/tools'].map(cmd => (
                   <button 
                    key={cmd} 
                    className="group flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent transition-all shadow-sm hover:shadow-md active:scale-95"
                    onClick={() => handleSendMessage(cmd)}
                  >
                    <span className="text-[10px] font-black text-primary/60 group-hover:text-primary transition-colors tracking-tighter">{cmd}</span>
                   </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => renderMessage(msg, i))
          )}
          {!thread && !storage.get('projectFolder', '') && (
            <div className="px-4 pt-2">
              <div className="mx-auto max-w-4xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-amber-500/20 p-2 text-amber-700">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">Select a workspace before you start</div>
                    <p className="text-xs text-muted-foreground max-w-2xl">
                      Hermes can chat straight away, but it works best when it knows which project folder it should inspect, modify, and build in.
                      Pick a workspace below to enable sending and to unlock file-aware actions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {isThinking && !currentResponse && (
            <div className="flex gap-3 p-4 justify-start animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-muted border border-border text-foreground flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm bg-card border border-border shadow-sm flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-muted-foreground text-xs font-medium italic">Thinking...</span>
              </div>
            </div>
          )}
          {runtimeEvents.length > 0 && (
            <div className="flex gap-3 p-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-muted border border-border text-foreground flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm bg-card border border-border shadow-sm">
                {renderRuntimeEvents(runtimeEvents)}
              </div>
            </div>
          )}
          {currentResponse && (
            <div className="flex gap-3 p-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-muted border border-border text-foreground flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-xl px-4 py-2.5 text-sm prose-chat bg-card border border-border shadow-sm">
                <div dangerouslySetInnerHTML={{ __html: markdownToHtml(currentResponse) }} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/90 to-transparent pt-10 px-4">
        <Composer
          onSendMessage={handleSendMessage}
          disabled={isStreaming}
          model={model} 
          onModelChange={(m) => settings.onSettingsChange({ ...settings, model: m })}
          provider={provider}
          workspaceRequired
        />
      </div>
    </div>
  )
}
