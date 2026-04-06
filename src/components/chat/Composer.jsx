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
    }
    // Check for @ context
    else if (currentLine.match(/@([a-zA-Z0-9_:]*)$/)) {
      const contextMatch = currentLine.match(/@([a-zA-Z0-9_:]*)$/)
      setContextFilter(contextMatch[1])
      setShowContextMenu(true)
      setShowCommandMenu(false)
      setSelectedIndex(0)
    } else {
      setShowCommandMenu(false)
      setShowContextMenu(false)
    }
  }

  const handleKeyDown = (e) => {
    const suggestions = showCommandMenu ? commandSuggestions : showContextMenu ? contextSuggestions : []
    const menuActive = (showCommandMenu && commandSuggestions.length > 0) || (showContextMenu && contextSuggestions.length > 0)

    if (menuActive) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        selectSuggestion(suggestions[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        resetMenus()
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      resetMenus()
    }
  }

  const resetMenus = () => {
    // Clear the trigger word if the menu was just hidden or if user explicitly escapes
    const textarea = textareaRef.current
    if (textarea) {
      const cursorPos = textarea.selectionStart
      const textBeforeCursor = value.slice(0, cursorPos)
      const textAfterCursor = value.slice(cursorPos)
      
      // Match either / or @ trigger at the cursor
      const match = textBeforeCursor.match(/[\/@][a-zA-Z0-9_-]*$/)
      if (match) {
        const newText = textBeforeCursor.slice(0, match.index) + textAfterCursor
        setValue(newText)
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(match.index, match.index)
        }, 0)
      }
    }
    setShowCommandMenu(false)
    setShowContextMenu(false)
    setSelectedIndex(0)
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

    if (newText) {
      setValue(newText)
      setShowCommandMenu(false)
      setShowContextMenu(false)

      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

  const handleAttachClick = async () => {
    if (window.hermesDesktop && window.hermesDesktop.openFile) {
      const filePath = await window.hermesDesktop.openFile()
      if (filePath) {
        insertReference(`@file:${filePath}`)
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  const insertReference = (ref) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const space = (value.length > 0 && !value.endsWith(' ') && cursorPos === value.length) ? ' ' : ''
    const newValue = value.slice(0, cursorPos) + space + ref + ' ' + value.slice(cursorPos)
    setValue(newValue)
    const newPos = cursorPos + space.length + ref.length + 1
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const filePath = file.path || file.name
      insertReference(`@file:${filePath}`)
    }
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
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Hermes anything... Use / for commands, @ for context"
            className="min-h-[80px] max-h-[200px] resize-none pr-12 focus-visible:ring-primary/20 transition-all"
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
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleAttachClick}
              title="Add context"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          {(showCommandMenu && commandSuggestions.length > 0) && (
            <div
              ref={menuRef}
              className="absolute z-50 w-80 max-h-64 overflow-hidden rounded-md border bg-popover shadow-xl animate-in slide-in-from-bottom-2 duration-200"
              style={{ bottom: 'calc(100% + 8px)', left: '0' }}
            >
              <ScrollArea className="h-full max-h-64">
                <div className="p-1.5 space-y-0.5">
                  {commandSuggestions.map((cmd, index) => (
                    <button
                      key={cmd.value}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-sm text-sm flex items-start gap-2 transition-colors',
                        index === selectedIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      )}
                      onClick={() => selectSuggestion(cmd)}
                    >
                      <div className="flex-1">
                        <div className="font-semibold">
                          /{cmd.value}
                          {cmd.args && <span className={cn("ml-1 text-[10px]", index === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground")}>{cmd.args}</span>}
                        </div>
                        {cmd.description && (
                          <div className={cn("text-[11px] leading-tight mt-0.5", index === selectedIndex ? "text-primary-foreground/80" : "text-muted-foreground")}>{cmd.description}</div>
                        )}
                      </div>
                      {cmd.category && (
                        <div className={cn("text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border self-center", index === selectedIndex ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border bg-muted")}>
                          {cmd.category}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {(showContextMenu && contextSuggestions.length > 0) && (
            <div
              ref={menuRef}
              className="absolute z-50 w-64 max-h-48 overflow-hidden rounded-md border bg-popover shadow-xl animate-in slide-in-from-bottom-2 duration-200"
              style={{ bottom: 'calc(100% + 8px)', left: '0' }}
            >
              <ScrollArea className="h-full max-h-48">
                <div className="p-1.5 space-y-0.5">
                  {contextSuggestions.map((ref, index) => (
                    <button
                      key={ref.value}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-sm text-sm transition-colors flex flex-col',
                        index === selectedIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      )}
                      onClick={() => selectSuggestion(ref)}
                    >
                      <div className="font-semibold">{ref.value}</div>
                      <div className={cn("text-[11px]", index === selectedIndex ? "text-primary-foreground/80" : "text-muted-foreground")}>{ref.description}</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger className="h-8 text-xs border-input shadow-sm w-[180px] bg-background hover:bg-accent transition-colors">
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
            className="gap-2 px-4 shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
