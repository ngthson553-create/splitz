export function SplitzRouteLoading() {
  return (
    <div className="relative grid min-h-dvh place-items-center px-5">
      <div className="app-aurora" />
      <div className="card relative w-full max-w-sm p-5 text-center">
        <div className="mx-auto mb-3 h-12 w-12 animate-pulse rounded-2xl gradient-brand shadow-glow" />
        <p className="font-bold text-app">Đang mở Splitz</p>
        <p className="mt-1 text-sm text-muted">Vui lòng chờ trong giây lát.</p>
      </div>
    </div>
  )
}
