import { lazy, Suspense } from 'react'
import { SplitzRouteLoading } from '../../components/SplitzRouteLoading'

const ConsoleRoot = lazy(() => import('./ConsoleRoot').then((module) => ({ default: module.ConsoleRoot })))

export function LazyConsoleRoot() {
  return (
    <Suspense fallback={<SplitzRouteLoading />}>
      <ConsoleRoot />
    </Suspense>
  )
}
