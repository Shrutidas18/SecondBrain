const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function checkHealth() {
  try {
    const res = await fetch(`${API}/`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return false
    const data = await res.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}

export async function uploadFile(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function sendChat(query, history = []) {
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history, n_results: 5 })
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Chat failed')
  }
  return res.json()
}

export async function getDocuments() {
  const res = await fetch(`${API}/documents`)
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}

export async function deleteDocument(filename) {
  const res = await fetch(`${API}/documents/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Delete failed')
  }
  return res.json()
}

export async function getStats() {
  const res = await fetch(`${API}/stats`)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}