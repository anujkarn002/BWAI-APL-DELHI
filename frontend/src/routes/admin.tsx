import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

// ── Types ──────────────────────────────────────────────────────────────

interface Review {
  id: string
  userId: string
  foodIds: string[]
  itemRatings: Record<string, number>
  overallRating: number
  feedback: string | null
  hasPhoto: boolean
  createdAt: string
  moderation: { status: string; reason: string | null; checkedAt: string | null } | null
  classification: {
    identified_food: string
    confidence: number
    is_food: boolean
    description: string
  } | null
}

interface FoodItem {
  id: string
  name: string
  slug: string
  category: string
  stallName: string
  description: string
  isActive: boolean
  reviewCount: number
  ratingAvg: number
}

interface Stats {
  totalReviews: number
  avgRating: number
  moderationCounts: Record<string, number>
  totalFoods: number
  totalUsers: number
  reviewsPerHour: { hour: string; count: number }[]
}

// ── Admin API helper ───────────────────────────────────────────────────

function adminFetch<T>(path: string, key: string, init?: RequestInit): Promise<T> {
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': key,
      ...(init?.headers as Record<string, string>),
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(body.detail || res.statusText)
    }
    return res.json()
  })
}

// ── Main Component ─────────────────────────────────────────────────────

type Tab = 'reviews' | 'foods' | 'stats'

