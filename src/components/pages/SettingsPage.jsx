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
import { PROVIDER_MODELS, PROVIDER_URLS } from '@/lib/commands'
import { Check, X, Loader2, ExternalLink, Github, RotateCcw, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
  gemini: 'Google Gemini',
  copilot: 'GitHub Copilot',
  local: 'Local',
}

export default function SettingsPage({ onSave }) {
  const [provider, setProvider] = useState(() => storage.get(KEYS.PROVIDER, '') || 'openai')
  const [model, setModel] = useState(() => storage.get(KEYS.MODEL, ''))
  const [apiKey, setApiKey] = useState(() => storage.get(KEYS.API_KEY, ''))
  const [baseUrl, setBaseUrl] = useState(() => storage.get(KEYS.BASE_URL, PROVIDER_URLS[storage.get(KEYS.PROVIDER, '') || 'openai'] || PROVIDER_URLS.openai))
  const [backendMode, setBackendMode] = useState(() => storage.get(KEYS.BACKEND_MODE, 'auto'))
  const [externalUrl, setExternalUrl] = useState(() => storage.get(KEYS.EXTERNAL_URL, 'http://localhost:42424/v1'))
  const [maxTurns, setMaxTurns] = useState(() => storage.get(KEYS.MAX_TURNS, 90))
  const [reasoningEffort, setReasoningEffort] = useState(() => storage.get(KEYS.REASONING, 'medium'))
  const [toolProgress, setToolProgress] = useState(() => storage.get(KEYS.TOOL_PROGRESS, 'all'))
  const [webSearchEnabled, setWebSearchEnabled] = useState(() => storage.get('webSearchEnabled', false))
  const [firecrawlApiKey, setFirecrawlApiKey] = useState(() => storage.get('firecrawlApiKey', ''))
  const [visionEnabled, setVisionEnabled] = useState(() => storage.get('visionEnabled', false))
  const [ttsEnabled, setTtsEnabled] = useState(() => storage.get('ttsEnabled', false))
  const [ttsProvider, setTtsProvider] = useState(() => storage.get('ttsProvider', 'edge'))
  
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState(null)
  const [showSaveToast, setShowSaveToast] = useState(false)
  const [rerunWizardDialog, setRerunWizardDialog] = useState(false)
  
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

  // DEF-005 fix: clamp max iterations to 1-500
  const handleMaxTurnsChange = (e) => {
    const raw = parseInt(e.target.value)
    if (isNaN(raw)) { setMaxTurns(90); return }
    setMaxTurns(Math.max(1, Math.min(500, raw)))
  }

  const handleSave = () => {
    // DEF-004 fix: require a model to be set
    if (!model.trim()) {
      // Auto-select first model for provider if user forgot
      const models = PROVIDER_MODELS[provider]
      if (models && models.length > 0) {
        setModel(models[0])
        // Continue save with auto-selected model
        doSave(models[0])
        return
      }
    }
    doSave(model)
  }

  const doSave = (modelToSave) => {
    const normalizedBaseUrl = baseUrl.trim() || PROVIDER_URLS[provider] || PROVIDER_URLS.openai
    onSave({
      [KEYS.PROVIDER]: provider,
      [KEYS.MODEL]: modelToSave,
      [KEYS.API_KEY]: apiKey.trim(),
      [KEYS.BASE_URL]: normalizedBaseUrl,
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

  const handleProviderChange = (nextProvider) => {
    setProvider(nextProvider)
    setBaseUrl(PROVIDER_URLS[nextProvider] || '')
    setApiKey('')
    setConnectionResult(null)
    if (model && !(PROVIDER_MODELS[nextProvider] || []).includes(model)) {
      setModel(PROVIDER_MODELS[nextProvider]?.[0] || '')
    }
  }

  const handleTestConnection = async () => {
    const url = (baseUrl || PROVIDER_URLS[provider] || '').trim()
    setTestingConnection(true)
    setConnectionResult(null)

    try {
      if (!url) throw new Error('Missing base URL')

      if (provider === 'local') {
        const response = await fetch(`${url.replace(/\/$/, '')}/models`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        setConnectionResult({ success: true, message: 'Local endpoint responded successfully.' })
      } else {
        if (!apiKey.trim()) throw new Error('Enter an API key before testing this provider.')
        const response = await fetch(`${url.replace(/\/$/, '')}/models`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey.trim()}` },
          signal: AbortSignal.timeout(5000),
        })
        const body = await response.text().catch(() => '')
        if (!response.ok) throw new Error(body || `HTTP ${response.status}`)
        setConnectionResult({ success: true, message: 'Provider credentials look valid.' })
      }
    } catch (err) {
      setConnectionResult({ success: false, message: err.message || 'Connection failed' })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleRerunWizard = () => {
    storage.remove(KEYS.ONBOARDING_DONE)
    window.location.reload()
  }

  const handleCheckForUpdates = () => {
    if (window.hermesDesktop?.openExternal) {
      window.hermesDesktop.openExternal('https://github.com/henryrocks7800/hermes-agent-desktop/releases')
    }
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
      setUpdateResult(result || { success: false, message: 'Update mechanism only available in Desktop App.' })
    } catch (err) {
      setUpdateResult({ success: false, message: err.message })
    } finally {
      setUpdating(false)
    }
  }

  const isDesktop = !!window.hermesDesktop?.isDesktop

  return (
    <div className="h-full flex flex-col relative bg-background animate-in fade-in duration-300">
      {/* Toast Notification */}
      {showSaveToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-primary-foreground/20">
            <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Check className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">Settings saved successfully!</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-8 pt-10 pb-24">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-muted-foreground">Configure AI providers, backend preferences, and agent behavior.</p>
          </div>

          <Tabs defaultValue="model" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl border border-border/50">
              <TabsTrigger value="model" className="rounded-lg">Connection</TabsTrigger>
              <TabsTrigger value="agent" className="rounded-lg">Agent</TabsTrigger>
              <TabsTrigger value="tools" className="rounded-lg">Tools</TabsTrigger>
            </TabsList>

            <TabsContent value="model" className="space-y-6 mt-8">
              <div className="grid gap-6">
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                  <h3 className="font-semibold mb-4 text-base">AI Provider</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.keys(PROVIDER_MODELS).map((p) => (
                      <Button
                        key={p}
                        variant={provider === p ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleProviderChange(p)}
                        className="justify-start h-10 px-4"
                      >
                        {PROVIDER_LABELS[p] || p}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                  <h3 className="font-semibold mb-4 text-base">Active Model</h3>
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Enter model identifier"
                    className={cn("mb-4 h-11 bg-background", !model.trim() && "border-amber-500/50")}
                  />
                  {!model.trim() && (
                    <p className="text-[11px] text-amber-500 mb-3">⚠ Select or type a model name before saving.</p>
                  )}
                  {PROVIDER_MODELS[provider] && (
                    <div className="flex flex-wrap gap-2">
                      {PROVIDER_MODELS[provider].map((m) => (
                        <button
                          key={m}
                          onClick={() => setModel(m)}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                            model === m 
                              ? "bg-primary text-primary-foreground border-primary" 
                              : "bg-muted/50 hover:bg-muted text-muted-foreground border-transparent"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-xl border border-border bg-card shadow-sm animate-in zoom-in-95">
                  <h3 className="font-semibold mb-4 text-base">Endpoint</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Base URL</label>
                    <Input
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder={PROVIDER_URLS[provider] || 'https://api.openai.com/v1'}
                      className="h-11 bg-background font-mono text-sm"
                      autoComplete="off"
                    />
                    <p className="text-[11px] text-muted-foreground">Prepopulated from the provider docs. You can still override it.</p>
                  </div>
                </div>

                {provider !== 'local' ? (
                  <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="font-semibold mb-4 text-base">Authentication</h3>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">API Key</label>
                      <Input
                        type="password"
                        autoComplete="off"
                        name="hermes-api-key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your API key"
                        className="h-11 bg-background"
                      />
                      <p className="text-[11px] text-muted-foreground">OAuth is disabled for now. This uses direct API key authentication only.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-sm text-green-600 dark:text-green-400 flex items-center gap-3">
                    <Check className="h-5 w-5 shrink-0" />
                    <span>Local uses your own compatible endpoint, for example Hermes, Ollama, or LM Studio.</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
                    {testingConnection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Test connection
                  </Button>
                  {connectionResult && (
                    <div className={cn('text-sm', connectionResult.success ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
                      {connectionResult.message}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="agent" className="space-y-6 mt-8">
              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <h3 className="font-semibold mb-1 text-base">Execution Limits</h3>
                <p className="text-xs text-muted-foreground mb-6">Control how many autonomous loops the agent can perform.</p>
                <div className="flex items-center gap-6">
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={maxTurns}
                    onChange={handleMaxTurnsChange}
                    className="w-28 h-11 bg-background text-lg font-bold"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Max Iterations</span>
                      <span className="text-muted-foreground">Range: 1–500</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (maxTurns / 500) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                <h3 className="font-semibold mb-6 text-base text-center">Behavior Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block text-center">Reasoning Effort</label>
                    <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
                      {['low', 'medium', 'high'].map((r) => (
                        <button
                          key={r}
                          onClick={() => setReasoningEffort(r)}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-md transition-all capitalize",
                            reasoningEffort === r ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block text-center">Logging Verbosity</label>
                    <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
                      {['off', 'new', 'all', 'verbose'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setToolProgress(t)}
                          className={cn(
                            "flex-1 py-2 text-[10px] font-bold rounded-md transition-all capitalize",
                            toolProgress === t ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="space-y-4 mt-8">
              <div className="grid gap-3">
                <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <ExternalLink className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">Web Search Capabilities</div>
                      <div className="text-xs text-muted-foreground">Browse the internet using Firecrawl</div>
                    </div>
                  </div>
                  <Switch checked={webSearchEnabled} onCheckedChange={setWebSearchEnabled} />
                </div>

                {webSearchEnabled && (
                  <div className="p-5 rounded-xl border border-primary/20 bg-primary/[0.02] shadow-sm animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-muted-foreground border-b border-border mb-4 block pb-1">FIRECRAWL API KEY</label>
                    <Input 
                      type="password"
                      placeholder="fc-..." 
                      value={firecrawlApiKey}
                      onChange={(e) => setFirecrawlApiKey(e.target.value)}
                      className="bg-background h-11"
                    />
                  </div>
                )}

                <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <Badge className="bg-transparent text-current shadow-none p-0">
                         <Github className="h-5 w-5" />
                      </Badge>
                    </div>
                    <div>
                      <div className="font-bold text-sm">Vision & Analysis</div>
                      <div className="text-xs text-muted-foreground">Process and describe local images</div>
                    </div>
                  </div>
                  <Switch checked={visionEnabled} onCheckedChange={setVisionEnabled} />
                </div>

                <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <Download className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">Text-to-Speech Output</div>
                      <div className="text-xs text-muted-foreground">Hear agent responses audibly</div>
                    </div>
                  </div>
                  <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
                </div>

                {/* DEF-010 fix: TTS provider selector when TTS is enabled */}
                {ttsEnabled && (
                  <div className="p-5 rounded-xl border border-primary/20 bg-primary/[0.02] shadow-sm animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-muted-foreground border-b border-border mb-4 block pb-1">TTS PROVIDER</label>
                    <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
                      {['edge', 'elevenlabs', 'openai'].map((tp) => (
                        <button
                          key={tp}
                          onClick={() => setTtsProvider(tp)}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-md transition-all capitalize",
                            ttsProvider === tp ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {tp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

            </div>
      </div>

      {/* Persistent Save Bar */}
      <div className="fixed bottom-0 right-0 left-60 bg-background/95 backdrop-blur-md border-t border-border p-5 flex items-center justify-center px-10 z-50">
        <div className="max-w-2xl w-full flex items-center justify-between">
           <p className="text-xs text-muted-foreground italic hidden sm:block">Settings change after saving.</p>
           <Button 
            onClick={handleSave} 
            className="w-full sm:w-48 h-12 font-black tracking-widest uppercase text-xs shadow-lg hover:shadow-primary/20 transition-all border-b-4 border-primary/40 active:border-b-0 active:translate-y-1"
          >
            Apply Settings
          </Button>
        </div>
      </div>

      {/* Rerun Wizard Modal */}
      <Dialog open={rerunWizardDialog} onOpenChange={setRerunWizardDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">System Reset</DialogTitle>
            <DialogDescription className="pt-2 text-base">
              The setup wizard will re-run. Your current configurations will be kept as the new defaults.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 gap-3 sm:flex-row flex-col">
            <Button variant="outline" onClick={() => setRerunWizardDialog(false)} className="h-12 flex-1 font-bold">Cancel</Button>
            <Button onClick={handleRerunWizard} className="h-12 flex-1 font-bold">Initiate Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Log Modal */}
      <Dialog open={updateDialog} onOpenChange={(open) => !updating && setUpdateDialog(open)}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border shadow-2xl overflow-hidden p-0">
          <div className="p-8 pb-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase italic">
                Backend Synchronization
                {updating && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </DialogTitle>
              <DialogDescription className="pt-1">
                Updating Hermes Engine core from GitHub and standardizing dependencies.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-8 pt-0">
             <div className="bg-black/90 rounded-xl border border-white/5 p-4 shadow-inner">
              <ScrollArea className="h-[250px] pr-4">
                <div ref={scrollRef} className="font-mono text-[11px] leading-relaxed text-blue-400/90 selection:bg-blue-500/20">
                  {updateLog.length === 0 && <div className="text-gray-500 italic animate-pulse">Requesting update stream...</div>}
                  {updateLog.map((line, i) => (
                    <div key={i} className="mb-1">
                       <span className="text-gray-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                       {line}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {updateResult && (
              <div className={cn(
                "mt-6 p-4 rounded-xl text-sm flex items-start gap-4 animate-in slide-in-from-bottom-2 duration-500",
                updateResult.success ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive border border-destructive/20 shadow-[0_0_20px_-5px_rgba(239,68,68,0.15)]"
              )}>
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border", updateResult.success ? "bg-green-500/20 border-green-500/30" : "bg-destructive/20 border-destructive/30")}>
                   {updateResult.success ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
                </div>
                <div>
                  <div className="font-black uppercase italic tracking-wider">{updateResult.success ? "Protocol Complete" : "Synchronization Failed"}</div>
                  <div className="mt-1 font-medium opacity-90 leading-tight">
                    {updateResult.success 
                      ? "The engine has been standardized. Restart the application to engage improvements." 
                      : updateResult.message}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-muted/50 p-6 flex justify-end gap-3 border-t border-border/50">
            <Button 
                onClick={() => setUpdateDialog(false)} 
                disabled={updating}
                className="px-10 font-black tracking-widest uppercase text-xs"
              >
              Disengage
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
