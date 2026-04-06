import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { MessageSquare, BookOpen, Zap, Settings, Plus, ChevronDown } from 'lucide-react'

const navItems = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'threads', label: 'Threads', icon: BookOpen },
  { id: 'skills', label: 'Skills', icon: Zap },
  { id: 'automations', label: 'Automations', icon: Zap },
]

export default function Sidebar({ activePage, onNavigate, threads, activeThreadId, onSelectThread, onNewThread, connectionStatus }) {
  const connectionConfig = {
    connected: { color: 'bg-green-500', text: 'Connected', pulse: false },
    connecting: { color: 'bg-yellow-500', text: 'Connecting…', pulse: true },
    disconnected: { color: 'bg-red-500', text: 'Disconnected', pulse: false },
  }
  const config = connectionConfig[connectionStatus] || connectionConfig.connecting

  return (
    <TooltipProvider>
      <div className="w-60 flex flex-col bg-card border-r border-border h-full">
        {/* Logo */}
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">⚕</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm">Hermes Agent</h1>
              <p className="text-xs text-muted-foreground">Desktop</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* New Thread */}
        <div className="p-3">
          <Button variant="default" className="w-full justify-start gap-2" onClick={onNewThread}>
            <Plus className="h-4 w-4" />
            New thread
          </Button>
        </div>

        <Separator />

        {/* Nav Items */}
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activePage === item.id
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      )}
                      onClick={() => onNavigate(item.id)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            })}
          </nav>

          {/* Recent Threads */}
          {threads.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="mb-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent
              </div>
              <div className="space-y-1">
                {threads.slice(0, 5).map((thread) => (
                  <button
                    key={thread.id}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded-md text-sm truncate transition-colors',
                      activeThreadId === thread.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                    onClick={() => onSelectThread(thread.id)}
                  >
                    {thread.title || 'Untitled'}
                  </button>
                ))}
              </div>
            </>
          )}
        </ScrollArea>

        <Separator />

        {/* Settings */}
        <div className="p-3">
          <button
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              activePage === 'settings'
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
            onClick={() => onNavigate('settings')}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Connection Status */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', config.color, config.pulse && 'animate-pulse')} />
            <span className="text-xs text-muted-foreground">{config.text}</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
