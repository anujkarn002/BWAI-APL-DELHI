import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const Route = createFileRoute('/_app/feed')({
  component: Feed,
})

interface FeedItem {
  id: string
  userId: string
  photoBase64: string | null
  foodNames: string[]
  itemRatings: Record<string, number>
  overallRating: number
  feedback: string | null
  createdAt: string | null
  hasPhoto: boolean
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function Feed() {
  const { data: feed = [], isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get<FeedItem[]>('/api/feed'),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="border-3 border-border bg-muted p-8 text-center shadow-md animate-pulse">
          <p className="font-bold uppercase">Loading feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-3xl font-black uppercase mb-4">Food Feed</h1>

      {feed.length === 0 ? (
        <div className="border-3 border-border bg-muted p-8 text-center shadow-md">
          <p className="font-bold uppercase">No posts yet!</p>
          <p className="text-sm text-muted-foreground mt-1">Submit a review with a photo to see it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((item) => (
            <article
              key={item.id}
              className="border-3 border-border bg-card shadow-md overflow-hidden"
            >
              {/* Photo */}
              {item.photoBase64 && (
                <div className="border-b-3 border-border">
                  <img
                    src={item.photoBase64}
                    alt="Food photo"
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-accent text-accent-foreground border-2 border-border flex items-center justify-center font-mono font-bold text-xs">
                      {item.userId.slice(0, 2)}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{item.userId}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{timeAgo(item.createdAt)}</span>
                </div>

                {/* Food tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.foodNames.map((name) => (
                    <span
                      key={name}
                      className="bg-secondary text-secondary-foreground border-2 border-border px-2 py-0.5 text-xs font-bold shadow-sm"
                    >
                      {name}
                    </span>
                  ))}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={`text-sm ${s <= item.overallRating ? 'text-primary' : 'text-muted'}`}
                      >
                        {'\u2605'}
                      </span>
                    ))}
                  </div>
                  <span className="font-mono font-bold text-sm">{item.overallRating}/5</span>
                </div>

                {/* Per-item ratings */}
                {Object.keys(item.itemRatings).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(item.itemRatings).map(([foodId, rating]) => {
                      const foodName = item.foodNames[Object.keys(item.itemRatings).indexOf(foodId)] || foodId
                      return (
                        <span key={foodId} className="text-xs font-mono text-muted-foreground">
                          {foodName}: <span className="font-bold text-foreground">{rating}{'\u2605'}</span>
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Feedback */}
                {item.feedback && (
                  <div className="border-2 border-border bg-muted p-3 mt-2">
                    <p className="text-sm italic">&ldquo;{item.feedback}&rdquo;</p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
