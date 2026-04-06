import { useState, useEffect } from 'react'
import { storage, KEYS } from '@/lib/storage'
import Sidebar from './Sidebar.jsx'
import ChatPage from '../chat/ChatPage.jsx'
import ThreadsPage from '../pages/ThreadsPage.jsx'
import SkillsPage from '../pages/SkillsPage.jsx'
import AutomationsPage from '../pages/AutomationsPage.jsx'
import SettingsPage from '../pages/SettingsPage.jsx'

export default function MainLayout() {
  const [activePage, setActivePage] = useState('chat')
  const [threads, setThreads] = useState(() => storage.get(KEYS.THREADS, []))
  const [activeThreadId, setActiveThreadId] = useState(() => storage.get(KEYS.ACTIVE_THREAD, null))
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  useEffect(() => {
    storage.set(KEYS.THREADS, threads)
  }, [threads])

  useEffect(() => {
    storage.set(KEYS.ACTIVE_THREAD, activeThreadId)
  }, [activeThreadId])

  const handleNewThread = () => {
    const newThread = {
      id: Date.now().toString(),
      title: 'New thread',
      createdAt: new Date().toISOString(),
      messages: [],
    }
    setThreads([newThread, ...threads])
    setActiveThreadId(newThread.id)
    setActivePage('chat')
  }

  const handleSelectThread = (id) => {
    setActiveThreadId(id)
    setActivePage('chat')
  }

  const handleSaveSettings = (settings) => {
    Object.entries(settings).forEach(([key, value]) => {
      storage.set(key, value)
    })
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        connectionStatus={connectionStatus}
      />
      <main className="flex-1 overflow-hidden">
        {activePage === 'chat' && (
          <ChatPage
            thread={threads.find(t => t.id === activeThreadId)}
            onUpdateThread={(updated) => {
              setThreads(threads.map(t => t.id === updated.id ? updated : t))
            }}
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
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
          />
        )}
        {activePage === 'skills' && <SkillsPage />}
        {activePage === 'automations' && <AutomationsPage />}
        {activePage === 'settings' && <SettingsPage onSave={handleSaveSettings} />}
      </main>
    </div>
  )
}
