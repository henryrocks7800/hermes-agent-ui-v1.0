import { useState, useEffect, useCallback, useMemo } from 'react'
import { storage, KEYS } from '@/lib/storage'
import { PROVIDER_URLS } from '@/lib/commands'
import Sidebar from './Sidebar.jsx'
import ChatPage from '../chat/ChatPage.jsx'
import ThreadsPage from '../pages/ThreadsPage.jsx'
import SettingsPage from '../pages/SettingsPage.jsx'

export default function MainLayout() {
  const [activePage, setActivePage] = useState('chat')
  const [threads, setThreads] = useState(() => {
    const raw = storage.get(KEYS.THREADS, [])
    return raw.map(t => ({ ...t, messages: t.messages || storage.get('thread.' + t.id, []) }))
  })
  const [activeThreadId, setActiveThreadId] = useState(() => storage.get(KEYS.ACTIVE_THREAD, null))
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  
  // Refined config state
  const [sessionParams, setSessionParams] = useState(() => ({
    provider: storage.get(KEYS.PROVIDER, 'local') || 'local',
    customBase: storage.get(KEYS.BASE_URL, ''),
    model: storage.get(KEYS.MODEL, '') || '',
    apiKey: storage.get(KEYS.API_KEY, ''),
  }))

  const effectiveSettings = useMemo(() => {
    const { provider, customBase, model, apiKey } = sessionParams
    
    let url = customBase || PROVIDER_URLS[provider] || PROVIDER_URLS.local

    return { baseUrl: url, model, apiKey, provider, mode: 'embedded' }
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
        if (effectiveSettings.provider === 'local') {
          try {
            const res = await fetch(`${url.replace(/\/$/, '')}/models`, { method: 'GET', signal: AbortSignal.timeout(2000) })
            ok = res.ok
          } catch { ok = false }
        } else {
          ok = false
        }
        if (mounted) setConnectionStatus(ok ? 'connected' : 'disconnected')
      } catch (e) {
        if (mounted) setConnectionStatus('disconnected')
      }
    }
    
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [effectiveSettings.baseUrl, effectiveSettings.provider])

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
      provider: newSet[KEYS.PROVIDER] ?? storage.get(KEYS.PROVIDER) ?? 'local',
      customBase: newSet[KEYS.BASE_URL] ?? storage.get(KEYS.BASE_URL) ?? '',
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
        {activePage === 'settings' && <SettingsPage onSave={handleSaveSettings} />}
      </main>
    </div>
  )
}
