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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">🏟️ StadiumBite</h1>
          <p className="text-muted-foreground mt-1">Sign in to rate food</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <div className="flex gap-2">
                <span className="bg-card border border-border rounded-md px-3 py-2 text-sm">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={10}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length !== 10}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={6}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Demo OTP: 999999</p>
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError('') }}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              ← Change number
            </button>
          </form>
        )}

        {error && <p className="text-destructive text-sm text-center">{error}</p>}
      </div>
    </div>
  )
}
