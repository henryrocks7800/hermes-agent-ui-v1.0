import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { storage, KEYS } from '@/lib/storage'
import { streamChat, markdownToHtml } from '@/lib/chatStream'
import Composer from './Composer.jsx'
import { Bot, User, Loader2, Link2Off, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatPage({ thread, onUpdateThread, connectionStatus, setConnectionStatus, settings }) {
  const [messages, setMessages] = useState(thread?.messages || [])
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const [toolCalls, setToolCalls] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const scrollAreaRef = useRef(null)
  const currentResponseRef = useRef('')

  const { baseUrl, model, apiKey, provider, mode } = settings

  useEffect(() => {
    if (thread?.messages) {
      setMessages(thread.messages)
    } else if (!thread) {
      setMessages([{
        role: 'assistant',
        content: `**Hermes Engine Initialized.**\n\nI am ready to assist with codebase inspection, autonomous task execution, and technical reasoning. What would you like to build?`,
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

    const systemPrompt = `You are Hermes, an elite autonomous AI software engineer and orchestrator.\nAlways think step-by-step before answering.\nBreak down complex tasks into phases.\nBe concise, direct, and professional.\nUse tools when necessary.`
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...updatedMessages.map(m => ({ role: m.role, content: m.content })),
    ]

    try {
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
        },
        onToolCall: (tools) => {
          setToolCalls(prev => [...prev, ...tools])
        },
        onDone: () => {
          const assistantMessage = {
            role: 'assistant',
            content: currentResponseRef.current,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            timestamp: Date.now(),
          }
          const finalMessages = [...updatedMessages, assistantMessage]
          setMessages(finalMessages)
          
          if (currentThread) {
            onUpdateThread({ ...currentThread, messages: finalMessages })
          }

          currentResponseRef.current = ''
          setCurrentResponse('')
          setIsStreaming(false)
        },
        onError: (err) => {
          console.error('Stream error:', err)
          const message = err.message || 'Connection failed'
          
          const errorMessage = {
            role: 'assistant',
            content: `### ❌ Connection Error\n\nThe engine is unable to reach the AI provider.\n\n**Attempted URL:** \`${baseUrl}\`\n**Error:** ${message}`,
            timestamp: Date.now(),
            isError: true,
            debug: { baseUrl, provider, model, mode, hasKey: !!apiKey }
          }
          const errorMessages = [...updatedMessages, errorMessage]
          setMessages(errorMessages)
          
          if (currentThread) {
            onUpdateThread({ ...currentThread, messages: errorMessages })
          }
          
          setIsStreaming(false)
        },
      })
    } catch (err) {
      console.error('Stream failed:', err)
      setIsStreaming(false)
    }
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
                  <span className="text-muted-foreground">API Key:</span> <span>{msg.debug.hasKey ? 'Configured ✅' : (msg.debug.provider === 'ollama' || msg.debug.provider === 'lmstudio' || msg.debug.provider === 'custom' ? 'Not required ✅' : 'Missing ❌')}</span>
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
             <span>{connectionStatus}</span>
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
                {['/help', '/model', '/skills'].map(cmd => (
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
        />
      </div>
    </div>
  )
}
