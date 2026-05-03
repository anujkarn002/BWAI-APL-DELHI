import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

export const Route = createFileRoute('/login')({
  component: Login,
})

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
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black">
            Stadium<span className="text-primary">Bite</span>
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">Sign in to rate food</p>
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
                className="w-full bg-primary text-primary-foreground border-2 border-border py-3 font-bold uppercase tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all disabled:opacity-50 disabled:hover:translate-y-0"
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
                className="w-full bg-primary text-primary-foreground border-2 border-border py-3 font-bold uppercase tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                className="w-full border-2 border-border py-2 text-sm font-bold hover:bg-muted transition-colors"
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
      </div>
    </div>
  )
}
