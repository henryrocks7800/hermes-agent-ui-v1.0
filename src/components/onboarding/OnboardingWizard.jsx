import { useState } from 'react'
import { storage } from '@/lib/storage'
import { defaultWizardSettings, buildWizardStorageWrites, WIZARD_INTERMEDIATE_STEPS } from './wizardStorage.js'
import WelcomeStep from './steps/WelcomeStep.jsx'
import ProviderStep from './steps/ProviderStep.jsx'
import AgentSettingsStep from './steps/AgentSettingsStep.jsx'
import CompletionStep from './steps/CompletionStep.jsx'

// NOTE: An earlier version of this wizard included a "Tools (optional)" step
// (Web Search / Vision / TTS). Those controls live exclusively in the main
// Settings page now, so the onboarding flow is strictly: Welcome → Provider
// → Agent Settings → Completion. The pure-JS helpers that drive step count
// and storage writes live in ./wizardStorage.js so vitest can exercise them
// without spinning up a DOM.

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [settings, setSettings] = useState({ ...defaultWizardSettings })

  const updateSettings = (updates) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  const handleComplete = () => {
    const writes = buildWizardStorageWrites(settings)
    for (const [key, value] of Object.entries(writes)) {
      storage.set(key, value)
    }
    onComplete()
  }

  // step 0 = Welcome, steps 1..WIZARD_INTERMEDIATE_STEPS = intermediate,
  // final step = Completion. Progress dots are only drawn in the middle.
  const completionStep = WIZARD_INTERMEDIATE_STEPS + 1

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4" data-testid="onboarding-wizard">
      <div className="w-full max-w-lg">
        {step > 0 && step <= WIZARD_INTERMEDIATE_STEPS && (
          <div className="flex gap-2 justify-center mb-6" data-testid="wizard-progress">
            {Array.from({ length: WIZARD_INTERMEDIATE_STEPS }, (_, i) => i + 1).map(i => (
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
              onNext={() => setStep(completionStep)}
              onBack={() => setStep(1)}
            />
          )}
          {step === completionStep && (
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
