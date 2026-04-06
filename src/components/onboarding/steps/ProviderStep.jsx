import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PROVIDER_MODELS } from '@/lib/commands'
import { Eye, EyeOff, Check, ArrowLeft, ArrowRight } from 'lucide-react'

const providers = [
  { id: 'openai-codex', label: 'OpenAI Codex', sublabel: 'OAuth login' },
  { id: 'openai', label: 'OpenAI', sublabel: 'API key' },
  { id: 'anthropic', label: 'Anthropic', sublabel: 'API key' },
  { id: 'openrouter', label: 'OpenRouter', sublabel: 'API key — access to many models' },
  { id: 'ollama', label: 'Ollama', sublabel: 'Free, runs locally' },
  { id: 'lmstudio', label: 'LM Studio', sublabel: 'Free, runs locally' },
  { id: 'gemini', label: 'Google Gemini', sublabel: 'API key' },
  { id: 'copilot', label: 'GitHub Copilot', sublabel: 'OAuth login' },
  { id: 'custom', label: 'Custom endpoint', sublabel: 'Any OpenAI-compatible API' },
]

export default function ProviderStep({ settings, updateSettings, onNext, onBack }) {
  const [showApiKey, setShowApiKey] = useState(false)
  const selectedProvider = providers.find(p => p.id === settings.provider)

  const handleProviderSelect = (id) => {
    updateSettings({ provider: id })
    // Set default base URL for local providers
    if (id === 'ollama') {
      updateSettings({ baseUrl: 'http://localhost:11434/v1' })
    } else if (id === 'lmstudio') {
      updateSettings({ baseUrl: 'http://localhost:1234/v1' })
    } else if (id === 'custom') {
      updateSettings({ baseUrl: '' })
    } else {
      updateSettings({ baseUrl: 'https://api.openai.com/v1' })
    }
  }

  const handleModelSelect = (model) => {
    updateSettings({ model })
  }

  const canProceed = settings.provider && settings.model

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
          {['openai', 'anthropic', 'openrouter', 'gemini', 'custom'].includes(settings.provider) && (
            <div>
              <label className="text-sm font-medium mb-2 block">API Key</label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={settings.apiKey}
                  onChange={(e) => updateSettings({ apiKey: e.target.value })}
                  className="pr-10"
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

          {['ollama', 'lmstudio', 'custom'].includes(settings.provider) && (
            <div>
              <label className="text-sm font-medium mb-2 block">Base URL</label>
              <Input
                placeholder="http://localhost:11434/v1"
                value={settings.baseUrl}
                onChange={(e) => updateSettings({ baseUrl: e.target.value })}
              />
            </div>
          )}

          {['openai-codex', 'copilot'].includes(settings.provider) && (
            <Button className="w-full">Connect with OAuth</Button>
          )}
        </div>
      )}

      {/* Model Selection */}
      {settings.provider && settings.apiKey || ['ollama', 'lmstudio'].includes(settings.provider) && (
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Model</label>
          <Input
            placeholder="Enter model name"
            value={settings.model}
            onChange={(e) => updateSettings({ model: e.target.value })}
            className="mb-3"
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
