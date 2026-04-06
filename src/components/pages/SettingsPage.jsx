import { useState, useRef, useEffect } from 'react'
import { storage, KEYS } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PROVIDER_MODELS } from '@/lib/commands'
import { ArrowLeft, ArrowRight, Check, X, Loader2, ExternalLink, Github, RotateCcw, Download } from 'lucide-react'
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
  const [firecrawlApiKey, setFirecrawlApiKey] = useState(storage.get('firecrawlApiKey', ''))
  const [visionEnabled, setVisionEnabled] = useState(storage.get('visionEnabled', false))
  const [ttsEnabled, setTtsEnabled] = useState(storage.get('ttsEnabled', false))
  const [ttsProvider, setTtsProvider] = useState(storage.get('ttsProvider', 'edge'))
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState(null)
  
  const [showSaveToast, setShowSaveToast] = useState(false)
  const [rerunWizardDialog, setRerunWizardDialog] = useState(false)
  
  // Updater state
  const [updateDialog, setUpdateDialog] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateLog, setUpdateLog] = useState([])
  const [updateResult, setUpdateResult] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [updateLog])

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
      firecrawlApiKey,
      visionEnabled,
      ttsEnabled,
      ttsProvider,
    })
    
    setShowSaveToast(true)
    setTimeout(() => setShowSaveToast(false), 3000)
  }

  const handleTestConnection = async () => {
    const url = backendMode === 'external' ? externalUrl : 'http://localhost:42424/v1'
    setTestingConnection(true)
    setConnectionResult(null)

    try {
      let ok = false
      if (window.hermesDesktop?.checkBackendHealth) {
        ok = await window.hermesDesktop.checkBackendHealth(url)
      } else {
        const response = await fetch(`${url.replace(/\/$/, '')}/models`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        })
        ok = response.ok
      }
      
      if (ok) {
        setConnectionResult({ success: true, message: 'Connection successful!' })
      } else {
        setConnectionResult({ success: false, message: `Connection failed` })
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

  const handleRerunWizard = () => {
    storage.remove(KEYS.ONBOARDING_DONE)
    window.location.reload()
  }

  const handleUpdateBackend = async () => {
    setUpdateDialog(true)
    setUpdating(true)
    setUpdateLog([])
    setUpdateResult(null)

    if (window.hermesDesktop?.onUpdateProgress) {
      window.hermesDesktop.onUpdateProgress((msg) => {
        setUpdateLog(prev => [...prev, msg])
      })
    }

    try {
      const result = await window.hermesDesktop?.updateBackend()
      setUpdateResult(result || { success: false, message: 'Update mechanism not available.' })
    } catch (err) {
      setUpdateResult({ success: false, message: err.message })
    } finally {
      setUpdating(false)
    }
  }

  const isDesktop = window.hermesDesktop?.isDesktop

  return (
    <div className="h-full overflow-y-auto p-6 relative">
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <div>
          <h1 className="text-2xl font-bold mb-1">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your Hermes Agent experience.</p>
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
              <h3 className="font-medium mb-3 text-sm">Provider</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
              <h3 className="font-medium mb-3 text-sm">Model</h3>
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
                      className="cursor-pointer font-medium"
                      onClick={() => setModel(m)}
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3 text-sm">API Key</h3>
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
              <h3 className="font-medium mb-3 text-sm">Backend Mode</h3>
              <div className="space-y-2">
                {[
                  { id: 'auto', label: 'Auto (Recommended)' },
                  { id: 'external', label: 'External Backend' },
                  { id: 'embedded', label: 'Provider Direct' },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                      backendMode === m.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="backendMode"
                      checked={backendMode === m.id}
                      onChange={() => setBackendMode(m.id)}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm font-medium">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {(backendMode === 'auto' || backendMode === 'external') && (
              <div className="p-4 rounded-lg border border-border animate-in fade-in slide-in-from-top-1">
                <h3 className="font-medium mb-3 text-sm">Backend URL</h3>
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
                  <div className={cn('mt-2 text-sm flex items-center gap-1.5', connectionResult.success ? 'text-green-500' : 'text-destructive')}>
                    {connectionResult.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {connectionResult.message}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Agent */}
          <TabsContent value="agent" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3 text-sm">Max Iterations</h3>
              <Input
                type="number"
                value={maxTurns}
                onChange={(e) => setMaxTurns(parseInt(e.target.value) || 90)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground mt-2">Maximum number of tool calls the agent can make before stopping.</p>
            </div>

            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3 text-sm">Reasoning Effort</h3>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((r) => (
                  <Button
                    key={r}
                    variant={reasoningEffort === r ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReasoningEffort(r)}
                    className="capitalize"
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border">
              <h3 className="font-medium mb-3 text-sm">Tool Progress</h3>
              <div className="flex gap-2 flex-wrap">
                {['off', 'new', 'all', 'verbose'].map((t) => (
                  <Button
                    key={t}
                    variant={toolProgress === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setToolProgress(t)}
                    className="capitalize"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tools */}
          <TabsContent value="tools" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Web Search</div>
                  <div className="text-xs text-muted-foreground">Enable web search capabilities</div>
                </div>
                <Switch checked={webSearchEnabled} onCheckedChange={setWebSearchEnabled} />
              </div>
              {webSearchEnabled && (
                <div className="mt-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-1">
                  <label className="text-sm font-medium mb-2 block">Firecrawl API Key</label>
                  <Input 
                    type="password"
                    placeholder="fc-..." 
                    value={firecrawlApiKey}
                    onChange={(e) => setFirecrawlApiKey(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg border border-border flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Vision</div>
                <div className="text-xs text-muted-foreground">Enable image analysis</div>
              </div>
              <Switch checked={visionEnabled} onCheckedChange={setVisionEnabled} />
            </div>

            <div className="p-4 rounded-lg border border-border flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Text-to-Speech</div>
                <div className="text-xs text-muted-foreground">Enable voice responses</div>
              </div>
              <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
            </div>
          </TabsContent>
        </Tabs>

        {/* About */}
        <Separator />
        <div className="p-4 rounded-lg border border-border">
          <h3 className="font-medium mb-4 text-sm">About</h3>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-sm">Hermes Agent Desktop</div>
              <div className="text-xs text-muted-foreground mt-0.5">Version 1.0.0</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCheckForUpdates} className="text-xs h-8">
                Check for Updates
                <ExternalLink className="h-3 w-3 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.hermesDesktop?.openExternal?.('https://github.com/henryrocks7800/hermes-agent-desktop')}
                className="gap-1.5 text-xs h-8"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </Button>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex flex-col gap-2">
            <Button 
              variant="secondary" 
              className="w-full justify-start gap-2 h-9"
              onClick={() => setRerunWizardDialog(true)}
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              Rerun Setup Wizard
            </Button>
            
            <Button 
              variant="secondary" 
              className="w-full justify-start gap-2 h-9"
              onClick={handleUpdateBackend}
              disabled={!isDesktop}
              title={!isDesktop ? "Only available in the desktop app" : ""}
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              Update Hermes Backend
            </Button>
          </div>
        </div>
      </div>

      {/* Fixed bottom bar for Save button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border flex items-center justify-between">
        <div className="flex-1">
          {showSaveToast && (
            <div className="flex items-center gap-2 text-sm text-green-500 font-medium animate-in fade-in slide-in-from-bottom-2">
              <Check className="h-4 w-4" />
              Settings saved
            </div>
          )}
        </div>
        <Button onClick={handleSave} className="w-32">
          Save Settings
        </Button>
      </div>

      {/* Rerun Wizard Dialog */}
      <Dialog open={rerunWizardDialog} onOpenChange={setRerunWizardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rerun Setup Wizard</DialogTitle>
            <DialogDescription>
              This will rerun the setup wizard. Your current settings will be preserved as defaults. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRerunWizardDialog(false)}>Cancel</Button>
            <Button onClick={handleRerunWizard}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Backend Dialog */}
      <Dialog open={updateDialog} onOpenChange={(open) => !updating && setUpdateDialog(open)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Update Hermes Agent
              {updating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </DialogTitle>
            <DialogDescription>
              Pulling the latest source code and reinstalling dependencies.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 rounded-md bg-muted border border-border p-3">
            <div 
              ref={scrollRef}
              className="h-[200px] overflow-y-auto font-mono text-xs space-y-1.5"
            >
              {updateLog.length === 0 && <div className="text-muted-foreground">Initializing...</div>}
              {updateLog.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">{line}</div>
              ))}
            </div>
          </div>

          {updateResult && (
            <div className={cn(
              "mt-4 p-3 rounded-md text-sm flex items-start gap-2",
              updateResult.success ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"
            )}>
              {updateResult.success ? <Check className="h-4 w-4 shrink-0 mt-0.5" /> : <X className="h-4 w-4 shrink-0 mt-0.5" />}
              <div>
                <div className="font-medium">{updateResult.success ? "Update Successful" : "Update Failed"}</div>
                <div className="mt-1 opacity-90 text-xs">
                  {updateResult.success 
                    ? "Restart the app to use the new version." 
                    : updateResult.message}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button onClick={() => setUpdateDialog(false)} disabled={updating}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
