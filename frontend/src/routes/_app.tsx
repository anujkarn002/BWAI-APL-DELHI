import { createFileRoute, Outlet, Link, useNavigate, useMatches } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/auth-store'
import { useAppSettings } from '@/lib/settings-store'
import { useEffect } from 'react'
import { Home, PenLine, LayoutGrid, Trophy, LogOut, ClipboardList, Settings } from 'lucide-react'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    const store = useAuthStore.getState()
    if (!store.isTokenValid()) {
      store.logout()
      throw new Error('Not authenticated')
    }
  },
  errorComponent: RedirectToLogin,
  component: AppLayout,
})

function RedirectToLogin() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate({ to: '/login' })
  }, [navigate])
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="border-3 border-border bg-card p-6 shadow-lg text-center">
        <p className="font-bold">Redirecting to login...</p>
      </div>
    </div>
  )
}

const NAV_ITEMS = [
  { to: '/home' as const, label: 'Home', Icon: Home },
  { to: '/review' as const, label: 'Rate', Icon: PenLine },
  { to: '/my-reviews' as const, label: 'Mine', Icon: ClipboardList },
  { to: '/feed' as const, label: 'Feed', Icon: LayoutGrid },
  { to: '/leaderboard' as const, label: 'Board', Icon: Trophy },
  { to: '/settings' as const, label: 'More', Icon: Settings },
]

function AppLayout() {
  const matches = useMatches()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const isValid = useAuthStore((s) => s.isTokenValid)
  const currentPath = matches[matches.length - 1]?.pathname || ''
  const viewMode = useAppSettings((s) => s.viewMode)

  // Determine if mobile shell should be active
  const isMobileShell =
    viewMode === 'mobile' || (viewMode === 'auto' && typeof window !== 'undefined' && window.innerWidth >= 481)

  // Toggle body background for mobile shell
  useEffect(() => {
    if (isMobileShell) {
      document.body.classList.add('mobile-shell-bg')
    } else {
      document.body.classList.remove('mobile-shell-bg')
    }
    return () => document.body.classList.remove('mobile-shell-bg')
  }, [isMobileShell])

  // Periodic token validity check
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isValid()) {
        logout()
        navigate({ to: '/login' })
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [isValid, logout, navigate])

  const handleLogout = () => {
    logout()
    navigate({ to: '/' })
  }

  return (
    <div className={`min-h-screen bg-background flex flex-col ${isMobileShell ? 'mobile-shell-active' : ''}`}>
      {/* Top bar */}
      <header className="border-b-3 border-border bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <Link to="/home" className="text-xl font-black tracking-tight">
          Stadium<span className="text-primary">Bite</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-secondary border-2 border-border px-2 py-0.5 shadow-sm">
            <span className="text-xs font-mono font-bold uppercase">Live</span>
          </div>
          <button
            onClick={handleLogout}
            className="border-2 border-border px-2 py-1 text-xs font-bold uppercase hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer flex items-center gap-1"
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav
        className={`fixed bottom-0 bg-card border-t-3 border-border flex z-50 ${
          isMobileShell
            ? 'left-1/2 -translate-x-1/2 w-full max-w-[430px]'
            : 'left-0 right-0'
        }`}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center py-3 gap-1 border-r-2 last:border-r-0 border-border transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <item.Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
