import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState } from 'react'
import { Star, Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

export const Route = createFileRoute('/_app/my-reviews')({
  component: MyReviews,
})

interface Review {
  id: string
  foodIds: string[]
  itemRatings: Record<string, number>
  overallRating: number
  feedback: string | null
  hasPhoto: boolean
  createdAt: { _seconds: number } | string
  updatedAt?: { _seconds: number } | string
  moderation?: { status: string; reason?: string }
}

function formatDate(ts: { _seconds: number } | string | undefined): string {
  if (!ts) return ''
  const d = typeof ts === 'string' ? new Date(ts) : new Date((ts as { _seconds: number })._seconds * 1000)
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${onChange ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            size={18}
            className={n <= value ? 'text-primary fill-primary' : 'text-muted-foreground/30'}
            strokeWidth={2}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewCard({ review, foods }: { review: Review; foods: Record<string, string> }) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editRatings, setEditRatings] = useState(review.itemRatings)
  const [editOverall, setEditOverall] = useState(review.overallRating)
  const [editFeedback, setEditFeedback] = useState(review.feedback ?? '')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: { itemRatings: Record<string, number>; overallRating: number; feedback: string }) =>
      api.put(`/api/reviews/${review.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['foods'] })
      setEditing(false)
    },
  })

  const startEdit = () => {
    setEditRatings({ ...review.itemRatings })
    setEditOverall(review.overallRating)
    setEditFeedback(review.feedback ?? '')
    setEditing(true)
    setExpanded(true)
  }

  const save = () => {
    mutation.mutate({ itemRatings: editRatings, overallRating: editOverall, feedback: editFeedback })
  }

  const modStatus = review.moderation?.status
  const modBadge = modStatus === 'approved'
    ? 'bg-green-100 text-green-800 border-green-300'
    : modStatus === 'flagged'
      ? 'bg-red-100 text-red-800 border-red-300'
      : 'bg-yellow-100 text-yellow-800 border-yellow-300'

  return (
    <div className="border-3 border-border bg-card shadow-md">
      {/* Header — always visible */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => !editing && setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">
            {review.foodIds.map((id) => foods[id] || id).join(', ')}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {formatDate(review.createdAt)}
            {review.updatedAt ? ' (edited)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {modStatus && (
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border ${modBadge}`}>
              {modStatus}
            </span>
          )}
          <span className="font-mono font-bold text-lg">{review.overallRating}</span>
          <Star size={14} className="text-primary fill-primary" />
          {!editing && (expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
        </div>
      </div>

      {/* Expanded detail / edit form */}
      {expanded && (
        <div className="border-t-2 border-border px-4 py-3 space-y-3">
          {/* Per-item ratings */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-muted-foreground">Item Ratings</p>
            {review.foodIds.map((fid) => (
              <div key={fid} className="flex items-center justify-between">
                <span className="text-sm font-medium">{foods[fid] || fid}</span>
                <StarRating
                  value={editing ? editRatings[fid] ?? 0 : review.itemRatings[fid] ?? 0}
                  onChange={editing ? (v) => setEditRatings((r) => ({ ...r, [fid]: v })) : undefined}
                />
              </div>
            ))}
          </div>

          {/* Overall */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground">Overall</span>
            <StarRating
              value={editing ? editOverall : review.overallRating}
              onChange={editing ? setEditOverall : undefined}
            />
          </div>

          {/* Feedback */}
          {editing ? (
            <textarea
              value={editFeedback}
              onChange={(e) => setEditFeedback(e.target.value)}
              className="w-full border-2 border-border p-2 text-sm font-mono bg-background resize-none"
              rows={3}
              placeholder="Your feedback..."
            />
          ) : review.feedback ? (
            <p className="text-sm italic text-muted-foreground">"{review.feedback}"</p>
          ) : null}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {editing ? (
              <>
                <button
                  onClick={save}
                  disabled={mutation.isPending}
                  className="flex items-center gap-1 bg-primary text-primary-foreground border-2 border-border px-3 py-1.5 text-xs font-bold uppercase shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  <Check size={14} />
                  {mutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 border-2 border-border px-3 py-1.5 text-xs font-bold uppercase shadow-sm hover:bg-muted transition-all"
                >
                  <X size={14} /> Cancel
                </button>
                {mutation.isError && (
                  <span className="text-xs text-red-600 self-center">
                    {(mutation.error as Error).message}
                  </span>
                )}
              </>
            ) : (
              <button
                onClick={startEdit}
                className="flex items-center gap-1 border-2 border-border px-3 py-1.5 text-xs font-bold uppercase shadow-sm hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Pencil size={14} /> Edit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MyReviews() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get<Review[]>('/api/reviews/mine'),
  })

  // Fetch food names for display
  const { data: foods } = useQuery({
    queryKey: ['foods'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/api/foods'),
  })

  const foodMap: Record<string, string> = {}
  for (const f of foods ?? []) {
    foodMap[f.id] = f.name
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-black mb-4">My Reviews</h2>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-3 border-border bg-muted/30 h-20 animate-pulse" />
          ))}
        </div>
      ) : !reviews?.length ? (
        <div className="border-3 border-border bg-card p-8 text-center shadow-md">
          <p className="text-muted-foreground font-bold">No reviews yet</p>
          <p className="text-sm text-muted-foreground mt-1">Go rate some food!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} foods={foodMap} />
          ))}
        </div>
      )}
    </div>
  )
}
