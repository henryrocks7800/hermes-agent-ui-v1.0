import { useState } from 'react'
import { storage, KEYS } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PROVIDER_MODELS } from '@/lib/commands'
import { ArrowLeft, ArrowRight, Check, X, Loader2, ExternalLink, Github } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage({ onSave }) {
  const [provider, setProvider] = useState(storage.get(KEYS.PROVIDER, 'openai'))
  const [model, setModel] = useState(storage.get(KEYS.MODEL, 'gpt-4o'))
  const [apiKey, setApiKey] = useState(storage.get(KEYS.API_KEY, ''))
  const [baseUrl, setBaseUrl] = useState(storage.get(KEYS.BASE_URL, 'http://localhost:42424/v1'))
  const [backendMode, setBackendMode] = useState(storage.get(KEYS.BACKEND_MODE, 'auto'))
  const [externalUrl, setExternalUrl] = useState(storage.get(KEYS.EXTERNAL_URL, 'http://localhost:42424/v1'))
  const [maxTurns, setMaxTurns] = useState(storage.get(KEYS.MAX_TURNS, 90))
  const [reasoningEffort, setReasoningEffort] = useState(storage.get(KEYS.REASONING, 'medium'))
  const [toolProgress, setToolProgress] = useState(storage.get(KEYS.TOOL_PROGRESS, 'all'))
  const [webSearchEnabled, setWebSearchEnabled] = useState(storage.get('webSearchEnabled', false))
  const [visionEnabled, setVisionEnabled] = useState(storage.get('visionEnabled', false))
  const [ttsEnabled, setTtsEnabled] = useState(storage.get('ttsEnabled', false))
  const [ttsProvider, setTtsProvider] = useState(storage.get('ttsProvider', 'edge'))
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState(null)

  const handleSave = () => {
    onSave({
      [KEYS.PROVIDER]: provider,
      [KEYS.MODEL]: model,
      [KEYS.API_KEY]: apiKey,
      [KEYS.BASE_URL]: baseUrl,
      [KEYS.BACKEND_MODE]: backendMode,
      [KEYS.EXTERNAL_URL]: externalUrl,
      [KEYS.MAX_TURNS]: maxTurns,
      [KEYS.REASONING]: reasoningEffort,
      [KEYS.TOOL_PROGRESS]: toolProgress,
      webSearchEnabled,
      visionEnabled,
      ttsEnabled,
      ttsProvider,
    })
  }

  const handleTestConnection = async () => {
    const url = backendMode === 'external' ? externalUrl : 'http://localhost:42424/v1'
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

  const handleCheckForUpdates = () => {
    if (window.hermesDesktop?.openExternal) {
      window.hermesDesktop.openExternal('https://github.com/henryrocks7800/hermes-agent-desktop/releases')
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground">Configure your Hermes Agent experience.</p>
        </div>

        <Tabs defaultValue="model" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="backend">Backend</TabsTrigger>
            <TabsTrigger value="agent">Agent</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          {/* Model & Provider */}
          <TabsContent value="model" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3">Provider</h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(PROVIDER_MODELS).map((p) => (
                  <Button
                    key={p}
                    variant={provider === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setProvider(p)}
                    className="justify-start"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3">Model</h3>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Enter model name"
                className="mb-3"
              />
              {PROVIDER_MODELS[provider] && (
                <div className="flex flex-wrap gap-2">
                  {PROVIDER_MODELS[provider].map((m) => (
                    <Badge
                      key={m}
                      variant={model === m ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setModel(m)}
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3">API Key</h3>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
          </TabsContent>

          {/* Backend */}
          <TabsContent value="backend" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3">Backend Mode</h3>
              <div className="space-y-2">
                {[
                  { id: 'auto', label: 'Auto (Recommended)' },
                  { id: 'external', label: 'External Backend' },
                  { id: 'embedded', label: 'Provider Direct' },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-md border cursor-pointer',
                      backendMode === m.id ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <input
                      type="radio"
                      name="backendMode"
                      checked={backendMode === m.id}
                      onChange={() => setBackendMode(m.id)}
                      className="sr-only"
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {(backendMode === 'auto' || backendMode === 'external') && (
              <div className="p-4 rounded-lg border border-border">
                <h3 className="font-medium mb-3">Backend URL</h3>
                <div className="flex gap-2">
                  <Input
                    value={backendMode === 'external' ? externalUrl : 'http://localhost:42424/v1'}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    disabled={backendMode === 'auto'}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
                    {testingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                  </Button>
                </div>
                {connectionResult && (
                  <div className={cn('mt-2 text-sm', connectionResult.success ? 'text-green-500' : 'text-red-500')}>
                    {connectionResult.message}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Agent */}
          <TabsContent value="agent" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3">Max Iterations</h3>
              <Input
                type="number"
                value={maxTurns}
                onChange={(e) => setMaxTurns(parseInt(e.target.value) || 90)}
                className="w-32"
              />
            </div>

            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3">Reasoning Effort</h3>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((r) => (
                  <Button
                    key={r}
                    variant={reasoningEffort === r ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReasoningEffort(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3">Tool Progress</h3>
              <div className="flex gap-2 flex-wrap">
                {['off', 'new', 'all', 'verbose'].map((t) => (
                  <Button
                    key={t}
                    variant={toolProgress === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setToolProgress(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tools */}
          <TabsContent value="tools" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border border-border flex items-center justify-between">
              <div>
                <div className="font-medium">Web Search</div>
                <div className="text-sm text-muted-foreground">Enable web search capabilities</div>
              </div>
              <Switch checked={webSearchEnabled} onCheckedChange={setWebSearchEnabled} />
            </div>

            <div className="p-4 rounded-lg border border-border flex items-center justify-between">
              <div>
                <div className="font-medium">Vision</div>
                <div className="text-sm text-muted-foreground">Enable image analysis</div>
              </div>
              <Switch checked={visionEnabled} onCheckedChange={setVisionEnabled} />
            </div>

            <div className="p-4 rounded-lg border border-border flex items-center justify-between">
              <div>
                <div className="font-medium">Text-to-Speech</div>
                <div className="text-sm text-muted-foreground">Enable voice responses</div>
              </div>
              <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
            </div>
          </TabsContent>
        </Tabs>

        {/* About */}
        <Separator />
        <div className="p-4 rounded-lg border border-border">
          <h3 className="font-medium mb-3">About</h3>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm">Hermes Agent Desktop</div>
              <div className="text-xs text-muted-foreground">Version 1.0.0</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleCheckForUpdates}>
              Check for Updates
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.hermesDesktop?.openExternal?.('https://github.com/henryrocks7800/hermes-agent-desktop')}
            className="gap-2"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </Button>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save Settings
        </Button>
      </div>
    </div>
  )
}
