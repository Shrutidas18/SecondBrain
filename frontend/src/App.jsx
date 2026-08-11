import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import { checkHealth } from './hooks/useApi'

export default function App() {
  const [docCount, setDocCount] = useState(0)
  const [backendOnline, setBackendOnline] = useState(null) // null = checking

  useEffect(() => {
    let cancelled = false

    async function poll() {
      const ok = await checkHealth()
      if (!cancelled) setBackendOnline(ok)
    }

    poll()
    const interval = setInterval(poll, 8000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {backendOnline === false && (
        <div style={{
          background: '#3a1414',
          color: '#ff8080',
          padding: '10px 16px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 500,
          borderBottom: '1px solid #5a1f1f'
        }}>
          ⚠️ Backend is offline. If nothing works, start it with{' '}
          <code style={{ background: '#000', padding: '2px 6px', borderRadius: '4px' }}>
            uvicorn main:app --reload
          </code>{' '}
          in the <code style={{ background: '#000', padding: '2px 6px', borderRadius: '4px' }}>backend</code> folder.
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar onDocsChange={setDocCount} />
        <Chat docCount={docCount} backendOnline={backendOnline} />
      </div>
    </div>
  )
}