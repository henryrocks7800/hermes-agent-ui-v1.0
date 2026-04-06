import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { storage } from '@/lib/storage'
import { Clock, Calendar, Play, Pause, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const initialJobs = [
  { id: '1', name: 'Daily Code Review', prompt: 'Review recent commits', schedule: '0 9 * * *', status: 'active', lastRun: '2 hours ago' },
  { id: '2', name: 'Weekly Dependencies Check', prompt: 'Check npm outdated', schedule: '0 10 * * 1', status: 'paused', lastRun: '5 days ago' },
  { id: '3', name: 'Hourly Health Check', prompt: 'Run health script', schedule: '0 * * * *', status: 'active', lastRun: '15 minutes ago' },
]

export default function AutomationsPage() {
  const [jobs, setJobs] = useState(() => storage.get('hermes.automations', initialJobs))
  
  const [newDialog, setNewDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrompt, setNewPrompt] = useState('')
  const [newSchedule, setNewSchedule] = useState('')

  const [deleteDialog, setDeleteDialog] = useState(null)

  const saveJobs = (newJobs) => {
    setJobs(newJobs)
    storage.set('hermes.automations', newJobs)
  }

  const toggleStatus = (id) => {
    saveJobs(jobs.map(j => {
      if (j.id === id) {
        return { ...j, status: j.status === 'active' ? 'paused' : 'active' }
      }
      return j
    }))
  }

  const confirmDelete = () => {
    if (deleteDialog) {
      saveJobs(jobs.filter(j => j.id !== deleteDialog.id))
      setDeleteDialog(null)
    }
  }

  const handleCreate = () => {
    if (newName.trim() && newPrompt.trim() && newSchedule.trim()) {
      const newJob = {
        id: Date.now().toString(),
        name: newName.trim(),
        prompt: newPrompt.trim(),
        schedule: newSchedule.trim(),
        status: 'active',
        lastRun: 'Never'
      }
      saveJobs([...jobs, newJob])
      setNewDialog(false)
      setNewName('')
      setNewPrompt('')
      setNewSchedule('')
    }
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Automations</h1>
          <p className="text-sm text-muted-foreground">Scheduled tasks and cron jobs.</p>
        </div>
        <Button onClick={() => setNewDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Automation
        </Button>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-4 pb-6">
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No automations created yet.
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className={cn(
                  "p-5 rounded-lg border bg-card transition-colors flex items-center justify-between group",
                  job.status === 'paused' && "opacity-60"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{job.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{job.schedule}</code>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium mb-1">
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                        {job.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last run: {job.lastRun}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => toggleStatus(job.id)}
                      title={job.status === 'active' ? 'Pause' : 'Resume'}
                    >
                      {job.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteDialog(job)}
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

      {/* Create Dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Automation</DialogTitle>
            <DialogDescription>
              Schedule a task to run automatically using cron syntax.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. Nightly Code Review" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Prompt</label>
              <Textarea 
                value={newPrompt} 
                onChange={(e) => setNewPrompt(e.target.value)} 
                placeholder="What should the agent do?" 
                className="h-24 resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule (Cron)</label>
              <Input 
                value={newSchedule} 
                onChange={(e) => setNewSchedule(e.target.value)} 
                placeholder="0 9 * * *" 
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                E.g. <code>0 9 * * *</code> for every day at 9 AM.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || !newPrompt.trim() || !newSchedule.trim()}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Automation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog?.name}"? This action cannot be undone.
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
