let accessToken = ''
let onUnauthorized = () => {}

export function setAccessToken(token) {
  accessToken = token || ''
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

async function refreshSession() {
  const response = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) return null
  accessToken = body.data.accessToken
  return body.data
}

export async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (response.status === 401 && !options.retried && !path.startsWith('/auth/')) {
    const session = await refreshSession()
    if (session) return api(path, { ...options, retried: true })
    onUnauthorized()
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.error?.message || 'Request failed')
    error.code = body.error?.code
    error.status = response.status
    throw error
  }
  return body.data
}

export async function restoreSession() {
  return refreshSession()
}
