import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/auth-store'

export const Route = createFileRoute('/')({
  component: Landing,
})

function Landing() {
  const isLoggedIn = useAuthStore((s) => !!s.token)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-primary mb-2">🏟️ StadiumBite</h1>
        <p className="text-xl text-muted-foreground">Rate stadium food. Live leaderboard. Real vibes.</p>
      </div>

      <div className="grid gap-4 max-w-sm w-full mb-12">
        <div className="flex items-center gap-3 bg-card rounded-lg p-4">
          <span className="text-2xl">📸</span>
          <div className="text-left">
            <p className="font-semibold">Snap or Pick</p>
            <p className="text-sm text-muted-foreground">Photo your food or choose from the catalog</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card rounded-lg p-4">
          <span className="text-2xl">⭐</span>
          <div className="text-left">
            <p className="font-semibold">Rate It</p>
            <p className="text-sm text-muted-foreground">Star rating per item + overall experience</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card rounded-lg p-4">
          <span className="text-2xl">🏆</span>
          <div className="text-left">
            <p className="font-semibold">Live Leaderboard</p>
            <p className="text-sm text-muted-foreground">See what's hot right now across all stalls</p>
          </div>
        </div>
      </div>

      <Link
        to={isLoggedIn ? '/home' : '/login'}
        className="bg-primary text-primary-foreground px-8 py-3 rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity"
      >
        {isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
      </Link>
    </div>
  )
}
