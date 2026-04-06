import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Sparkles } from 'lucide-react'

export default function CompletionStep({ settings, onComplete }) {
  return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="h-8 w-8 text-primary" />
      </div>
      
      <h1 className="text-2xl font-bold mb-2">You're all set!</h1>
      <p className="text-muted-foreground mb-6">
        Hermes Agent is configured and ready to go. 🎉
      </p>

      <div className="text-left bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
        <h3 className="font-medium">Your Settings</h3>
        <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
          <span className="text-muted-foreground">Provider</span>
          <span className="font-medium">{settings.provider || '—'}</span>
          
          <span className="text-muted-foreground">Model</span>
          <span className="font-medium">{settings.model || '—'}</span>
          
          <span className="text-muted-foreground">Backend</span>
          <span className="font-medium">{settings.backendMode === 'auto' ? 'Auto (Recommended)' : settings.backendMode === 'external' ? 'External Backend' : 'Provider Direct'}</span>
          
          <span className="text-muted-foreground">Max Turns</span>
          <span className="font-medium">{settings.maxTurns}</span>
        </div>
      </div>

      <Separator className="mb-6" />

      <Button onClick={onComplete} className="w-full gap-2 text-lg h-12">
        <Sparkles className="h-5 w-5" />
        Start Chatting
      </Button>
    </div>
  )
}
