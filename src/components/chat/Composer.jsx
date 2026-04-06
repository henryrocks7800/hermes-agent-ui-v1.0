import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getCommandCompletions, getContextCompletions, PROVIDER_MODELS } from '@/lib/commands'
import { storage, KEYS } from '@/lib/storage'
import { Send, ChevronDown, Paperclip, Command, AtSign } from 'lucide-react'

export default function Composer({ onSendMessage, disabled, model, onModelChange, provider }) {
  const [value, setValue] = useState('')
  const [showCommandMenu, setShowCommandMenu] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [commandFilter, setCommandFilter] = useState('')
  const [contextFilter, setContextFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const textareaRef = useRef(null)
  const menuRef = useRef(null)
  const fileInputRef = useRef(null)

  const commandSuggestions = showCommandMenu ? getCommandCompletions('/' + commandFilter) : []
  const contextSuggestions = showContextMenu ? getContextCompletions(contextFilter) : []
  
  const providerModels = PROVIDER_MODELS[provider] || PROVIDER_MODELS['openai']

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowCommandMenu(false)
        setShowContextMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e) => {
    const newValue = e.target.value
    setValue(newValue)

    const cursorPos = e.target.selectionStart
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lines = textBeforeCursor.split('\n')
    const currentLine = lines[lines.length - 1]

    // Check for / command
    const commandMatch = currentLine.match(/\/([a-zA-Z0-9_-]*)$/)
    if (commandMatch) {
      setCommandFilter(commandMatch[1])
      setShowCommandMenu(true)
      setShowContextMenu(false)
      setSelectedIndex(0)
      updateMenuPosition(textareaRef.current, cursorPos)
    }
    // Check for @ context
    else if (currentLine.match(/@([a-zA-Z0-9_:]*)$/)) {
      const contextMatch = currentLine.match(/@([a-zA-Z0-9_:]*)$/)
      setContextFilter(contextMatch[1])
      setShowContextMenu(true)
      setShowCommandMenu(false)
      setSelectedIndex(0)
      updateMenuPosition(textareaRef.current, cursorPos)
    } else {
      setShowCommandMenu(false)
      setShowContextMenu(false)
    }
  }

  const updateMenuPosition = (textarea, cursorPos) => {
    if (!textarea) return
    const textareaRect = textarea.getBoundingClientRect()
    const textBeforeCursor = value.slice(0, cursorPos)
    const lines = textBeforeCursor.split('\n')
    const lineNumber = lines.length - 1
    const column = lines[lines.length - 1].length

    // Approximate position
    const lineHeight = 20
    const charWidth = 8
    setMenuPosition({
      top: textareaRect.top + (lineNumber * lineHeight) - 200,
      left: textareaRect.left + (column * charWidth),
    })
  }

  const handleKeyDown = (e) => {
    const suggestions = showCommandMenu ? commandSuggestions : showContextMenu ? contextSuggestions : []

    if (showCommandMenu || showContextMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === 'Enter' && suggestions.length > 0) {
        e.preventDefault()
        selectSuggestion(suggestions[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowCommandMenu(false)
        setShowContextMenu(false)
        // Clear the trigger word
        const textarea = textareaRef.current
        if (textarea) {
          const cursorPos = textarea.selectionStart
          const textBeforeCursor = value.slice(0, cursorPos)
          const textAfterCursor = value.slice(cursorPos)
          let match
          if (showCommandMenu) {
            match = textBeforeCursor.match(/\/[a-zA-Z0-9_-]*$/)
          } else {
            match = textBeforeCursor.match(/@[a-zA-Z0-9_:]*$/)
          }
          if (match) {
            const newText = textBeforeCursor.slice(0, match.index) + textAfterCursor
            setValue(newText)
            setTimeout(() => {
              textarea.focus()
              textarea.setSelectionRange(match.index, match.index)
            }, 0)
          }
        }
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const selectSuggestion = (suggestion) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const textAfterCursor = value.slice(cursorPos)

    let newText, newCursorPos
    if (showCommandMenu) {
      const match = textBeforeCursor.match(/\/[a-zA-Z0-9_-]*$/)
      if (match) {
        newText = textBeforeCursor.slice(0, match.index) + '/' + suggestion.value + ' ' + textAfterCursor
        newCursorPos = match.index + suggestion.value.length + 2
      }
    } else if (showContextMenu) {
      const match = textBeforeCursor.match(/@[a-zA-Z0-9_:]*$/)
      if (match) {
        newText = textBeforeCursor.slice(0, match.index) + suggestion.value + ' ' + textAfterCursor
        newCursorPos = match.index + suggestion.value.length + 1
      }
    }

    setValue(newText)
    setShowCommandMenu(false)
    setShowContextMenu(false)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleAttachClick = async () => {
    // If in Electron, use the native dialog
    if (window.hermesDesktop && window.hermesDesktop.openFile) {
      const filePath = await window.hermesDesktop.openFile()
      if (filePath) {
        setValue(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + `@file:${filePath} `)
      }
    } else {
      // Web fallback
      fileInputRef.current?.click()
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // In electron browser environment, files have a .path property
      const filePath = file.path || file.name
      setValue(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + `@file:${filePath} `)
    }
    // Reset input
    e.target.value = ''
  }

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSendMessage(value)
      setValue('')
    }
  }

  const handleModelChange = (newModel) => {
    storage.set(KEYS.MODEL, newModel)
    if (onModelChange) {
      onModelChange(newModel)
    }
  }

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Textarea */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Hermes anything... Use / for commands, @ for context"
            className="min-h-[80px] max-h-[200px] resize-none pr-12"
            disabled={disabled}
          />
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect} 
            data-testid="file-upload-input"
          />

          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleAttachClick}
              title="Add context"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          {/* Command Menu */}
          {showCommandMenu && commandSuggestions.length > 0 && (
            <div
              ref={menuRef}
              className="absolute z-50 w-80 max-h-64 overflow-hidden rounded-md border bg-popover shadow-lg"
              style={{ bottom: '60px', left: '0' }}
            >
              <ScrollArea className="h-full max-h-64">
                <div className="p-2">
                  {commandSuggestions.map((cmd, index) => (
                    <button
                      key={cmd.value}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-sm text-sm flex items-start gap-2',
                        index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                      )}
                      onClick={() => selectSuggestion(cmd)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          /{cmd.value}
                          {cmd.args && <span className="text-muted-foreground ml-1">{cmd.args}</span>}
                        </div>
                        {cmd.description && (
                          <div className="text-xs text-muted-foreground">{cmd.description}</div>
                        )}
                      </div>
                      {cmd.category && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {cmd.category}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Context Menu */}
          {showContextMenu && contextSuggestions.length > 0 && (
            <div
              ref={menuRef}
              className="absolute z-50 w-64 max-h-48 overflow-hidden rounded-md border bg-popover shadow-lg"
              style={{ bottom: '60px', left: '0' }}
            >
              <ScrollArea className="h-full max-h-48">
                <div className="p-2">
                  {contextSuggestions.map((ref, index) => (
                    <button
                      key={ref.value}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-sm text-sm',
                        index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                      )}
                      onClick={() => selectSuggestion(ref)}
                    >
                      <div className="font-medium">{ref.value}</div>
                      <div className="text-xs text-muted-foreground">{ref.description}</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger className="h-7 text-xs border-input shadow-sm w-[160px] bg-background">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {providerModels.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="gap-1"
          >
            <Send className="h-3 w-3" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
