import { useState, useEffect } from 'react'
import { storage, KEYS } from './lib/storage.js'
import OnboardingWizard from './components/onboarding/OnboardingWizard.jsx'
import MainLayout from './components/layout/MainLayout.jsx'

export default function App() {
  const [onboarded, setOnboarded] = useState(null)

  useEffect(() => {
    const done = storage.get(KEYS.ONBOARDING_DONE, false)
    setOnboarded(!!done)
  }, [])

  if (onboarded === null) return null

  if (!onboarded) {
    return <OnboardingWizard onComplete={() => setOnboarded(true)} />
  }

  return <MainLayout />
}
