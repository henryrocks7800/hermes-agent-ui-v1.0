import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { storage, KEYS } from '@/lib/storage'
import { streamChat, markdownToHtml } from '@/lib/chatStream'
import Composer from './Composer.jsx'
import { Bot, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatPage({ thread, onUpdateThread, connectionStatus, setConnectionStatus }) {
  const [messages, setMessages] = useState(thread?.messages || [])
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const [toolCalls, setToolCalls] = useState([])
  const scrollRef = useRef(null)
  const scrollAreaRef = useRef(null)

  const provider = storage.get(KEYS.PROVIDER, 'openai')
  const model = storage.get(KEYS.MODEL, 'gpt-4o')
  const baseUrl = storage.get(KEYS.BASE_URL, 'http://localhost:42424/v1')
  const apiKey = storage.get(KEYS.API_KEY, '')
  const reasoningEffort = storage.get(KEYS.REASONING, 'medium')

  useEffect(() => {
    setMessages(thread?.messages || [])
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
    setCurrentResponse('')
    setToolCalls([])
    setIsStreaming(true)

    const systemPrompt = `You are Hermes, an AI coding agent. You help users with software development tasks. You can use tools to read/write files, run commands, search codebases, and more. Be concise and direct.`

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
          setCurrentResponse(prev => prev + token)
        },
        onToolCall: (tools) => {
          setToolCalls(prev => [...prev, ...tools])
        },
        onDone: () => {
          const assistantMessage = {
            role: 'assistant',
            content: currentResponse,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            timestamp: Date.now(),
          }
          const finalMessages = [...updatedMessages, assistantMessage]
          setMessages(finalMessages)
          setCurrentResponse('')
          setToolCalls([])
          setIsStreaming(false)

          if (thread) {
            onUpdateThread({ ...thread, messages: finalMessages })
          } else {
            onUpdateThread({
              id: Date.now().toString(),
              title: content.slice(0, 20) + (content.length > 20 ? '...' : ''),
              createdAt: Date.now(),
              messages: finalMessages
            })
          }
        },
        onError: (err) => {
          console.error('Stream error:', err)
          const errorMessage = {
            role: 'assistant',
            content: `Error: ${err.message}`,
            timestamp: Date.now(),
          }
          setMessages(prev => [...prev, errorMessage])
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
      <div
        key={index}
        className={cn(
          'flex gap-3 p-4',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Bot className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div
          className={cn(
            'max-w-[80%] rounded-lg px-4 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'prose-chat'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
          )}
          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="mt-2 space-y-1">
              {msg.toolCalls.map((tool, i) => (
                <div key={i} className="tool-block">
                  <div className="tool-block-header">
                    <span>🔧 {tool.function?.name || 'Tool call'}</span>
                  </div>
                  <pre className="text-xs text-muted-foreground overflow-x-auto">
                    {JSON.stringify(tool.function?.arguments || {}, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border min-h-[53px]">
        {thread ? (
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{thread.title || 'New thread'}</h2>
            <Badge variant="secondary" className="text-xs">
              {model}
            </Badge>
          </div>
        ) : (
          <div></div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isStreaming && <Loader2 className="h-3 w-3 animate-spin" />}
          <span>{connectionStatus === 'connected' ? '●' : connectionStatus === 'connecting' ? '◌' : '○'}</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-y-auto">
        <div className="pb-4 h-full">
          {!thread && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 mt-12">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
                <span className="text-primary-foreground font-bold text-2xl">⚕</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">Ask Hermes anything</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Start a conversation with your AI coding agent. I can help with code, files, terminals, and more.
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">/help</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">/model</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">/skills browse</Badge>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => renderMessage(msg, i))
          )}
          {currentResponse && (
            <div className="flex gap-3 p-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="max-w-[80%] rounded-lg px-4 py-2 text-sm prose-chat">
                <div dangerouslySetInnerHTML={{ __html: markdownToHtml(currentResponse) }} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <Composer
        onSendMessage={handleSendMessage}
        disabled={isStreaming}
        model={model}
        provider={provider}
      />
    </div>
  )
}
