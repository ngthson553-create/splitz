import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { loadCurrentMaintenanceBanner, type MaintenanceBanner } from '../lib/systemConfig'

const toneClass: Record<MaintenanceBanner['severity'], string> = {
  info: 'border-brand-200 bg-brand-50 text-brand-950 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-50',
  warning: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50',
  critical: 'border-red-200 bg-red-50 text-red-950 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-50',
}

function BannerIcon({ severity }: { severity: MaintenanceBanner['severity'] }) {
  if (severity === 'critical') return <ShieldAlert size={18} />
  if (severity === 'warning') return <AlertTriangle size={18} />
  return <Info size={18} />
}

export function MaintenanceBanner() {
  const [banner, setBanner] = useState<MaintenanceBanner | null>(null)

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      void loadCurrentMaintenanceBanner().then((next) => {
        if (active) setBanner(next)
      })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [])

  if (!banner) return null

  return (
    <section className={`mx-4 mt-4 rounded-2xl border px-4 py-3 shadow-soft lg:mx-0 lg:mt-0 ${toneClass[banner.severity]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <BannerIcon severity={banner.severity} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold leading-5">{banner.title}</p>
          {banner.message && <p className="mt-1 text-sm leading-5 opacity-85">{banner.message}</p>}
        </div>
      </div>
    </section>
  )
}
