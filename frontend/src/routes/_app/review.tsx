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
const STEPS: Step[] = ['photo', 'pick', 'rate', 'feedback']

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
      queryClient.invalidateQueries({ queryKey: ['feed'] })
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
  const stepIndex = STEPS.indexOf(step as Step)

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-2 flex-1 border-2 border-border ${
              i <= stepIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {step === 'photo' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black uppercase">Snap Your Food</h2>
          <p className="text-muted-foreground text-sm">Take a photo to share with the community (optional)</p>
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
            className="w-full border-3 border-dashed border-border bg-muted p-16 text-center hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <span className="text-5xl block mb-3 group-hover:scale-110 transition-transform">{'\u{1F4F7}'}</span>
            <span className="font-bold uppercase text-sm">Tap to take photo</span>
          </button>
          <button
            onClick={() => setStep('pick')}
            className="w-full border-2 border-border py-3 font-bold text-sm uppercase hover:bg-muted transition-colors"
          >
            Skip photo &rarr;
          </button>
        </div>
      )}

      {step === 'pick' && (
        <div className="space-y-4">
          {photoBase64 && (
            <div className="border-3 border-border shadow-md overflow-hidden">
              <img src={photoBase64} alt="Your food" className="w-full h-48 object-cover" />
            </div>
          )}
          <h2 className="text-2xl font-black uppercase">What Did You Eat?</h2>

          {/* Category filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1.5 border-2 border-border text-xs font-bold uppercase whitespace-nowrap transition-colors shadow-sm ${
                !categoryFilter ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1.5 border-2 border-border text-xs font-bold uppercase whitespace-nowrap transition-colors shadow-sm ${
                  categoryFilter === c ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Food grid */}
          <div className="grid grid-cols-2 gap-2">
            {filteredFoods.map((food) => (
              <button
                key={food.id}
                onClick={() => toggleFood(food.id)}
                className={`border-3 border-border p-3 text-left transition-all shadow-sm hover:shadow-md ${
                  selectedFoods.includes(food.id)
                    ? 'bg-primary text-primary-foreground shadow-md -translate-y-0.5'
                    : 'bg-card hover:bg-muted'
                }`}
              >
                <p className="font-bold text-sm">{food.name}</p>
                <p className={`text-xs font-mono ${selectedFoods.includes(food.id) ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {food.stallName}
                </p>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const r: Record<string, number> = {}
              selectedFoods.forEach((id) => { r[id] = 0 })
              setItemRatings(r)
              setStep('rate')
            }}
            disabled={selectedFoods.length === 0}
            className="w-full bg-primary text-primary-foreground border-3 border-border py-3 font-bold uppercase shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
          >
            Next: Rate ({selectedFoods.length} selected)
          </button>
        </div>
      )}

      {step === 'rate' && (
        <div className="space-y-5">
          <h2 className="text-2xl font-black uppercase">Rate Each Item</h2>
          {selectedFoods.map((id) => {
            const food = foods.find((f) => f.id === id)
            return (
              <div key={id} className="border-3 border-border bg-card p-4 shadow-sm">
                <p className="font-bold mb-2">{food?.name ?? id}</p>
                <StarPicker value={itemRatings[id] ?? 0} onChange={(v) => setItemRatings((prev) => ({ ...prev, [id]: v }))} />
              </div>
            )
          })}

          <div className="border-3 border-border bg-secondary p-4 shadow-md">
            <p className="font-black uppercase text-sm mb-2">Overall Experience</p>
            <StarPicker value={overallRating} onChange={setOverallRating} />
          </div>

          <button
            onClick={() => setStep('feedback')}
            disabled={overallRating === 0 || Object.values(itemRatings).some((v) => v === 0)}
            className="w-full bg-primary text-primary-foreground border-3 border-border py-3 font-bold uppercase shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            Next: Feedback
          </button>
        </div>
      )}

      {step === 'feedback' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black uppercase">Any Feedback?</h2>
          <p className="text-sm text-muted-foreground">Optional but helps others decide!</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="The Pav Bhaji was incredible! Chai could be hotter..."
            className="w-full bg-background border-3 border-border p-4 h-32 resize-none font-sans focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          />
          <button
            onClick={handleSubmit}
            className="w-full bg-primary text-primary-foreground border-3 border-border py-4 font-black uppercase text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            Submit Review
          </button>
          {submitMutation.isError && (
            <div className="bg-primary/10 border-2 border-primary px-3 py-2">
              <p className="text-primary text-sm font-bold">
                {submitMutation.error instanceof Error ? submitMutation.error.message : 'Submission failed'}
              </p>
            </div>
          )}
        </div>
      )}

      {step === 'submitting' && (
        <div className="text-center py-16">
          <div className="border-3 border-border bg-secondary inline-block px-8 py-6 shadow-lg">
            <p className="text-2xl font-black uppercase mb-2">Submitting...</p>
            <div className="w-12 h-1 bg-primary mx-auto animate-pulse" />
          </div>
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
          className={`w-10 h-10 border-2 border-border text-lg font-bold transition-all ${
            star <= value
              ? 'bg-primary text-primary-foreground shadow-sm -translate-y-0.5'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          {'\u2605'}
        </button>
      ))}
    </div>
  )
}
