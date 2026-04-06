import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Check, X, Loader2 } from 'lucide-react'

const modes = [
  { id: 'auto', label: 'Auto', sublabel: 'Try local Hermes first, fall back to direct provider API', recommended: true },
  { id: 'external', label: 'External Backend', sublabel: 'Connect to Hermes running at a specific URL' },
  { id: 'embedded', label: 'Provider Direct', sublabel: 'Skip Hermes backend entirely, call your AI provider directly' },
]

export default function BackendStep({ settings, updateSettings, onNext, onBack }) {
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState(null)

  const handleTestConnection = async () => {
    const url = settings.backendMode === 'external' ? settings.externalUrl : 'http://localhost:42424/v1'
    setTestingConnection(true)
    setConnectionResult(null)

    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      })
      if (response.ok) {
        setConnectionResult({ success: true, message: 'Connection successful!' })
      } else {
        setConnectionResult({ success: false, message: `HTTP ${response.status}` })
      }
    } catch (err) {
      setConnectionResult({ success: false, message: err.message || 'Connection failed' })
    } finally {
      setTestingConnection(false)
    }
  }

  const canProceed = settings.backendMode !== 'external' || connectionResult?.success

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Backend Connection</h2>
        <p className="text-sm text-muted-foreground">How does the app connect to Hermes Agent?</p>
      </div>

      {/* Mode Cards */}
      <div className="space-y-3 mb-6">
        {modes.map((mode) => (
          <button
            key={mode.id}
            className={cn(
              'w-full p-4 rounded-lg border text-left transition-all',
              settings.backendMode === mode.id
                ? 'border-primary ring-2 ring-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            )}
            onClick={() => updateSettings({ backendMode: mode.id })}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="font-medium">{mode.label}</div>
              {mode.recommended && (
                <Badge variant="default" className="text-xs">Recommended</Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{mode.sublabel}</div>
          </button>
        ))}
      </div>

      {/* URL Input for auto/external */}
      {(settings.backendMode === 'auto' || settings.backendMode === 'external') && (
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Backend URL</label>
          <div className="flex gap-2">
            <Input
              placeholder="http://localhost:42424/v1"
              value={settings.backendMode === 'external' ? settings.externalUrl : 'http://localhost:42424/v1'}
              onChange={(e) => updateSettings({ externalUrl: e.target.value })}
              disabled={settings.backendMode === 'auto'}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : connectionResult?.success ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : connectionResult ? (
                <X className="h-4 w-4 text-red-500" />
              ) : (
                'Test'
              )}
            </Button>
          </div>
          {connectionResult && (
            <div className={cn(
              'mt-2 text-sm',
              connectionResult.success ? 'text-green-500' : 'text-red-500'
            )}>
              {connectionResult.message}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <div className="text-sm font-medium mb-2">Configuration Summary</div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Provider: <span className="text-foreground">{settings.provider || 'Not selected'}</span></div>
          <div>Model: <span className="text-foreground">{settings.model || 'Not selected'}</span></div>
          <div>Mode: <span className="text-foreground">{settings.backendMode}</span></div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
