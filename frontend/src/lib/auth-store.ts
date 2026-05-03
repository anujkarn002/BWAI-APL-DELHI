import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  phone: string | null
  userId: string | null
  setAuth: (token: string, phone: string, userId: string) => void
  logout: () => void
  isLoggedIn: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      phone: null,
      userId: null,
      setAuth: (token, phone, userId) => set({ token, phone, userId }),
      logout: () => set({ token: null, phone: null, userId: null }),
      isLoggedIn: () => !!get().token,
    }),
    { name: 'stadiumbite-auth' }
  )
)
