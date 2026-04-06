import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Calendar, Play, Pause, Trash2 } from 'lucide-react'

const sampleCronJobs = [
  { id: '1', name: 'Daily Code Review', schedule: '0 9 * * *', status: 'active', lastRun: '2 hours ago' },
  { id: '2', name: 'Weekly Dependencies Check', schedule: '0 10 * * 1', status: 'paused', lastRun: '5 days ago' },
  { id: '3', name: 'Hourly Health Check', schedule: '0 * * * *', status: 'active', lastRun: '15 minutes ago' },
]

export default function AutomationsPage() {
  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Automations</h1>
          <p className="text-muted-foreground">Scheduled tasks and cron jobs.</p>
        </div>
        <Button>New Automation</Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {sampleCronJobs.map((job) => (
            <div
              key={job.id}
              className="p-4 rounded-lg border border-border flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{job.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {job.schedule}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                  {job.status}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Last run: {job.lastRun}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {job.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
