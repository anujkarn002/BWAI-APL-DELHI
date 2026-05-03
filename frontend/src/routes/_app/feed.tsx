import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState, useRef, useEffect } from 'react'

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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={`text-sm ${s <= rating ? 'text-primary' : 'text-muted-foreground/30'}`}
        >
          {'\u2605'}
        </span>
      ))}
    </div>
  )
}

type Tab = 'all' | 'photos' | 'text'

function FeedCard({ item, index }: { item: FeedItem; index: number }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <article
      ref={cardRef}
      className="border-3 border-border bg-card shadow-md overflow-hidden transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transitionDelay: `${Math.min(index * 80, 400)}ms`,
      }}
    >
      {/* Photo with aspect ratio */}
      {item.photoBase64 && (
        <div className="border-b-3 border-border relative bg-muted">
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-3 border-border border-t-primary animate-spin" />
            </div>
          )}
          <img
            src={item.photoBase64}
            alt="Food photo"
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={`w-full max-h-80 object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
          {/* Overlay rating badge */}
          <div className="absolute top-3 right-3 bg-card/90 border-2 border-border px-2 py-1 shadow-md backdrop-blur-sm">
            <span className="font-mono font-bold text-sm">{item.overallRating}</span>
            <span className="text-primary ml-0.5">{'\u2605'}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-accent text-accent-foreground border-2 border-border flex items-center justify-center font-mono font-bold text-xs shadow-sm">
              {item.userId.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-bold block leading-tight">{item.userId}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{timeAgo(item.createdAt)}</span>
            </div>
          </div>
          {!item.photoBase64 && (
            <div className="flex items-center gap-1.5">
              <StarRating rating={item.overallRating} />
              <span className="font-mono font-bold text-sm">{item.overallRating}/5</span>
            </div>
          )}
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

        {/* Per-item ratings — compact bar style */}
        {Object.keys(item.itemRatings).length > 0 && (
          <div className="space-y-1 mb-3">
            {Object.entries(item.itemRatings).map(([foodId, rating]) => {
              const foodName = item.foodNames[Object.keys(item.itemRatings).indexOf(foodId)] || foodId
              return (
                <div key={foodId} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground w-24 truncate">{foodName}</span>
                  <div className="flex-1 h-2 bg-muted border border-border">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(rating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold w-4 text-right">{rating}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Photo cards: show stars below tags */}
        {item.photoBase64 && (
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={item.overallRating} />
            <span className="font-mono font-bold text-sm">{item.overallRating}/5</span>
          </div>
        )}

        {/* Feedback */}
        {item.feedback && (
          <div className="border-l-4 border-primary bg-muted/50 px-3 py-2 mt-2">
            <p className="text-sm italic leading-relaxed">&ldquo;{item.feedback}&rdquo;</p>
          </div>
        )}
      </div>
    </article>
  )
}

function Feed() {
  const [tab, setTab] = useState<Tab>('all')
  const { data: feed = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get<FeedItem[]>('/api/feed'),
    refetchInterval: 30_000,
  })

  const filtered = feed.filter((item) => {
    if (tab === 'photos') return item.hasPhoto
    if (tab === 'text') return !item.hasPhoto
    return true
  })

  const photoCount = feed.filter((i) => i.hasPhoto).length
  const textCount = feed.filter((i) => !i.hasPhoto).length

  if (isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-3 border-border bg-muted animate-pulse shadow-md">
              <div className="h-48 bg-muted-foreground/10" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted-foreground/10 w-1/3" />
                <div className="h-3 bg-muted-foreground/10 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-black uppercase">Food Feed</h1>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className={`border-2 border-border px-3 py-1 text-xs font-bold uppercase transition-colors ${
            isRefetching ? 'bg-muted text-muted-foreground' : 'hover:bg-primary hover:text-primary-foreground'
          }`}
        >
          {isRefetching ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-3 border-border mb-4 shadow-sm">
        {([
          ['all', `All (${feed.length})`],
          ['photos', `Photos (${photoCount})`],
          ['text', `Text (${textCount})`],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide border-r-2 last:border-r-0 border-border transition-colors ${
              tab === key
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Feed count */}
      <p className="text-xs font-mono text-muted-foreground mb-4">
        {filtered.length} post{filtered.length !== 1 ? 's' : ''} {tab !== 'all' ? `with ${tab}` : 'total'}
      </p>

      {filtered.length === 0 ? (
        <div className="border-3 border-border bg-muted p-8 text-center shadow-md">
          <p className="font-bold uppercase text-lg mb-1">No posts yet!</p>
          <p className="text-sm text-muted-foreground">
            {tab === 'photos'
              ? 'Submit a review with a photo to see it here'
              : tab === 'text'
              ? 'No text-only reviews yet'
              : 'Submit a review to start the feed'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item, i) => (
            <FeedCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
