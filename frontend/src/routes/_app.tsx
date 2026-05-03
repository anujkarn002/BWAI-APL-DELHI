import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/auth-store'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    const token = useAuthStore.getState().token
    if (!token) {
      throw new Error('Not authenticated')
    }
  },
  errorComponent: () => {
    const navigate = useNavigate()
    navigate({ to: '/login' })
    return null
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
        <Link to="/home" className="flex flex-col items-center gap-0.5 text-xs [&.active]:text-primary text-muted-foreground">
          <span className="text-lg">🏠</span>
          Home
        </Link>
        <Link to="/review" className="flex flex-col items-center gap-0.5 text-xs [&.active]:text-primary text-muted-foreground">
          <span className="text-lg">✍️</span>
          Review
        </Link>
        <Link to="/leaderboard" className="flex flex-col items-center gap-0.5 text-xs [&.active]:text-primary text-muted-foreground">
          <span className="text-lg">🏆</span>
          Board
        </Link>
      </nav>
    </div>
  )
}
