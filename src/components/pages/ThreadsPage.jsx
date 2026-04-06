import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Search, Trash2, Edit2 } from 'lucide-react'

export default function ThreadsPage({ threads, onSelectThread, onDeleteThread }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.messages?.some(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatDate = (isoString) => {
    const date = new Date(isoString)
    const now = new Date()
    const diff = now - date
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">Threads</h1>
        <p className="text-muted-foreground">Browse and manage your conversation history.</p>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {threads.length === 0 ? 'No threads yet' : 'No matching threads'}
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  'p-4 rounded-lg border group hover:bg-accent/50 transition-colors cursor-pointer',
                  'flex items-center justify-between'
                )}
                onClick={() => onSelectThread(thread.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{thread.title || 'Untitled'}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(thread.createdAt)} • {thread.messages?.length || 0} messages
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Rename functionality would go here
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteThread(thread.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
