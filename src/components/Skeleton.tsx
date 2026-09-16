import clsx from 'clsx'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx('animate-shimmer rounded-xl', className)}
      style={{
        backgroundImage:
          'linear-gradient(90deg, var(--surface-sunken) 25%, var(--surface-2) 50%, var(--surface-sunken) 75%)',
      }}
    />
  )
}

/** Skeleton danh sách card (dùng cho expenses/settle). */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-3 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton lưới nhóm 2 cột. */
export function GroupGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card aspect-[5/6] p-4 flex flex-col items-center justify-center gap-2.5">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-auto" />
        </div>
      ))}
    </div>
  )
}
