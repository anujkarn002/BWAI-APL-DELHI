import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'

export const Route = createFileRoute('/_app/leaderboard')({
  component: Leaderboard,
})

interface LeaderboardData {
  overall: { id: string; name: string; ratingAvg: number; reviewCount: number; stallName: string; category: string }[]
  byCategory: Record<string, { id: string; name: string; ratingAvg: number; reviewCount: number; stallName: string }[]>
}

const QUERY_KEYS = [['leaderboard']]

function Leaderboard() {
  useSSE('/sse/leaderboard', QUERY_KEYS)

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get<LeaderboardData>('/api/leaderboard'),
    refetchInterval: 15_000,
  })

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">Loading leaderboard...</div>

  const overall = data?.overall ?? []
  const byCategory = data?.byCategory ?? {}

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">🏆 Leaderboard</h1>

      {overall.length > 0 && (
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-5 mb-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">👑 #1 Overall</p>
          <p className="text-2xl font-bold">{overall[0].name}</p>
          <p className="text-4xl font-bold text-primary my-1">{overall[0].ratingAvg.toFixed(1)} ★</p>
          <p className="text-sm text-muted-foreground">{overall[0].stallName} · {overall[0].reviewCount} reviews</p>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Top Overall</h2>
      <div className="space-y-2 mb-6">
        {overall.map((food, i) => (
          <div key={food.id} className="bg-card rounded-lg p-3 flex items-center gap-3">
            <span className={`text-xl font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              #{i + 1}
            </span>
            <div className="flex-1">
              <p className="font-medium">{food.name}</p>
              <p className="text-xs text-muted-foreground">{food.stallName}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary">{food.ratingAvg.toFixed(1)} ★</p>
              <p className="text-xs text-muted-foreground">{food.reviewCount} reviews</p>
            </div>
          </div>
        ))}
      </div>

      {Object.entries(byCategory).map(([category, foods]) => (
        <div key={category} className="mb-6">
          <h2 className="text-lg font-semibold mb-2 capitalize">{category}</h2>
          <div className="space-y-2">
            {foods.map((food, i) => (
              <div key={food.id} className="bg-card rounded-lg p-3 flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{food.name}</p>
                </div>
                <p className="font-bold text-primary text-sm">{food.ratingAvg.toFixed(1)} ★</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {overall.length === 0 && <p className="text-muted-foreground text-center">No reviews yet!</p>}
    </div>
  )
}
