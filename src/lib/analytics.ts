// Analytics (PostHog) + crash reporting (Sentry). Tự bật khi có env; không có → no-op.
import posthog from 'posthog-js'
import * as Sentry from '@sentry/react'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY?.trim()
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com'
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN?.trim()

let phReady = false
let sentryReady = false

export function initAnalytics(): void {
  if (POSTHOG_KEY && !phReady) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      person_profiles: 'identified_only',
    })
    phReady = true
  }
  if (SENTRY_DSN && !sentryReady) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
    })
    sentryReady = true
  }
}

export function trackEvent(event: string, props?: Record<string, unknown>): void {
  if (phReady) posthog.capture(event, props)
}

export function identifyUser(id: string, props?: Record<string, unknown>): void {
  if (phReady) posthog.identify(id, props)
  if (sentryReady) Sentry.setUser({ id })
}

export function resetUser(): void {
  if (phReady) posthog.reset()
  if (sentryReady) Sentry.setUser(null)
}

export function captureError(error: unknown): void {
  if (phReady) posthog.captureException(error)
  if (sentryReady) Sentry.captureException(error)
}