function AdminPage() {
  const [adminKey, setAdminKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState<Tab>('stats')

  const handleLogin = async () => {
    setAuthError('')
    try {
      await adminFetch('/api/admin/stats', adminKey)
      setAuthed(true)
    } catch {
      setAuthError('Invalid admin key')
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="border-3 border-border bg-card shadow-[4px_4px_0_0_#000] p-8 w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-black uppercase">Admin Login</h1>
          <p className="text-sm text-muted-foreground font-mono">StadiumBite Control Panel</p>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Enter admin key"
            className="w-full border-3 border-border bg-background px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary"
          />
          {authError && (
            <p className="text-sm font-bold text-[#ff3333]">{authError}</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full bg-primary text-primary-foreground border-3 border-border py-3 font-black uppercase shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Enter
          </button>
        </div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stats', label: 'Stats' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'foods', label: 'Foods' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-3 border-border bg-card px-4 py-3 flex items-center justify-between shadow-[0_4px_0_0_#000]">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black uppercase">StadiumBite</h1>
          <span className="bg-[#ff3333] text-white text-xs font-black uppercase px-2 py-0.5 border-2 border-border">
            Admin
          </span>
        </div>
        <button
          onClick={() => { setAuthed(false); setAdminKey('') }}
          className="text-xs font-bold uppercase border-2 border-border px-3 py-1 hover:bg-muted transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Tab bar */}
      <div className="flex border-b-3 border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-black uppercase border-r-2 last:border-r-0 border-border transition-colors ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-w-5xl mx-auto">
        {tab === 'stats' && <StatsPanel adminKey={adminKey} />}
        {tab === 'reviews' && <ReviewsPanel adminKey={adminKey} />}
        {tab === 'foods' && <FoodsPanel adminKey={adminKey} />}
      </div>
    </div>
  )
}

// ── Stats Panel ────────────────────────────────────────────────────────

function StatsPanel({ adminKey }: { adminKey: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch<Stats>('/api/admin/stats', adminKey)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [adminKey])

  if (loading) return <Loading />
  if (!stats) return <p className="font-bold">Failed to load stats</p>

  const maxCount = Math.max(1, ...stats.reviewsPerHour.map((h) => h.count))

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Reviews" value={stats.totalReviews} />
        <StatCard label="Avg Rating" value={stats.avgRating.toFixed(1)} />
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Total Foods" value={stats.totalFoods} />
      </div>

      {/* Moderation breakdown */}
      <div className="border-3 border-border bg-card p-4 shadow-[4px_4px_0_0_#000]">
        <h3 className="font-black uppercase text-sm mb-3">Moderation Breakdown</h3>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(stats.moderationCounts).map(([status, count]) => (
            <div key={status} className={`px-3 py-2 border-2 border-border font-mono text-sm ${
              status === 'flagged' ? 'bg-[#ff3333] text-white' :
              status === 'approved' ? 'bg-green-100 dark:bg-green-950' :
              status === 'hidden' ? 'bg-gray-200 dark:bg-gray-800' :
              'bg-[#ffff00]'
            }`}>
              <span className="font-black">{count}</span> {status}
            </div>
          ))}
        </div>
      </div>

      {/* Reviews per hour chart */}
      <div className="border-3 border-border bg-card p-4 shadow-[4px_4px_0_0_#000]">
        <h3 className="font-black uppercase text-sm mb-3">Reviews / Hour (24h)</h3>
        <div className="flex items-end gap-[2px] h-32">
          {stats.reviewsPerHour.map((h) => (
            <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                className="w-full bg-[#0066ff] border border-border min-h-[2px]"
                style={{ height: `${(h.count / maxCount) * 100}%` }}
                title={`${h.hour}: ${h.count} reviews`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-mono text-muted-foreground">-24h</span>
          <span className="text-[10px] font-mono text-muted-foreground">now</span>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-3 border-border bg-card p-4 shadow-[4px_4px_0_0_#000]">
      <p className="text-xs font-bold uppercase text-muted-foreground font-mono">{label}</p>
      <p className="text-3xl font-black mt-1">{value}</p>
    </div>
  )
}

// ── Reviews Panel ──────────────────────────────────────────────────────

function ReviewsPanel({ adminKey }: { adminKey: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  const fetchReviews = useCallback(() => {
    setLoading(true)
    const qs = filter ? `?status=${filter}` : ''
    adminFetch<{ reviews: Review[] }>(`/api/admin/reviews${qs}`, adminKey)
      .then((r) => setReviews(r.reviews))
      .finally(() => setLoading(false))
  }, [adminKey, filter])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this review?')) return
    await adminFetch(`/api/admin/reviews/${id}`, adminKey, { method: 'DELETE' })
    fetchReviews()
  }

  const handleHide = async (id: string) => {
    await adminFetch(`/api/admin/reviews/${id}/hide`, adminKey, { method: 'PATCH' })
    fetchReviews()
  }

  const filters = [null, 'pending', 'approved', 'flagged', 'hidden'] as const

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f ?? 'all'}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 border-2 border-border text-xs font-bold uppercase transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
            }`}
          >
            {f ?? 'All'}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : (
        <div className="space-y-3">
          {reviews.length === 0 && (
            <p className="text-center text-muted-foreground font-mono py-8">No reviews found</p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="border-3 border-border bg-card p-4 shadow-[4px_4px_0_0_#000] space-y-2">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 12)}...</p>
                  <p className="text-sm font-bold">{r.foodIds.join(', ')}</p>
                </div>
                <ModBadge status={r.moderation?.status ?? 'pending'} />
              </div>

              {/* Ratings */}
              <div className="flex gap-2 flex-wrap">
                {Object.entries(r.itemRatings).map(([fid, rating]) => (
                  <span key={fid} className="text-xs font-mono border border-border px-2 py-0.5 bg-muted">
                    {fid}: {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                  </span>
                ))}
                <span className="text-xs font-bold border-2 border-border px-2 py-0.5 bg-[#ffff00]">
                  Overall: {'★'.repeat(r.overallRating)}
                </span>
              </div>

              {/* Feedback */}
              {r.feedback && (
                <p className="text-sm bg-muted border-2 border-border px-3 py-2 font-mono">"{r.feedback}"</p>
              )}

              {/* Moderation reason */}
              {r.moderation?.reason && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold">AI:</span> {r.moderation.reason}
                </p>
              )}

              {/* Classification */}
              {r.classification && (
                <div className="text-xs border-2 border-[#0066ff] bg-blue-50 dark:bg-blue-950/30 px-3 py-2">
                  <span className="font-bold text-[#0066ff]">Vision:</span>{' '}
                  {r.classification.is_food
                    ? `${r.classification.identified_food} (${Math.round(r.classification.confidence * 100)}%)`
                    : 'Not food'
                  }
                  {r.classification.description && ` — ${r.classification.description}`}
                </div>
              )}

              {/* Meta + actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-muted-foreground font-mono">
                  {r.userId} · {r.createdAt ? new Date(r.createdAt).toLocaleString() : '?'}
                  {r.hasPhoto && ' · has photo'}
                </div>
                <div className="flex gap-2">
                  {r.moderation?.status !== 'hidden' && (
                    <button
                      onClick={() => handleHide(r.id)}
                      className="text-xs font-bold uppercase border-2 border-border px-2 py-1 bg-[#ffff00] hover:bg-yellow-300 transition-colors"
                    >
                      Hide
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs font-bold uppercase border-2 border-border px-2 py-1 bg-[#ff3333] text-white hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ModBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 border-green-600 dark:bg-green-950 dark:text-green-300',
    flagged: 'bg-[#ff3333] text-white border-[#ff3333]',
    hidden: 'bg-gray-200 text-gray-600 border-gray-400 dark:bg-gray-800 dark:text-gray-400',
    pending: 'bg-[#ffff00] text-black border-[#ffff00]',
  }
  return (
    <span className={`text-xs font-black uppercase px-2 py-0.5 border-2 ${colors[status] ?? colors.pending}`}>
      {status}
    </span>
  )
}

// ── Foods Panel ────────────────────────────────────────────────────────

function FoodsPanel({ adminKey }: { adminKey: string }) {
  const [foods, setFoods] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<FoodItem>>({})

  const fetchFoods = useCallback(() => {
    setLoading(true)
    adminFetch<{ foods: FoodItem[] }>('/api/admin/foods', adminKey)
      .then((r) => setFoods(r.foods))
      .finally(() => setLoading(false))
  }, [adminKey])

  useEffect(() => { fetchFoods() }, [fetchFoods])

  const startEdit = (food: FoodItem) => {
    setEditing(food.id)
    setEditForm({ name: food.name, stallName: food.stallName, category: food.category, description: food.description })
  }

  const saveEdit = async (id: string) => {
    await adminFetch(`/api/admin/foods/${id}`, adminKey, {
      method: 'PATCH',
      body: JSON.stringify(editForm),
    })
    setEditing(null)
    fetchFoods()
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-3">
      {foods.map((food) => (
        <div key={food.id} className="border-3 border-border bg-card p-4 shadow-[4px_4px_0_0_#000]">
          {editing === food.id ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editForm.name ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Name"
                  className="border-2 border-border px-3 py-2 text-sm font-bold bg-background focus:outline-none focus:border-primary"
                />
                <input
                  value={editForm.stallName ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, stallName: e.target.value })}
                  placeholder="Stall Name"
                  className="border-2 border-border px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:border-primary"
                />
                <select
                  value={editForm.category ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="border-2 border-border px-3 py-2 text-sm bg-background focus:outline-none focus:border-primary"
                >
                  <option value="snacks">snacks</option>
                  <option value="mains">mains</option>
                  <option value="beverages">beverages</option>
                  <option value="desserts">desserts</option>
                </select>
                <input
                  value={editForm.description ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Description"
                  className="border-2 border-border px-3 py-2 text-sm bg-background focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(food.id)}
                  className="text-xs font-bold uppercase border-2 border-border px-3 py-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-950 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="text-xs font-bold uppercase border-2 border-border px-3 py-1.5 bg-muted hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold">{food.name}</p>
                  <span className="text-xs font-mono border border-border px-1.5 py-0.5 bg-muted">{food.category}</span>
                  {!food.isActive && (
                    <span className="text-xs font-bold text-[#ff3333] border border-[#ff3333] px-1.5 py-0.5">INACTIVE</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {food.stallName} · {food.reviewCount} reviews · {food.ratingAvg?.toFixed(1) ?? '0.0'} avg
                </p>
              </div>
              <button
                onClick={() => startEdit(food)}
                className="text-xs font-bold uppercase border-2 border-border px-3 py-1.5 bg-[#0066ff] text-white hover:bg-blue-700 transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Shared ──────────────────────────────────────────────────────────────

function Loading() {
  return (
    <div className="text-center py-8">
      <div className="inline-block border-3 border-border bg-secondary px-6 py-4 shadow-[4px_4px_0_0_#000]">
        <div className="w-8 h-1 bg-primary mx-auto animate-pulse" />
        <p className="text-sm font-bold uppercase mt-2">Loading...</p>
      </div>
    </div>
  )
}
