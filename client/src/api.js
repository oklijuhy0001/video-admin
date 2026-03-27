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

export const getVideos = ({ page = 1, limit = 20, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit, ...(search ? { search } : {}) })
  return apiFetch(`/api/videos?${params}`)
}

export const uploadFiles = (formData) =>
  apiFetch('/api/upload', { method: 'POST', body: formData })
