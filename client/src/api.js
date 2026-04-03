const apiFetch = async (path, options = {}) => {
  const res = await fetch(path, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const getHealth = () => apiFetch('/health')

export const getRepos = () => apiFetch('/api/repos')

export const createRepo = (data) =>
  apiFetch('/api/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

export const deleteRepo = (id) =>
  apiFetch(`/api/repos/${id}`, { method: 'DELETE' })

export const getVideos = ({ page = 1, limit = 20, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit, ...(search ? { search } : {}) })
  return apiFetch(`/api/videos?${params}`)
}

export const uploadFiles = async (formData, onProgress) => {
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const data = JSON.parse(line)
        if (data.type === 'progress' && onProgress) {
          onProgress(data)
        }
        if (data.type === 'done') {
          result = data
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  if (!result) throw new Error('Không nhận được kết quả từ server')
  return result
}
