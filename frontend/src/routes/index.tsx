import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/auth-store'

export const Route = createFileRoute('/')({
  component: Landing,
})

function Landing() {
  const isLoggedIn = useAuthStore((s) => !!s.token)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="border-4 border-border bg-secondary px-6 py-3 shadow-lg mb-8 -rotate-2">
          <span className="text-sm font-mono font-bold uppercase tracking-wider">Live at the Stadium</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black text-center leading-none mb-4 tracking-tight">
          Stadium<span className="text-primary">Bite</span>
        </h1>

        <p className="text-xl md:text-2xl text-center max-w-md mb-12 font-medium">
          Rate the food. See what&apos;s hot. <br />
          <span className="text-primary font-bold">Real-time leaderboard.</span>
        </p>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full mb-12">
          {[
            { icon: '1', title: 'Snap or Pick', desc: 'Photo your food or choose from catalog' },
            { icon: '2', title: 'Rate It', desc: 'Star rating per item + overall vibes' },
            { icon: '3', title: 'Live Board', desc: 'See rankings update across all devices' },
          ].map((step) => (
            <div
              key={step.icon}
              className="border-3 border-border bg-card p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-default"
            >
              <div className="w-10 h-10 bg-primary text-primary-foreground border-2 border-border flex items-center justify-center font-mono font-bold text-lg mb-3 shadow-sm">
                {step.icon}
              </div>
              <h3 className="font-bold text-lg mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>

        <Link
          to={isLoggedIn ? '/home' : '/login'}
          className="bg-primary text-primary-foreground border-3 border-border px-10 py-4 text-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all uppercase tracking-wide"
        >
          {isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t-3 border-border bg-muted px-6 py-4 text-center">
        <p className="text-sm font-mono text-muted-foreground">
          Built for <span className="font-bold text-foreground">Build With AI :: Agentic Premier League</span> &mdash; Delhi 2026
        </p>
      </footer>
    </div>
  )
}
