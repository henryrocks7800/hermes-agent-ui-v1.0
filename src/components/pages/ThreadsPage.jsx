import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Search, Trash2, Edit2, MessageSquare } from 'lucide-react'

export default function ThreadsPage({ threads, onSelectThread, onDeleteThread, onRenameThread }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [renameDialog, setRenameDialog] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  
  const menuRef = useRef(null)

  const filteredThreads = threads.filter((t) =>
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      thread
    })
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
    <div className="h-full flex flex-col p-6">
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
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2 pb-4">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {threads.length === 0 ? 'No threads yet' : 'No matching threads'}
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  'p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group',
                  contextMenu?.thread.id === thread.id && 'bg-accent/50'
                )}
                onClick={() => onSelectThread(thread.id)}
                onContextMenu={(e) => handleContextMenu(e, thread)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{thread.title || 'Untitled thread'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(thread.createdAt)} • {thread.messages?.length || 0} messages
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDelete(thread)
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] bg-popover text-popover-foreground border border-border rounded-md shadow-md p-1 animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation()
              openRename(contextMenu.thread)
            }}
          >
            <Edit2 className="h-4 w-4" />
            Rename
          </button>
          <button
            className="w-full text-left px-2 py-1.5 text-sm rounded-sm text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center gap-2 mt-1"
            onClick={(e) => {
              e.stopPropagation()
              openDelete(contextMenu.thread)
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Thread</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter thread title..."
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

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Thread</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog?.title || 'this thread'}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
