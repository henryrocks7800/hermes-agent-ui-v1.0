import { useState, useEffect, useCallback, useMemo } from 'react'
import { storage, KEYS } from '@/lib/storage'
import Sidebar from './Sidebar.jsx'
import ChatPage from '../chat/ChatPage.jsx'
import ThreadsPage from '../pages/ThreadsPage.jsx'
import SkillsPage from '../pages/SkillsPage.jsx'
import AutomationsPage from '../pages/AutomationsPage.jsx'
import SettingsPage from '../pages/SettingsPage.jsx'

const PROVIDER_URLS = {
  'openai': 'https://api.openai.com/v1',
  'anthropic': 'https://api.anthropic.com/v1',
  'openrouter': 'https://openrouter.ai/api/v1',
  'gemini': 'https://generativelanguage.googleapis.com/v1beta',
  'ollama': 'http://localhost:11434/v1',
  'lmstudio': 'http://localhost:1234/v1',
}

export default function MainLayout() {
  const [activePage, setActivePage] = useState('chat')
  const [threads, setThreads] = useState(() => {
    const raw = storage.get(KEYS.THREADS, [])
    return raw.map(t => ({ ...t, messages: t.messages || storage.get('thread.' + t.id, []) }))
  })
  const [activeThreadId, setActiveThreadId] = useState(() => storage.get(KEYS.ACTIVE_THREAD, null))
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  
  // Refined config state — use || to treat empty string as falsy (DEF-003)
  const [sessionParams, setSessionParams] = useState(() => ({
    mode: storage.get(KEYS.BACKEND_MODE, 'auto') || 'auto',
    provider: storage.get(KEYS.PROVIDER, 'openai') || 'openai',
    customBase: storage.get(KEYS.BASE_URL, ''),
    extUrl: storage.get(KEYS.EXTERNAL_URL, ''),
    model: storage.get(KEYS.MODEL, '') || '',
    apiKey: storage.get(KEYS.API_KEY, ''),
  }))

  const effectiveSettings = useMemo(() => {
    const { mode, provider, customBase, extUrl, model, apiKey } = sessionParams
    
    let url = 'http://localhost:8642/v1' // Default local Hermes
    
    // Logic: If user specifically wants Direct Provider, we MUST use the SaaS URL
    if (mode === 'embedded') {
      url = PROVIDER_URLS[provider] || customBase || url
    } 
    // Logic: If user wants External Hermes, use the specific IP they provided
    else if (mode === 'external') {
      url = extUrl || url
    }
    // Logic: Auto mode - tries local first
    else {
      url = 'http://localhost:8642/v1'
    }

    return { baseUrl: url, model, apiKey, provider, mode }
  }, [sessionParams])

  useEffect(() => {
    const metadata = threads.map(t => ({ id: t.id, title: t.title, createdAt: t.createdAt }))
    storage.set(KEYS.THREADS, metadata)
    threads.forEach(t => {
      if (t.messages) storage.set('thread.' + t.id, t.messages)
    })
  }, [threads])

  useEffect(() => {
    storage.set(KEYS.ACTIVE_THREAD, activeThreadId)
  }, [activeThreadId])

  useEffect(() => {
    let mounted = true
    const checkHealth = async () => {
      const url = effectiveSettings.baseUrl
      try {
        let ok = false
        if (window.hermesDesktop && window.hermesDesktop.checkBackendHealth) {
          ok = await window.hermesDesktop.checkBackendHealth(url)
        } else {
          // If it is a SaaS provider, we usually don't have a /models endpoint we can reach without a key or CORS
          // So we assume 'connected' if the URL is an official SaaS one
          if (url.includes('openai.com') || url.includes('openrouter.ai') || url.includes('anthropic.com')) {
            ok = true
          } else {
            try {
              const res = await fetch(`${url.replace(/\/$/, '')}/models`, { method: 'GET', signal: AbortSignal.timeout(2000) })
              ok = res.ok
            } catch { ok = false }
          }
        }
        if (mounted) setConnectionStatus(ok ? 'connected' : 'disconnected')
      } catch (e) {
        if (mounted) setConnectionStatus('disconnected')
      }
    }
    
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [effectiveSettings.baseUrl])

  const handleNewThread = () => {
    setActiveThreadId(null)
    setActivePage('chat')
  }

  const handleSaveSettings = (newSet) => {
    Object.entries(newSet).forEach(([key, value]) => {
      storage.set(key, value)
    })
    
    // Use nullish coalescing to allow empty strings (e.g., blank apiKey is valid for local providers)
    setSessionParams({
      mode: newSet[KEYS.BACKEND_MODE] ?? storage.get(KEYS.BACKEND_MODE) ?? 'auto',
      provider: newSet[KEYS.PROVIDER] ?? storage.get(KEYS.PROVIDER) ?? 'openai',
      customBase: newSet[KEYS.BASE_URL] ?? storage.get(KEYS.BASE_URL) ?? '',
      extUrl: newSet[KEYS.EXTERNAL_URL] ?? storage.get(KEYS.EXTERNAL_URL) ?? '',
      model: newSet[KEYS.MODEL] ?? storage.get(KEYS.MODEL) ?? '',
      apiKey: newSet[KEYS.API_KEY] ?? storage.get(KEYS.API_KEY) ?? '',
    })
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={(id) => { setActiveThreadId(id); setActivePage('chat') }}
        onNewThread={handleNewThread}
        connectionStatus={connectionStatus}
      />
      <main className="flex-1 overflow-hidden relative">
        {activePage === 'chat' && (
          <ChatPage
            thread={threads.find(t => t.id === activeThreadId)}
            onUpdateThread={(updated) => {
              setThreads(prev => {
                const exists = prev.find(t => t.id === updated.id)
                return exists ? prev.map(t => t.id === updated.id ? updated : t) : [updated, ...prev]
              })
              if (activeThreadId !== updated.id) setActiveThreadId(updated.id)
            }}
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
            settings={{ ...effectiveSettings, onSettingsChange: handleSaveSettings }}
          />
        )}
        {activePage === 'threads' && (
          <ThreadsPage
            threads={threads}
            onSelectThread={(id) => { setActiveThreadId(id); setActivePage('chat') }}
            onDeleteThread={(id) => {
              setThreads(threads.filter(t => t.id !== id))
              if (activeThreadId === id) setActiveThreadId(null)
            }}
            onRenameThread={(id, newTitle) => {
              setThreads(threads.map(t => t.id === id ? { ...t, title: newTitle } : t))
            }}
          />
        )}
        {activePage === 'skills' && <SkillsPage />}
        {activePage === 'automations' && <AutomationsPage />}
        {activePage === 'settings' && <SettingsPage onSave={handleSaveSettings} />}
      </main>
    </div>
  )
}
