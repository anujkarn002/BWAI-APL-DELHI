import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

export const Route = createFileRoute('/login')({
  component: Login,
})

const FEATURES = [
  { icon: 'AI', title: 'AI-Powered', desc: 'Snap a photo and our AI identifies the dish instantly' },
  { icon: 'RT', title: 'Real-Time', desc: 'Live leaderboard updates across all devices via SSE' },
  { icon: 'FD', title: 'Social Feed', desc: 'See what others are eating with photos and ratings' },
] as const

const STATS = [
  { value: '16+', label: 'Food Items' },
  { value: 'Live', label: 'Leaderboard' },
  { value: '5', label: 'Star Ratings' },
] as const

function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/request-otp', { phone: `+91${phone.replace(/\D/g, '')}` })
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<{ token: string; user_id: string }>('/api/auth/verify-otp', {
        phone: `+91${phone.replace(/\D/g, '')}`,
        otp,
      })
      setAuth(res.token, `+91${phone.replace(/\D/g, '')}`, res.user_id)
      navigate({ to: '/home' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top brand bar */}
      <header className="border-b-3 border-border bg-card px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-black tracking-tight">
          Stadium<span className="text-primary">Bite</span>
        </Link>
        <div className="bg-secondary border-2 border-border px-2 py-0.5 shadow-sm">
          <span className="text-xs font-mono font-bold uppercase">APL Delhi 2026</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left side — platform info */}
        <div className="lg:flex-1 px-6 py-8 lg:py-16 lg:px-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto lg:mx-0">
            {/* Tagline */}
            <div className="border-3 border-border bg-primary text-primary-foreground px-4 py-2 shadow-md inline-block mb-5 -rotate-1">
              <span className="text-sm font-black uppercase tracking-wide">Rate Stadium Food. Live.</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
              Know what&apos;s <span className="text-primary">worth eating</span> before you order
            </h1>

            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Snap your food, rate it, and see real-time rankings across the entire stadium. 
              AI identifies dishes from photos. Community-driven, instant updates.
            </p>

            {/* Feature cards */}
            <div className="space-y-3 mb-8">
              {FEATURES.map((f) => (
                <div
                  key={f.icon}
                  className="flex items-start gap-3 border-2 border-border bg-card p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-10 h-10 bg-accent text-accent-foreground border-2 border-border flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-sm">
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{f.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats strip */}
            <div className="flex border-3 border-border shadow-sm">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex-1 text-center py-3 ${i < STATS.length - 1 ? 'border-r-2 border-border' : ''}`}
                >
                  <p className="font-mono font-black text-lg">{s.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side — login form */}
        <div className="lg:flex-1 px-6 py-8 lg:py-16 lg:px-12 flex items-center justify-center lg:border-l-3 lg:border-border bg-muted/30">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black uppercase">Get Started</h2>
              <p className="text-muted-foreground mt-1 text-sm">Sign in with your phone number</p>
            </div>

            <div className="border-3 border-border bg-card p-6 shadow-lg">
              {step === 'phone' ? (
                <form onSubmit={handleRequestOtp} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wide mb-2">Phone Number</label>
                    <div className="flex gap-2">
                      <span className="bg-muted border-2 border-border px-3 py-2.5 text-sm font-mono font-bold">+91</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9876543210"
                        className="flex-1 bg-background border-2 border-border px-3 py-2.5 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || phone.replace(/\D/g, '').length !== 10}
                    className="w-full bg-primary text-primary-foreground border-2 border-border py-3 font-bold uppercase tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wide mb-2">Enter OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="000000"
                      className="w-full bg-background border-2 border-border px-3 py-3 font-mono text-2xl text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                      maxLength={6}
                      autoFocus
                      required
                    />
                    <div className="mt-2 bg-secondary border-2 border-border px-3 py-1.5 inline-block shadow-sm">
                      <p className="text-xs font-mono font-bold">DEMO OTP: 999999</p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-primary text-primary-foreground border-2 border-border py-3 font-bold uppercase tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                    className="w-full border-2 border-border py-2 text-sm font-bold hover:bg-muted transition-colors cursor-pointer"
                  >
                    &larr; Change Number
                  </button>
                </form>
              )}

              {error && (
                <div className="mt-4 bg-primary/10 border-2 border-primary px-3 py-2">
                  <p className="text-primary text-sm font-bold">{error}</p>
                </div>
              )}
            </div>

            {/* Trust signals */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                No password needed. OTP-based login.
              </p>
              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <span className="border border-border px-2 py-0.5 font-mono">Gemini AI</span>
                <span className="border border-border px-2 py-0.5 font-mono">Firestore</span>
                <span className="border border-border px-2 py-0.5 font-mono">Cloud Run</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-3 border-border bg-muted px-6 py-3 text-center">
        <p className="text-xs font-mono text-muted-foreground">
          Built for <span className="font-bold text-foreground">Build With AI :: Agentic Premier League</span> &mdash; Delhi 2026
        </p>
      </footer>
    </div>
  )
}
