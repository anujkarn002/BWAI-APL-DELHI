import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'

export const Route = createFileRoute('/_app/review')({
  component: ReviewFlow,
})

interface Food {
  id: string
  name: string
  category: string
  stallName: string
  imageUrl: string
}

type Step = 'photo' | 'pick' | 'rate' | 'feedback' | 'submitting'

function resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = (height / width) * maxSize; width = maxSize }
        else { width = (width / height) * maxSize; height = maxSize }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

const categories = ['snacks', 'mains', 'beverages', 'desserts'] as const

function ReviewFlow() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('photo')
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [selectedFoods, setSelectedFoods] = useState<string[]>([])
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({})
  const [overallRating, setOverallRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: foods = [] } = useQuery({
    queryKey: ['foods'],
    queryFn: () => api.get<Food[]>('/api/foods'),
  })

  const submitMutation = useMutation({
    mutationFn: (body: unknown) => api.post('/api/reviews', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      navigate({ to: '/home' })
    },
  })

  const handlePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await resizeImage(file, 800, 0.7)
    setPhotoBase64(b64)
    setStep('pick')
  }, [])

  const toggleFood = (id: string) => {
    setSelectedFoods((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const handleSubmit = () => {
    setStep('submitting')
    submitMutation.mutate({
      foodIds: selectedFoods,
      photoBase64,
      itemRatings,
      overallRating,
      feedback: feedback || null,
    })
  }

  const filteredFoods = categoryFilter ? foods.filter((f) => f.category === categoryFilter) : foods

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">✍️ Submit Review</h1>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {(['photo', 'pick', 'rate', 'feedback'] as const).map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${
            (['photo', 'pick', 'rate', 'feedback'] as const).indexOf(step as typeof s) >= i ? 'bg-primary' : 'bg-muted'
          }`} />
        ))}
      </div>

      {step === 'photo' && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Take a photo of your food (optional)</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full bg-card border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-colors"
          >
            <span className="text-4xl block mb-2">📸</span>
            <span className="text-muted-foreground">Tap to take photo</span>
          </button>
          <button
            onClick={() => setStep('pick')}
            className="w-full text-muted-foreground text-sm hover:text-foreground"
          >
            Skip photo →
          </button>
        </div>
      )}

      {step === 'pick' && (
        <div className="space-y-4">
          {photoBase64 && (
            <img src={photoBase64} alt="Your food" className="w-full h-48 object-cover rounded-lg" />
          )}
          <p className="text-muted-foreground">What did you eat? (select all)</p>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${!categoryFilter ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap capitalize ${categoryFilter === c ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {filteredFoods.map((food) => (
              <button
                key={food.id}
                onClick={() => toggleFood(food.id)}
                className={`rounded-lg p-3 text-left border-2 transition-colors ${
                  selectedFoods.includes(food.id) ? 'border-primary bg-primary/10' : 'border-transparent bg-card'
                }`}
              >
                <p className="font-medium text-sm">{food.name}</p>
                <p className="text-xs text-muted-foreground">{food.stallName}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              // init ratings
              const r: Record<string, number> = {}
              selectedFoods.forEach((id) => { r[id] = 0 })
              setItemRatings(r)
              setStep('rate')
            }}
            disabled={selectedFoods.length === 0}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold disabled:opacity-50"
          >
            Next: Rate ({selectedFoods.length} selected)
          </button>
        </div>
      )}

      {step === 'rate' && (
        <div className="space-y-6">
          <p className="text-muted-foreground">Rate each item</p>
          {selectedFoods.map((id) => {
            const food = foods.find((f) => f.id === id)
            return (
              <div key={id}>
                <p className="font-medium mb-1">{food?.name ?? id}</p>
                <StarPicker value={itemRatings[id] ?? 0} onChange={(v) => setItemRatings((prev) => ({ ...prev, [id]: v }))} />
              </div>
            )
          })}

          <div className="pt-4 border-t border-border">
            <p className="font-medium mb-1">Overall Experience</p>
            <StarPicker value={overallRating} onChange={setOverallRating} />
          </div>

          <button
            onClick={() => setStep('feedback')}
            disabled={overallRating === 0 || Object.values(itemRatings).some((v) => v === 0)}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold disabled:opacity-50"
          >
            Next: Feedback
          </button>
        </div>
      )}

      {step === 'feedback' && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Any feedback? (optional)</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Loved the Pav Bhaji! Chai was too sweet..."
            className="w-full bg-card border border-border rounded-lg p-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSubmit}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold"
          >
            Submit Review 🚀
          </button>
          {submitMutation.isError && (
            <p className="text-destructive text-sm text-center">
              {submitMutation.error instanceof Error ? submitMutation.error.message : 'Submission failed'}
            </p>
          )}
        </div>
      )}

      {step === 'submitting' && (
        <div className="text-center py-12">
          <p className="text-2xl mb-2">⏳</p>
          <p className="text-muted-foreground">Submitting your review...</p>
        </div>
      )}
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition-transform hover:scale-110 ${star <= value ? 'text-yellow-400' : 'text-muted'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
