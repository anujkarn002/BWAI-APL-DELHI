import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/auth-store'
import { useAppSettings, type ViewMode } from '@/lib/settings-store'
import { Monitor, Smartphone, MonitorSmartphone } from 'lucide-react'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

const VIEW_OPTIONS: { value: ViewMode; label: string; desc: string; Icon: typeof Monitor }[] = [
  { value: 'auto', label: 'Auto', desc: 'Mobile frame on wide screens, full-width on phones', Icon: MonitorSmartphone },
  { value: 'mobile', label: 'Mobile', desc: 'Always show in a phone-sized container', Icon: Smartphone },
  { value: 'desktop', label: 'Desktop', desc: 'Full-width layout, no container restriction', Icon: Monitor },
]

function SettingsPage() {
  const phone = useAuthStore((s) => s.phone)
  const viewMode = useAppSettings((s) => s.viewMode)
  const setViewMode = useAppSettings((s) => s.setViewMode)

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-2xl font-black uppercase tracking-tight">Settings</h1>

      {/* Account info */}
      <section className="border-3 border-border bg-card p-4 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">Account</h2>
        <p className="font-mono text-lg font-bold">{phone || 'Unknown'}</p>
      </section>

      {/* View mode toggle */}
      <section className="border-3 border-border bg-card p-4 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Display Mode</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Choose how the app renders on your screen. "Mobile" shows a phone-sized frame — great for demos on projectors or laptops.
        </p>
        <div className="space-y-2">
          {VIEW_OPTIONS.map((opt) => {
            const isActive = viewMode === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setViewMode(opt.value)}
                className={`w-full text-left flex items-start gap-3 border-2 p-3 transition-all cursor-pointer ${
                  isActive
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div
                  className={`w-9 h-9 flex items-center justify-center border-2 shrink-0 ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted border-border'
                  }`}
                >
                  <opt.Icon size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* About */}
      <section className="border-3 border-border bg-card p-4 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2">About</h2>
        <div className="space-y-1 text-sm">
          <p><span className="font-bold">StadiumBite</span> v0.1.0</p>
          <p className="text-muted-foreground">AI-powered stadium food rating platform</p>
          <p className="text-muted-foreground text-xs mt-2">
            Built for Build With AI :: Agentic Premier League — Delhi 2026
          </p>
        </div>
        <div className="flex gap-2 mt-3">
          <span className="border border-border px-2 py-0.5 text-[10px] font-mono font-bold">Gemini 2.5 Flash</span>
          <span className="border border-border px-2 py-0.5 text-[10px] font-mono font-bold">Firestore</span>
          <span className="border border-border px-2 py-0.5 text-[10px] font-mono font-bold">Cloud Run</span>
        </div>
      </section>
    </div>
  )
}
