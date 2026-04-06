import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Search, Trash2, Edit2, MessageSquare, MoreVertical } from 'lucide-react'

export default function ThreadsPage({ threads, onSelectThread, onDeleteThread, onRenameThread }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [renameDialog, setRenameDialog] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  
  const menuRef = useRef(null)

  const filteredThreads = threads.filter((t) =>
    (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.messages?.some(m => (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown date'
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  const handleContextMenu = (e, thread) => {
    e.preventDefault()
    // Calculate position to prevent menu overflow
    const menuWidth = 160
    const menuHeight = 85
    let x = e.pageX
    let y = e.pageY
    
    if (x + menuWidth > window.innerWidth) x -= menuWidth
    if (y + menuHeight > window.innerHeight) y -= menuHeight

    setContextMenu({ x, y, thread })
  }

  const openRename = (thread) => {
    setContextMenu(null)
    setNewTitle(thread.title || '')
    setRenameDialog(thread)
  }

  const openDelete = (thread) => {
    setContextMenu(null)
    setDeleteDialog(thread)
  }

  const confirmRename = () => {
    if (renameDialog && newTitle.trim()) {
      onRenameThread(renameDialog.id, newTitle.trim())
    }
    setRenameDialog(null)
  }

  const confirmDelete = () => {
    if (deleteDialog) {
      onDeleteThread(deleteDialog.id)
    }
    setDeleteDialog(null)
  }

  return (
    <div className="h-full flex flex-col p-6 bg-background animate-in fade-in duration-300">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Threads</h1>
        <p className="text-sm text-muted-foreground">Browse and manage your conversation history.</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2 pb-10">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                {threads.length === 0 ? 'No threads yet' : 'No matching threads found'}
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  'p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all cursor-pointer group shadow-sm hover:shadow-md',
                  contextMenu?.thread.id === thread.id && 'bg-accent border-primary/20 ring-1 ring-primary/10'
                )}
                onClick={() => onSelectThread(thread.id)}
                onContextMenu={(e) => handleContextMenu(e, thread)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4 text-primary/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-sm">{thread.title || 'Untitled thread'}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="bg-muted px-1.5 py-0.5 rounded capitalize">{formatDate(thread.createdAt)}</span>
                      <span>•</span>
                      <span>{thread.messages?.length || 0} messages</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRename(thread)
                        }}
                        title="Rename"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDelete(thread)
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 ml-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleContextMenu(e, thread)
                      }}
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground/50" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] bg-popover text-popover-foreground border border-border rounded-md shadow-xl p-1 animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              openRename(contextMenu.thread)
            }}
          >
            <Edit2 className="h-4 w-4 text-muted-foreground" />
            <span>Rename thread</span>
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="w-full text-left px-2 py-1.5 text-sm rounded-sm text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center gap-2 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              openDelete(contextMenu.thread)
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete thread</span>
          </button>
        </div>
      )}

      <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Thread</DialogTitle>
            <DialogDescription>Enter a new name for this conversation.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. My project discussion"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>Cancel</Button>
            <Button onClick={confirmRename} disabled={!newTitle.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Thread</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog?.title || 'this thread'}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} className="shadow-sm">Delete Forever</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
