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
  const logout = useAuthStore((s) => s.logout)
  const { data: foods } = useQuery({
    queryKey: ['foods'],
    queryFn: () => api.get<Food[]>('/api/foods'),
  })

  const topFoods = foods?.sort((a, b) => b.ratingAvg - a.ratingAvg).slice(0, 5) ?? []

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🏟️ StadiumBite</h1>
          <p className="text-sm text-muted-foreground">{phone}</p>
        </div>
        <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground">
          Logout
        </button>
      </div>

      <Link
        to="/review"
        className="block w-full bg-primary text-primary-foreground text-center py-4 rounded-xl text-lg font-semibold mb-6 hover:opacity-90"
      >
        ✍️ Rate Your Food
      </Link>

      <h2 className="text-lg font-semibold mb-3">🔥 Trending Now</h2>
      {topFoods.length === 0 ? (
        <p className="text-muted-foreground text-sm">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-2">
          {topFoods.map((food, i) => (
            <div key={food.id} className="bg-card rounded-lg p-3 flex items-center gap-3">
              <span className="text-xl font-bold text-primary">#{i + 1}</span>
              <div className="flex-1">
                <p className="font-medium">{food.name}</p>
                <p className="text-xs text-muted-foreground">{food.stallName} · {food.reviewCount} reviews</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{food.ratingAvg.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">★</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link
        to="/leaderboard"
        className="block text-center text-primary text-sm mt-4 hover:underline"
      >
        View Full Leaderboard →
      </Link>
    </div>
  )
}
