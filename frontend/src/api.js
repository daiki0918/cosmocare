const configuredApiUrl = import.meta.env.VITE_API_URL
const productionApiUrl = 'https://cosmocare-backend.onrender.com'
const defaultApiUrl = window.location.hostname.endsWith('.vercel.app')
  ? productionApiUrl
  : `http://${window.location.hostname}:5000`
const API_URL = (configuredApiUrl || defaultApiUrl).replace(/\/+$/, '')
export { API_URL }

function clearStoredSession() {
  for (const key of ['admin-session', 'staff-session', 'chapel-session', 'cosmocare-token', 'cosmocare-user']) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  }
}

function redirectToLogin() {
  const path = window.location.pathname
  window.location.assign(path.startsWith('/admin') || path === '/login' ? '/admin/login' : path.startsWith('/staff') ? '/staff/login' : '/')
}

export async function api(path, options = {}) {
  const token = localStorage.getItem('cosmocare-token')
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to connect to the CosmoCare server. Make sure the backend is running and the API URL is configured correctly.', { cause: error })
    }
    throw error
  }
  const body = response.status === 204 ? null : await response.json()
  if (response.status === 401 && token && path !== '/api/auth/login') {
    clearStoredSession()
    redirectToLogin()
  }
  if (!response.ok) throw new Error(body?.message || 'The server could not complete the request.')
  return body
}

export async function login(email, password) {
  const result = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem('cosmocare-token', result.token)
  localStorage.setItem('cosmocare-user', JSON.stringify(result.user))
  return result.user
}
