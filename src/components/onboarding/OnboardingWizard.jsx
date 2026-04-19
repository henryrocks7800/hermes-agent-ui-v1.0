import { useState } from 'react'
import { storage, KEYS } from '@/lib/storage'
import WelcomeStep from './steps/WelcomeStep.jsx'
import ProviderStep from './steps/ProviderStep.jsx'
import AgentSettingsStep from './steps/AgentSettingsStep.jsx'
import ToolsStep from './steps/ToolsStep.jsx'
import CompletionStep from './steps/CompletionStep.jsx'

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [settings, setSettings] = useState({
    provider: '',
    apiKey: '',
    baseUrl: '',
    model: '',
    maxTurns: 90,
    reasoningEffort: 'medium',
    toolProgress: 'all',
    webSearchEnabled: false,
    firecrawlApiKey: '',
    visionEnabled: false,
    ttsEnabled: false,
    ttsProvider: 'edge',
  })

  const updateSettings = (updates) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  const handleComplete = () => {
    storage.set(KEYS.PROVIDER, settings.provider)
    storage.set(KEYS.MODEL, settings.model)
    storage.set(KEYS.API_KEY, settings.apiKey)
    storage.set(KEYS.BASE_URL, settings.baseUrl || 'http://localhost:42424/v1')
    storage.set(KEYS.MAX_TURNS, settings.maxTurns)
    storage.set(KEYS.REASONING, settings.reasoningEffort)
    storage.set(KEYS.TOOL_PROGRESS, settings.toolProgress)
    storage.set('webSearchEnabled', settings.webSearchEnabled)
    storage.set('firecrawlApiKey', settings.firecrawlApiKey)
    storage.set('visionEnabled', settings.visionEnabled)
    storage.set('ttsEnabled', settings.ttsEnabled)
    storage.set('ttsProvider', settings.ttsProvider)
    storage.set(KEYS.ONBOARDING_DONE, true)
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {step > 0 && step <= 3 && (
          <div className="flex gap-2 justify-center mb-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : i < step ? 'bg-primary/40' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}

        <div className="animate-in fade-in duration-200">
          {step === 0 && (
            <WelcomeStep onBegin={() => setStep(1)} onSkip={() => handleComplete()} />
          )}
          {step === 1 && (
            <ProviderStep
              settings={settings}
              updateSettings={updateSettings}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <AgentSettingsStep
              settings={settings}
              updateSettings={updateSettings}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <ToolsStep
              settings={settings}
              updateSettings={updateSettings}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <CompletionStep
              settings={settings}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>
    </div>
  )
}
