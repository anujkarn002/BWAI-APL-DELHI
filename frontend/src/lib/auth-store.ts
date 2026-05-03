import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  phone: string | null
  userId: string | null
  tokenExp: number | null
  setAuth: (token: string, phone: string, userId: string) => void
  logout: () => void
  isTokenValid: () => boolean
}

function parseJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null // convert to ms
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      phone: null,
      userId: null,
      tokenExp: null,
      setAuth: (token, phone, userId) => {
        const exp = parseJwtExp(token)
        set({ token, phone, userId, tokenExp: exp })
      },
      logout: () => {
        set({ token: null, phone: null, userId: null, tokenExp: null })
      },
      isTokenValid: () => {
        const { token, tokenExp } = get()
        if (!token) return false
        if (tokenExp && Date.now() > tokenExp) {
          // Token expired — auto clear
          get().logout()
          return false
        }
        return true
      },
    }),
    { name: 'stadiumbite-auth' }
  )
)
