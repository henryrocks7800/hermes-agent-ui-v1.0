import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

const ttsProviders = [
  { id: 'edge', label: 'Edge TTS', default: true },
  { id: 'elevenlabs', label: 'ElevenLabs' },
  { id: 'openai', label: 'OpenAI TTS' },
]

export default function ToolsStep({ settings, updateSettings, onComplete, onBack }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Tools (optional)</h2>
        <p className="text-sm text-muted-foreground">
          Configure extra capabilities. All can be changed later in Settings.
        </p>
      </div>

      {/* Web Search */}
      <div className="mb-6 p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-medium">Web Search</div>
            <div className="text-sm text-muted-foreground">Enable web search capabilities</div>
          </div>
          <Switch
            checked={settings.webSearchEnabled}
            onCheckedChange={(checked) => updateSettings({ webSearchEnabled: checked })}
          />
        </div>
        {settings.webSearchEnabled && (
          <div>
            <label className="text-sm font-medium mb-2 block">Firecrawl API Key</label>
            <Input
              type="password"
              placeholder="fc-..."
              value={settings.firecrawlApiKey}
              onChange={(e) => updateSettings({ firecrawlApiKey: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Vision */}
      <div className="mb-6 p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Vision / Image Analysis</div>
            <div className="text-sm text-muted-foreground">Enable vision capabilities</div>
          </div>
          <Switch
            checked={settings.visionEnabled}
            onCheckedChange={(checked) => updateSettings({ visionEnabled: checked })}
          />
        </div>
      </div>

      {/* Text-to-Speech */}
      <div className="mb-6 p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-medium">Text-to-Speech</div>
            <div className="text-sm text-muted-foreground">Enable TTS for voice responses</div>
          </div>
          <Switch
            checked={settings.ttsEnabled}
            onCheckedChange={(checked) => updateSettings({ ttsEnabled: checked })}
          />
        </div>
        {settings.ttsEnabled && (
          <div className="flex gap-2">
            {ttsProviders.map((p) => (
              <Button
                key={p.id}
                variant={settings.ttsProvider === p.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings({ ttsProvider: p.id })}
              >
                {p.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onComplete} className="gap-2">
          Complete Setup
        </Button>
      </div>
    </div>
  )
}
