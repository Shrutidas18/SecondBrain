
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Shared API request wrapper
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, options)

  let data = null

  try {
    data = await res.json()
  } catch {
    // Response may not contain valid JSON
  }

  if (!res.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `Request failed (${res.status})`

    throw new Error(message)
  }

  return data
}

// Check backend health
export async function checkHealth() {
  try {
    const data = await apiFetch('/', {
      signal: AbortSignal.timeout(3000)
    })

    return data?.status === 'ok'
  } catch {
    return false
  }
}

// Upload a document
export async function uploadFile(file, onProgress) {
  const form = new FormData()
  form.append('file', file)

  return apiFetch('/upload', {
    method: 'POST',
    body: form
  })
}

// Send chat message
export async function sendChat(query, history = []) {
  return apiFetch('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      history,
      n_results: 5
    })
  })
}

// Fetch all documents
export async function getDocuments() {
  return apiFetch('/documents')
}

// Delete a document
export async function deleteDocument(filename) {
  return apiFetch(
    `/documents/${encodeURIComponent(filename)}`,
    {
      method: 'DELETE'
    }
  )
}

// Fetch statistics
export async function getStats() {
  return apiFetch('/stats')
}