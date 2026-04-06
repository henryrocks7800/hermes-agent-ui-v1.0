import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const maxTurnsOptions = [50, 90, 150, 300]
const reasoningOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium', default: true },
  { value: 'high', label: 'High' },
]
const toolProgressOptions = [
  { value: 'off', label: 'Off' },
  { value: 'new', label: 'New tools only' },
  { value: 'all', label: 'All tools', default: true },
  { value: 'verbose', label: 'Verbose' },
]

export default function AgentSettingsStep({ settings, updateSettings, onNext, onBack }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Agent Settings</h2>
        <p className="text-sm text-muted-foreground">Tune how the agent behaves.</p>
      </div>

      {/* Max Iterations */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Max Iterations</label>
        <div className="flex gap-2 mb-3">
          {maxTurnsOptions.map((n) => (
            <Button
              key={n}
              variant={settings.maxTurns === n ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSettings({ maxTurns: n })}
            >
              {n}
            </Button>
          ))}
        </div>
        <Input
          type="number"
          min="10"
          max="300"
          value={settings.maxTurns}
          onChange={(e) => updateSettings({ maxTurns: parseInt(e.target.value) || 90 })}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground mt-1">Range: 10–300 (default: 90)</p>
      </div>

      {/* Reasoning Effort */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Reasoning Effort</label>
        <div className="flex gap-3">
          {reasoningOptions.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors',
                settings.reasoningEffort === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <input
                type="radio"
                name="reasoning"
                value={opt.value}
                checked={settings.reasoningEffort === opt.value}
                onChange={() => updateSettings({ reasoningEffort: opt.value })}
                className="sr-only"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tool Progress */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Tool Progress Display</label>
        <div className="grid grid-cols-2 gap-2">
          {toolProgressOptions.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors',
                settings.toolProgress === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <input
                type="radio"
                name="toolProgress"
                value={opt.value}
                checked={settings.toolProgress === opt.value}
                onChange={() => updateSettings({ toolProgress: opt.value })}
                className="sr-only"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Context Compression */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Context Compression</label>
        <p className="text-sm text-muted-foreground">
          When conversations get long, the agent will automatically compress older messages.
          Default threshold: 60% of context window.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
