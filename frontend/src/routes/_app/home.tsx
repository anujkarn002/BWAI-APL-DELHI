import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

export const Route = createFileRoute('/_app/home')({
  component: Home,
})

interface Food {
  id: string
  name: string
  category: string
  ratingAvg: number
  reviewCount: number
  stallName: string
}

function Home() {
  const phone = useAuthStore((s) => s.phone)
  const { data: foods } = useQuery({
    queryKey: ['foods'],
    queryFn: () => api.get<Food[]>('/api/foods'),
  })

  const topFoods = [...(foods ?? [])].sort((a, b) => b.ratingAvg - a.ratingAvg).slice(0, 5)

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-black">Welcome back!</h2>
        <p className="text-sm font-mono text-muted-foreground">{phone}</p>
      </div>

      {/* CTA */}
      <Link
        to="/review"
        className="block w-full bg-primary text-primary-foreground border-3 border-border text-center py-5 text-xl font-black uppercase tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all mb-6"
      >
        Rate Your Food &rarr;
      </Link>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          to="/feed"
          className="border-3 border-border bg-accent text-accent-foreground p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <span className="text-2xl block mb-1">{'\u25A3'}</span>
          <span className="font-bold text-sm uppercase">Photo Feed</span>
        </Link>
        <Link
          to="/leaderboard"
          className="border-3 border-border bg-secondary text-secondary-foreground p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <span className="text-2xl block mb-1">{'\u2605'}</span>
          <span className="font-bold text-sm uppercase">Leaderboard</span>
        </Link>
      </div>

      {/* Trending */}
      <div className="border-3 border-border bg-card shadow-md">
        <div className="border-b-2 border-border bg-muted px-4 py-2">
          <h3 className="font-black uppercase text-sm tracking-wide">Trending Now</h3>
        </div>
        {topFoods.length === 0 ? (
          <p className="p-4 text-muted-foreground text-sm">No reviews yet. Be the first!</p>
        ) : (
          <div className="divide-y-2 divide-border">
            {topFoods.map((food, i) => (
              <div key={food.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                <div className={`w-8 h-8 border-2 border-border flex items-center justify-center font-mono font-bold text-sm ${
                  i === 0 ? 'bg-primary text-primary-foreground' : i === 1 ? 'bg-secondary text-secondary-foreground' : 'bg-muted'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{food.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{food.stallName} &middot; {food.reviewCount} reviews</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-lg">{food.ratingAvg.toFixed(1)}</span>
                  <span className="text-primary ml-0.5">{'\u2605'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
