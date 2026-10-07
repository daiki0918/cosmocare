const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`
export { API_URL }

export async function api(path, options = {}) {
  const token = sessionStorage.getItem('cosmocare-token')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(body?.message || 'The server could not complete the request.')
  return body
}

export async function login(email, password) {
  const result = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  sessionStorage.setItem('cosmocare-token', result.token)
  sessionStorage.setItem('cosmocare-user', JSON.stringify(result.user))
  return result.user
}
