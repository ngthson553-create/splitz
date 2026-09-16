import { describe, expect, it } from 'vitest'
import { getAdminHealthSnapshot } from './adminHealth'

describe('admin health client', () => {
  it('loads and normalizes the guarded health snapshot', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: unknown) => {
          calls.push({ name, options })
          return {
            data: {
              checked_at: '2026-06-10T09:00:00.000Z',
              summary_status: 'failed',
              cards: [
                {
                  id: 'resend',
                  label: 'Resend',
                  status: 'configured',
                  detail: 'RESEND_API_KEY configured',
                  last_success_at: '2026-06-10T08:30:00.000Z',
                },
                {
                  id: 'payos',
                  label: 'PayOS webhook',
                  status: 'failed',
                  detail: 'Webhook has recent failed orders',
                  last_error_at: '2026-06-10T08:45:00.000Z',
                  last_error: 'payment_pending_timeout',
                },
              ],
              metrics: [
                { id: 'users', label: 'Users', value: 12, detail: 'profiles' },
                { id: 'ai_usage_month', label: 'AI usage', value: '34', detail: '2026-06' },
              ],
              jobs: [
                {
                  id: 'job-1',
                  source: 'notification_jobs',
                  job_type: 'send_now',
                  status: 'failed',
                  target_type: 'all',
                  target_value: null,
                  target_count: 2,
                  result_summary: { push_failed: 1 },
                  error_message: 'push_410',
                  created_at: '2026-06-10T08:00:00.000Z',
                  started_at: '2026-06-10T08:00:01.000Z',
                  finished_at: '2026-06-10T08:00:02.000Z',
                },
              ],
              recent_errors: [
                {
                  id: 'audit-1',
                  source: 'admin_audit_logs',
                  action: 'notification.send_now',
                  message: 'push_410',
                  created_at: '2026-06-10T08:00:02.000Z',
                },
              ],
            },
            error: null,
          }
        },
      },
    }

    await expect(getAdminHealthSnapshot(client, { jobStatus: 'failed' })).resolves.toEqual({
      checkedAt: '2026-06-10T09:00:00.000Z',
      summaryStatus: 'failed',
      cards: [
        {
          id: 'resend',
          label: 'Resend',
          status: 'configured',
          detail: 'RESEND_API_KEY configured',
          lastSuccessAt: '2026-06-10T08:30:00.000Z',
          lastErrorAt: null,
          lastError: null,
        },
        {
          id: 'payos',
          label: 'PayOS webhook',
          status: 'failed',
          detail: 'Webhook has recent failed orders',
          lastSuccessAt: null,
          lastErrorAt: '2026-06-10T08:45:00.000Z',
          lastError: 'payment_pending_timeout',
        },
      ],
      metrics: [
        { id: 'users', label: 'Users', value: 12, detail: 'profiles' },
        { id: 'ai_usage_month', label: 'AI usage', value: 34, detail: '2026-06' },
      ],
      jobs: [
        {
          id: 'job-1',
          source: 'notification_jobs',
          jobType: 'send_now',
          status: 'failed',
          targetType: 'all',
          targetValue: null,
          targetCount: 2,
          resultSummary: { push_failed: 1 },
          errorMessage: 'push_410',
          createdAt: '2026-06-10T08:00:00.000Z',
          startedAt: '2026-06-10T08:00:01.000Z',
          finishedAt: '2026-06-10T08:00:02.000Z',
        },
      ],
      recentErrors: [
        {
          id: 'audit-1',
          source: 'admin_audit_logs',
          action: 'notification.send_now',
          message: 'push_410',
          createdAt: '2026-06-10T08:00:02.000Z',
        },
      ],
    })

    expect(calls).toEqual([
      {
        name: 'admin-health',
        options: { body: { action: 'snapshot', job_status: 'failed' } },
      },
    ])
  })

  it('returns null when Supabase is missing, errors, or the snapshot is malformed', async () => {
    await expect(getAdminHealthSnapshot(null)).resolves.toBeNull()
    await expect(
      getAdminHealthSnapshot({ functions: { invoke: async () => ({ data: null, error: new Error('forbidden') }) } }),
    ).resolves.toBeNull()
    await expect(
      getAdminHealthSnapshot({ functions: { invoke: async () => ({ data: { checked_at: 123 }, error: null }) } }),
    ).resolves.toBeNull()
  })
})
