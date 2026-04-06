import { useState, useEffect, useCallback } from 'react'
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
  
  const resolveEffectiveUrl = useCallback((mode, provider, customBaseUrl, externalUrl) => {
    if (mode === 'embedded') {
      return PROVIDER_URLS[provider] || customBaseUrl || 'http://localhost:42424/v1'
    }
    if (mode === 'external') {
      return externalUrl || 'http://localhost:42424/v1'
    }
    // 'auto' mode
    return 'http://localhost:42424/v1'
  }, [])

  const [settings, setSettings] = useState(() => {
    const mode = storage.get(KEYS.BACKEND_MODE, 'auto')
    const provider = storage.get(KEYS.PROVIDER, 'openai')
    const baseUrl = storage.get(KEYS.BASE_URL, '')
    const extUrl = storage.get(KEYS.EXTERNAL_URL, 'http://localhost:42424/v1')
    
    return {
      mode,
      provider,
      baseUrl: resolveEffectiveUrl(mode, provider, baseUrl, extUrl),
      model: storage.get(KEYS.MODEL, 'gpt-4o'),
      apiKey: storage.get(KEYS.API_KEY, ''),
    }
  })

  // Synchronization with LocalStorage
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

  // Periodic Connection Check
  useEffect(() => {
    let mounted = true
    const checkHealth = async () => {
      const url = settings.baseUrl
      try {
        let ok = false
        if (window.hermesDesktop && window.hermesDesktop.checkBackendHealth) {
          ok = await window.hermesDesktop.checkBackendHealth(url)
        } else {
          try {
            // Bypass health check for safe SaaS endpoints to avoid CORS noise
            if (url.includes('api.openai.com') || url.includes('openrouter.ai') || url.includes('anthropic.com')) {
               ok = true 
            } else {
               const res = await fetch(`${url.replace(/\/$/, '')}/models`, { method: 'GET', signal: AbortSignal.timeout(3000) })
               ok = res.ok
            }
          } catch { ok = false }
        }
        if (mounted) setConnectionStatus(ok ? 'connected' : 'disconnected')
      } catch (e) {
        if (mounted) setConnectionStatus('disconnected')
      }
    }
    
    checkHealth()
    const interval = setInterval(checkHealth, 20000)
    return () => { mounted = false; clearInterval(interval) }
  }, [settings.baseUrl])

  const handleNewThread = () => {
    setActiveThreadId(null)
    setActivePage('chat')
  }

  const handleSelectThread = (id) => {
    setActiveThreadId(id)
    setActivePage('chat')
  }

  const handleSaveSettings = (newSet) => {
    // 1. Commit all to localStorage first
    Object.entries(newSet).forEach(([key, value]) => {
      storage.set(key, value)
    })
    
    // 2. Refresh local state
    const mode = storage.get(KEYS.BACKEND_MODE)
    const provider = storage.get(KEYS.PROVIDER)
    const customBase = storage.get(KEYS.BASE_URL)
    const extUrl = storage.get(KEYS.EXTERNAL_URL)

    setSettings({
      mode,
      provider,
      baseUrl: resolveEffectiveUrl(mode, provider, customBase, extUrl),
      model: storage.get(KEYS.MODEL),
      apiKey: storage.get(KEYS.API_KEY),
    })
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
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
            settings={{ ...settings, onSettingsChange: handleSaveSettings }}
          />
        )}
        {activePage === 'threads' && (
          <ThreadsPage
            threads={threads}
            onSelectThread={handleSelectThread}
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
