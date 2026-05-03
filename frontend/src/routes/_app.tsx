import { createFileRoute, Outlet, Link, useNavigate, useMatches } from '@tanstack/react-router'
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

const NAV_ITEMS = [
  { to: '/home' as const, label: 'Home', icon: '\u2302' },
  { to: '/review' as const, label: 'Rate', icon: '\u270E' },
  { to: '/feed' as const, label: 'Feed', icon: '\u25A3' },
  { to: '/leaderboard' as const, label: 'Board', icon: '\u2605' },
]

function AppLayout() {
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.pathname || ''

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b-3 border-border bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <Link to="/home" className="text-xl font-black tracking-tight">
          Stadium<span className="text-primary">Bite</span>
        </Link>
        <div className="bg-secondary border-2 border-border px-2 py-0.5 shadow-sm">
          <span className="text-xs font-mono font-bold uppercase">Live</span>
        </div>
      </header>

      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-3 border-border flex z-50">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 border-r-2 last:border-r-0 border-border transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
