import { describe, expect, it } from 'vitest'
import { grantAdminPremium, loadAdminBillingSnapshot, lookupAdminBillingUser } from './adminBilling'

describe('admin billing client', () => {
  it('loads and normalizes the guarded billing snapshot', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: unknown) => {
          calls.push({ name, options })
          return {
            data: {
              checked_at: '2026-06-10T12:00:00.000Z',
              summary_status: 'configured',
              provider: {
                status: 'configured',
                detail: 'PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY configured',
                stale_pending_count: 1,
              },
              metrics: [
                { id: 'active_premium', label: 'Premium active', value: 4, detail: 'active subscriptions' },
              ],
              subscriptions: [
                {
                  user_id: 'user-1',
                  user_email: 'owner@example.com',
                  display_name: 'Son',
                  plan: 'personal',
                  status: 'active',
                  period_end: '2026-07-10T12:00:00.000Z',
                  source: 'payos',
                  team_id: null,
                  days_left: 30,
                  created_at: '2026-06-10T10:00:00.000Z',
                  updated_at: '2026-06-10T11:00:00.000Z',
                },
              ],
              payments: [
                {
                  order_code: 202606101234,
                  user_id: 'user-1',
                  user_email: 'owner@example.com',
                  display_name: 'Son',
                  plan: 'personal',
                  cycle: 'month',
                  amount: 14000,
                  status: 'paid',
                  created_at: '2026-06-10T10:00:00.000Z',
                  paid_at: '2026-06-10T10:05:00.000Z',
                },
              ],
              recent_errors: [
                { id: 'err-1', source: 'admin_audit_logs', action: 'billing.manual_grant', message: 'forbidden', created_at: '2026-06-10T11:30:00.000Z' },
              ],
            },
            error: null,
          }
        },
      },
    }

    await expect(loadAdminBillingSnapshot(client, { search: 'sonss', subscriptionStatus: 'active', paymentStatus: 'paid', limit: 25 })).resolves.toEqual({
      checkedAt: '2026-06-10T12:00:00.000Z',
      summaryStatus: 'configured',
      provider: {
        status: 'configured',
        detail: 'PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY configured',
        stalePendingCount: 1,
      },
      metrics: [
        { id: 'active_premium', label: 'Premium active', value: 4, detail: 'active subscriptions' },
      ],
      subscriptions: [
        {
          userId: 'user-1',
          userEmail: 'owner@example.com',
          displayName: 'Son',
          plan: 'personal',
          status: 'active',
          periodEnd: '2026-07-10T12:00:00.000Z',
          source: 'payos',
          teamId: null,
          daysLeft: 30,
          createdAt: '2026-06-10T10:00:00.000Z',
          updatedAt: '2026-06-10T11:00:00.000Z',
        },
      ],
      payments: [
        {
          orderCode: '202606101234',
          userId: 'user-1',
          userEmail: 'owner@example.com',
          displayName: 'Son',
          plan: 'personal',
          cycle: 'month',
          amount: 14000,
          status: 'paid',
          createdAt: '2026-06-10T10:00:00.000Z',
          paidAt: '2026-06-10T10:05:00.000Z',
        },
      ],
      recentErrors: [
        { id: 'err-1', source: 'admin_audit_logs', action: 'billing.manual_grant', message: 'forbidden', createdAt: '2026-06-10T11:30:00.000Z' },
      ],
    })

    expect(calls).toEqual([
      {
        name: 'admin-billing',
        options: {
          body: {
            action: 'snapshot',
            search: 'sonss',
            subscription_status: 'active',
            payment_status: 'paid',
            limit: 25,
          },
        },
      },
    ])
  })

  it('looks up a user and grants premium through the guarded Edge Function', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: { body: Record<string, unknown> }) => {
          calls.push({ name, options })
          if (options.body.action === 'lookup_user') {
            return {
              data: {
                profile: { user_id: 'user-1', email: 'owner@example.com', display_name: 'Owner', avatar_url: null },
                subscription: null,
                payments: [],
                redemptions: [],
              },
              error: null,
            }
          }
          return {
            data: {
              subscription: {
                user_id: 'user-1',
                user_email: 'owner@example.com',
                display_name: 'Owner',
                plan: 'team',
                status: 'active',
                period_end: '2026-09-10T12:00:00.000Z',
                source: 'manual',
                team_id: null,
                days_left: 92,
                created_at: '2026-06-10T12:00:00.000Z',
                updated_at: '2026-06-10T12:00:00.000Z',
              },
            },
            error: null,
          }
        },
      },
    }

    await expect(lookupAdminBillingUser(client, 'owner@example.com')).resolves.toEqual({
      profile: { userId: 'user-1', email: 'owner@example.com', displayName: 'Owner', avatarUrl: null },
      subscription: null,
      payments: [],
      redemptions: [],
    })

    await expect(grantAdminPremium(client, { userEmail: 'owner@example.com', plan: 'team', days: 92, note: 'Support correction' })).resolves.toMatchObject({
      userId: 'user-1',
      userEmail: 'owner@example.com',
      plan: 'team',
      status: 'active',
      source: 'manual',
    })

    expect(calls).toEqual([
      { name: 'admin-billing', options: { body: { action: 'lookup_user', query: 'owner@example.com' } } },
      {
        name: 'admin-billing',
        options: {
          body: {
            action: 'manual_grant',
            user_email: 'owner@example.com',
            user_id: null,
            plan: 'team',
            days: 92,
            note: 'Support correction',
          },
        },
      },
    ])
  })
})
