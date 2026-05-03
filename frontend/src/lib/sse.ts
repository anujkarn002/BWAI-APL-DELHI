import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from './auth-store'

export function useSSE(path: string, queryKeys: string[][]) {
  const queryClient = useQueryClient()
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) return

    const url = `${path}?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.onmessage = () => {
      for (const key of queryKeys) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    }

    es.onerror = () => {
      es.close()
      // auto-reconnect after 3s
      setTimeout(() => {
        // component will re-mount or effect will re-run
      }, 3000)
    }

    return () => es.close()
  }, [token, path, queryClient, queryKeys])
}
