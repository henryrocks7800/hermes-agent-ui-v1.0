import { useState, useEffect } from 'react'
import { storage, KEYS } from './lib/storage.js'
import OnboardingWizard from './components/onboarding/OnboardingWizard.jsx'
import MainLayout from './components/layout/MainLayout.jsx'

export default function App() {
  const [onboarded, setOnboarded] = useState(null)
  
  // Theme initialization
  useEffect(() => {
    const theme = storage.get('theme', 'dark')
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

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
