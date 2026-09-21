import { useT } from '../lib/i18n'

export function SplitzRouteLoading() {
  const t = useT()
  return (
    <div className="relative grid min-h-dvh place-items-center px-5">
      <div className="app-aurora" />
      <div className="card relative w-full max-w-sm p-5 text-center">
        <div className="mx-auto mb-3 h-12 w-12 animate-pulse rounded-2xl gradient-brand shadow-glow" />
        <p className="font-bold text-app">{t.common.loadingApp}</p>
        <p className="mt-1 text-sm text-muted">{t.common.pleaseWait}</p>
      </div>
    </div>
  )
}
