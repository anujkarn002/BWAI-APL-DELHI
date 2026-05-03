import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'

export const Route = createFileRoute('/_app/leaderboard')({
  component: Leaderboard,
})

interface LeaderboardFood {
  id: string
  name: string
  ratingAvg: number
  reviewCount: number
  stallName: string
  category: string
}

interface LeaderboardData {
  overall: LeaderboardFood[]
  byCategory: Record<string, LeaderboardFood[]>
}

const QUERY_KEYS = [['leaderboard']]

function Leaderboard() {
  useSSE('/sse/leaderboard', QUERY_KEYS)

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get<LeaderboardData>('/api/leaderboard'),
    refetchInterval: 15_000,
  })

  if (isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="border-3 border-border bg-muted p-8 text-center shadow-md animate-pulse">
          <p className="font-bold uppercase">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  const overall = data?.overall ?? []
  const byCategory = data?.byCategory ?? {}

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-3xl font-black uppercase mb-4">Leaderboard</h1>

      {/* Hero card for #1 */}
      {overall.length > 0 && (
        <div className="border-3 border-border bg-secondary text-secondary-foreground p-6 shadow-lg mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary text-primary-foreground border-2 border-border flex items-center justify-center font-mono font-bold">
              1
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">#1 Overall</span>
          </div>
          <h2 className="text-3xl font-black mb-1">{overall[0].name}</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black font-mono">{overall[0].ratingAvg.toFixed(1)}</span>
            <span className="text-2xl text-primary">{'\u2605'}</span>
          </div>
          <p className="text-sm font-mono mt-1">
            {overall[0].stallName} &middot; {overall[0].reviewCount} reviews
          </p>
        </div>
      )}

      {/* Overall list */}
      <div className="border-3 border-border bg-card shadow-md mb-6">
        <div className="border-b-2 border-border bg-muted px-4 py-2">
          <h3 className="font-black uppercase text-sm tracking-wide">Top Overall</h3>
        </div>
        <div className="divide-y-2 divide-border">
          {overall.map((food, i) => (
            <div key={food.id} className="px-4 py-3 flex items-center gap-3">
              <div className={`w-8 h-8 border-2 border-border flex items-center justify-center font-mono font-bold text-sm ${
                i === 0 ? 'bg-primary text-primary-foreground' :
                i === 1 ? 'bg-secondary text-secondary-foreground' :
                i === 2 ? 'bg-accent text-accent-foreground' : 'bg-muted'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{food.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{food.stallName}</p>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold">{food.ratingAvg.toFixed(1)}</span>
                <span className="text-primary ml-0.5">{'\u2605'}</span>
                <p className="text-[10px] text-muted-foreground">{food.reviewCount} rev</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By category */}
      {Object.entries(byCategory).map(([category, foods]) => (
        <div key={category} className="border-3 border-border bg-card shadow-md mb-4">
          <div className="border-b-2 border-border bg-muted px-4 py-2">
            <h3 className="font-black uppercase text-sm tracking-wide">{category}</h3>
          </div>
          <div className="divide-y-2 divide-border">
            {foods.map((food, i) => (
              <div key={food.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="font-mono font-bold text-muted-foreground text-sm w-5">{i + 1}</span>
                <span className="flex-1 font-bold text-sm truncate">{food.name}</span>
                <span className="font-mono font-bold">{food.ratingAvg.toFixed(1)}<span className="text-primary">{'\u2605'}</span></span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {overall.length === 0 && (
        <div className="border-3 border-border bg-muted p-8 text-center shadow-md">
          <p className="font-bold uppercase">No reviews yet!</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first to rate</p>
        </div>
      )}
    </div>
  )
}
