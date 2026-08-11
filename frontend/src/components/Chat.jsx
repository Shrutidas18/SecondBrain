import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, FileText, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { sendChat } from '../hooks/useApi'

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  messages: { flex: 1, overflow: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  emptyState: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '16px',
    color: 'var(--text-muted)', textAlign: 'center', padding: '40px'
  },
  emptyTitle: { fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' },
  emptyHints: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' },
  hint: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px 16px', fontSize: '13px',
    color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s',
    textAlign: 'left'
  },
  msgRow: { display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '800px', width: '100%', margin: '0 auto' },
  avatar: {
    width: '28px', height: '28px', borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: '2px'
  },
  bubble: { flex: 1, fontSize: '14px', lineHeight: '1.65', color: 'var(--text)' },
  sources: { marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' },
  sourceTag: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '4px', padding: '3px 8px', fontSize: '11px', color: 'var(--text-muted)'
  },
  inputArea: {
    padding: '16px 20px', borderTop: '1px solid var(--border)',
    background: 'var(--surface)'
  },
  inputWrap: {
    display: 'flex', gap: '10px', alignItems: 'flex-end',
    maxWidth: '800px', margin: '0 auto',
    background: 'var(--surface2)', borderRadius: '10px',
    border: '1px solid var(--border)', padding: '10px 14px'
  },
  textarea: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: 'var(--text)', fontSize: '14px', lineHeight: '1.5',
    resize: 'none', maxHeight: '120px', minHeight: '20px'
  },
  sendBtn: {
    background: 'var(--accent)', border: 'none', borderRadius: '6px',
    width: '32px', height: '32px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0, transition: 'opacity 0.15s'
  }
}

const HINTS = [
  '📄 Summarize my uploaded document',
  '🔍 What are the key points from my notes?',
  '💡 Find anything related to [topic] in my files',
  '📊 Compare the main ideas across my documents'
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={styles.msgRow}>
      <div style={{
        ...styles.avatar,
        background: isUser ? 'var(--surface2)' : 'var(--accent-dim)',
        color: isUser ? 'var(--text-muted)' : 'var(--accent)'
      }}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div style={styles.bubble}>
        {isUser
          ? <div>{msg.content}</div>
          : <ReactMarkdown>{msg.content}</ReactMarkdown>
        }
        {msg.sources?.length > 0 && (
          <div style={styles.sources}>
            {[...new Set(msg.sources.map(s => s.source))].map(src => (
              <div key={src} style={styles.sourceTag}>
                <FileText size={10} />
                {src}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Chat({ docCount, backendOnline }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()
  const textareaRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(query) {
    const q = (query || input).trim()
    if (!q || loading) return

    const userMsg = { role: 'user', content: q }
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const data = await sendChat(q, history)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${e.message}. Make sure the backend is running and you have documents uploaded.`
      }])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {isEmpty ? (
          <div style={styles.emptyState}>
            <Sparkles size={32} color="var(--accent)" />
            <div>
              <div style={styles.emptyTitle}>What would you like to know?</div>
              <div style={{ fontSize: '14px' }}>
                {backendOnline === false
                  ? 'Backend is offline. Start the server to continue.'
                  : docCount === 0
                    ? 'Upload documents in the sidebar to start chatting with your knowledge base.'
                    : `${docCount} document${docCount > 1 ? 's' : ''} ready. Ask me anything about them.`
                }
              </div>
            </div>
            {docCount > 0 && backendOnline !== false && (
              <div style={styles.emptyHints}>
                {HINTS.map(h => (
                  <div key={h} style={styles.hint} onClick={() => handleSend(h)}>
                    {h}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, i) => <Message key={i} msg={msg} />)
        )}

        {loading && (
          <div style={styles.msgRow}>
            <div style={{ ...styles.avatar, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              <Bot size={14} />
            </div>
            <div style={{ ...styles.bubble, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Searching your knowledge base...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <div style={styles.inputWrap}>
          <textarea
            ref={textareaRef}
            style={styles.textarea}
            placeholder={
              backendOnline === false
                ? 'Backend is offline...'
                : docCount === 0
                  ? 'Upload documents first...'
                  : 'Ask anything about your documents...'
            }
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKey}
            disabled={loading || docCount === 0 || backendOnline === false}
            rows={1}
          />
          <button
            style={{ ...styles.sendBtn, opacity: input.trim() && !loading ? 1 : 0.4 }}
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <Send size={14} color="white" />
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}