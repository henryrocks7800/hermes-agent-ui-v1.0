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

  const resetForm = () => {
    setNewName('')
    setNewPrompt('')
    setNewSchedule('')
    setNewDialog(false)
  }

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
      resetForm()
    }
  }

  return (
    <div className="h-full flex flex-col p-6 bg-background animate-in fade-in duration-300">
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
                  "p-5 rounded-lg border bg-card transition-colors flex items-center justify-between group shadow-sm hover:shadow-md",
                  job.status === 'paused' && "opacity-60 grayscale-[0.5]"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border", job.status === 'active' ? "bg-primary/5 border-primary/10 text-primary" : "bg-muted border-border text-muted-foreground")}>
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{job.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border">{job.schedule}</code>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium mb-1">
                      <Badge variant={job.status === 'active' ? 'default' : 'outline'} className="capitalize">
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
                      className="h-9 w-9 bg-muted/50 hover:bg-muted"
                      onClick={() => toggleStatus(job.id)}
                      title={job.status === 'active' ? 'Pause' : 'Resume'}
                    >
                      {job.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10 bg-muted/50"
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

      <Dialog open={newDialog} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Automation</DialogTitle>
            <DialogDescription>
              Schedule a task to run automatically using cron syntax.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase text-[10px] font-bold text-muted-foreground tracking-widest">Name</label>
              <Input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. Nightly Code Review" 
                className="bg-muted/30"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase text-[10px] font-bold text-muted-foreground tracking-widest">Task Prompt</label>
              <Textarea 
                value={newPrompt} 
                onChange={(e) => setNewPrompt(e.target.value)} 
                placeholder="What should the agent do?" 
                className="h-24 resize-none bg-muted/30"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium uppercase text-[10px] font-bold text-muted-foreground tracking-widest">Schedule (Cron)</label>
              <Input 
                value={newSchedule} 
                onChange={(e) => setNewSchedule(e.target.value)} 
                placeholder="0 9 * * *" 
                className="font-mono text-sm bg-muted/30"
              />
              <p className="text-[10px] text-muted-foreground mt-1 bg-muted p-1 rounded inline-block">
                Example: <code>0 9 * * *</code> (Every day at 9 AM)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || !newPrompt.trim() || !newSchedule.trim()}>
              Create Protocol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase italic font-black">Terminate Automation</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete "{deleteDialog?.name}"? Scheduled protocols cannot be recovered once purged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 gap-3 sm:flex-row flex-col">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} className="h-11 flex-1 font-bold">Abort</Button>
            <Button variant="destructive" onClick={confirmDelete} className="h-11 flex-1 font-bold shadow-lg shadow-destructive/20">Purge Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
