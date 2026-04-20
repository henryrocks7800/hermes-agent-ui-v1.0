import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PROVIDER_MODELS, PROVIDER_URLS } from '@/lib/commands'
import { Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react'

const providers = [
  { id: 'openai', label: 'OpenAI', sublabel: 'API key' },
  { id: 'anthropic', label: 'Anthropic', sublabel: 'API key' },
  { id: 'openrouter', label: 'OpenRouter', sublabel: 'API key' },
  { id: 'gemini', label: 'Google Gemini', sublabel: 'API key' },
  { id: 'copilot', label: 'GitHub Copilot', sublabel: 'API key' },
  { id: 'local', label: 'Local', sublabel: 'Hermes, Ollama, LM Studio, or any compatible local endpoint' },
]

export default function ProviderStep({ settings, updateSettings, onNext, onBack }) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [error, setError] = useState(null)
  
  const selectedProvider = providers.find(p => p.id === settings.provider)

  const handleProviderSelect = (id) => {
    updateSettings({ provider: id, model: '', apiKey: '', baseUrl: PROVIDER_URLS[id] || '' })
    setError(null)
  }

  const handleModelSelect = (model) => {
    updateSettings({ model })
    setError(null)
  }

  const handleNext = () => {
    if (!settings.provider) {
      setError('Please select a provider.')
      return
    }

    const requiresApiKey = settings.provider !== 'local'
    if (requiresApiKey && !settings.apiKey.trim()) {
      setError('API key is required for this provider.')
      return
    }

    if (!settings.model.trim()) {
      setError('Please select or enter a model name.')
      return
    }

    setError(null)
    onNext()
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">AI Provider & Model</h2>
        <p className="text-sm text-muted-foreground">Choose your AI provider and model.</p>
      </div>

      {/* Provider Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {providers.map((p) => (
          <button
            key={p.id}
            className={cn(
              'p-3 rounded-lg border text-left transition-all',
              settings.provider === p.id
                ? 'border-primary ring-2 ring-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            )}
            onClick={() => handleProviderSelect(p.id)}
          >
            <div className="font-medium text-sm">{p.label}</div>
            <div className="text-xs text-muted-foreground">{p.sublabel}</div>
          </button>
        ))}
      </div>

      {/* Credential Input */}
      {selectedProvider && (
        <div className="space-y-4 mb-6">
          {settings.provider !== 'local' && (
            <div>
              <label className="text-sm font-medium mb-2 block">API Key</label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={settings.apiKey}
                  onChange={(e) => {
                    updateSettings({ apiKey: e.target.value })
                    setError(null)
                  }}
                  className={cn("pr-10", error && !settings.apiKey.trim() && "border-destructive focus-visible:ring-destructive")}
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Base URL</label>
            <Input
              placeholder={PROVIDER_URLS[settings.provider] || 'https://api.openai.com/v1'}
              value={settings.baseUrl}
              autoComplete="off"
              onChange={(e) => updateSettings({ baseUrl: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Model Selection */}
      {selectedProvider && (
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Model</label>
          <Input
            placeholder="Enter model name"
            value={settings.model}
            onChange={(e) => {
              updateSettings({ model: e.target.value })
              setError(null)
            }}
            className={cn("mb-3", error && !settings.model.trim() && "border-destructive focus-visible:ring-destructive")}
          />
          {PROVIDER_MODELS[settings.provider] && (
            <div className="flex flex-wrap gap-2">
              {PROVIDER_MODELS[settings.provider].map((m) => (
                <Badge
                  key={m}
                  variant={settings.model === m ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleModelSelect(m)}
                >
                  {m}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} className="gap-2">
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
