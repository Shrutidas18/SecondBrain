import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Trash2, Brain, ChevronRight, Loader2 } from 'lucide-react'
import { uploadFile, getDocuments, deleteDocument } from '../hooks/useApi'

const styles = {
  sidebar: {
    width: '260px', minWidth: '260px',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    height: '100vh', overflow: 'hidden'
  },
  header: {
    padding: '20px 16px 16px',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', gap: '10px'
  },
  logo: { color: 'var(--accent)', display: 'flex', alignItems: 'center' },
  title: { fontSize: '15px', fontWeight: 600, color: 'var(--text)' },
  subtitle: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' },
  uploadArea: {
    margin: '12px', border: '1px dashed var(--border)',
    borderRadius: '8px', padding: '14px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '6px', cursor: 'pointer', transition: 'all 0.2s',
    background: 'transparent'
  },
  uploadText: { fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' },
  docsSection: { flex: 1, overflow: 'auto', padding: '0 8px 8px' },
  sectionLabel: {
    fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '12px 8px 6px'
  },
  docItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 10px', borderRadius: '6px',
    cursor: 'default', transition: 'background 0.15s'
  },
  docName: { fontSize: '12px', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  deleteBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    padding: '2px', display: 'flex', opacity: 0, transition: 'opacity 0.15s',
    borderRadius: '3px'
  },
  badge: {
    fontSize: '10px', background: 'var(--accent-dim)', color: 'var(--accent)',
    padding: '1px 6px', borderRadius: '10px', whiteSpace: 'nowrap'
  }
}

export default function Sidebar({ onDocsChange }) {
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [hoveredDoc, setHoveredDoc] = useState(null)
  const fileRef = useRef()

  async function loadDocs() {
    try {
      const data = await getDocuments()
      setDocs(data.documents)
      onDocsChange?.(data.documents.length)
    } catch {}
  }

  useEffect(() => { loadDocs() }, [])

  async function handleFiles(files) {
    const allowed = ['pdf', 'txt', 'md', 'docx']
    for (const file of files) {
      const ext = file.name.toLowerCase().split('.').pop()
      if (!allowed.includes(ext)) continue
      setUploading(true)
      try {
        await uploadFile(file)
        await loadDocs()
      } catch (e) {
        alert(e.message)
      } finally {
        setUploading(false)
      }
    }
  }

  async function handleDelete(filename) {
    if (!confirm(`Remove "${filename}" from your knowledge base?`)) return
    try {
      await deleteDocument(filename)
      await loadDocs()
    } catch (e) { alert(e.message) }
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <div style={styles.logo}><Brain size={20} /></div>
        <div>
          <div style={styles.title}>Second Brain</div>
          <div style={styles.subtitle}>AI Knowledge Assistant</div>
        </div>
      </div>

      {/* Upload area */}
      <div
        style={{
          ...styles.uploadArea,
          borderColor: dragOver ? 'var(--accent)' : 'var(--border)',
          background: dragOver ? 'var(--accent-dim)' : 'transparent'
        }}
        onClick={() => fileRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false)
          handleFiles([...e.dataTransfer.files])
        }}
      >
        <input
          ref={fileRef} type="file" multiple accept=".pdf,.txt,.md,.docx"
          style={{ display: 'none' }}
          onChange={e => handleFiles([...e.target.files])}
        />
        {uploading
          ? <Loader2 size={18} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
          : <Upload size={18} color="var(--text-muted)" />
        }
        <div style={styles.uploadText}>
          {uploading ? 'Processing...' : 'Drop files or click to upload'}
        </div>
        <div style={{ ...styles.uploadText, fontSize: '10px' }}>PDF · TXT · MD · DOCX</div>
      </div>

      {/* Document list */}
      <div style={styles.docsSection}>
        {docs.length > 0 && (
          <div style={styles.sectionLabel}>Knowledge Base · {docs.length} docs</div>
        )}
        {docs.length === 0 && (
          <div style={{ ...styles.uploadText, padding: '16px 8px', textAlign: 'center' }}>
            Upload your first document to get started
          </div>
        )}
        {docs.map(doc => (
          <div
            key={doc.source}
            style={{
              ...styles.docItem,
              background: hoveredDoc === doc.source ? 'var(--surface2)' : 'transparent'
            }}
            onMouseEnter={() => setHoveredDoc(doc.source)}
            onMouseLeave={() => setHoveredDoc(null)}
          >
            <FileText size={13} color="var(--accent)" style={{ flexShrink: 0 }} />
            <span style={styles.docName} title={doc.source}>{doc.source}</span>
            <span style={styles.badge}>{doc.type}</span>
            <button
              style={{
                ...styles.deleteBtn,
                opacity: hoveredDoc === doc.source ? 1 : 0
              }}
              onClick={() => handleDelete(doc.source)}
              title="Remove document"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
