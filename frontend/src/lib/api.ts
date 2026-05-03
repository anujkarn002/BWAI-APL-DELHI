import { useAuthStore } from './auth-store'

const BASE = ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const store = useAuthStore.getState()

  // Check token validity before making request
  if (!store.isTokenValid() && !path.startsWith('/api/auth/')) {
    store.logout()
    window.location.href = '/login'
    throw new ApiError(401, 'Token expired')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  }
  if (store.token) headers['Authorization'] = `Bearer ${store.token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    // Server rejected token — auto logout
    store.logout()
    window.location.href = '/login'
    throw new ApiError(401, 'Session expired. Please login again.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, body.detail || res.statusText)
  }
  return res.json()
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
}
