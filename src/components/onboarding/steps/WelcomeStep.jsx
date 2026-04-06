import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Check, ArrowRight } from 'lucide-react'

export default function WelcomeStep({ onBegin, onSkip }) {
  return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted border border-border text-foreground flex items-center justify-center mx-auto mb-4">
        <span className="font-bold text-3xl">⚕</span>
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Hermes Agent Setup</h1>
      <p className="text-muted-foreground mb-6">
        Welcome! Let's get you set up.<br />
        This takes about 2 minutes.
      </p>

      <div className="text-left bg-muted/50 rounded-lg p-4 mb-6">
        <h3 className="font-medium mb-3">What we'll cover:</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            AI Provider & Model
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            Backend Connection
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            Agent Settings
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            Tools (optional)
          </li>
        </ul>
      </div>

      <Separator className="mb-6" />

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onBegin} className="gap-2">
          Begin Setup
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
