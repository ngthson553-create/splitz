import { describe, expect, it } from 'vitest'
import { loadAdminSupportUser, searchAdminSupportUsers } from './adminSupport'

describe('admin support client', () => {
  it('searches users and loads a read-only 360 snapshot through the guarded Edge Function', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: { body: Record<string, unknown> }) => {
          calls.push({ name, options })
          if (options.body.action === 'search_users') {
            return {
              data: {
                users: [
                  {
                    user_id: 'user-1',
                    email: 'owner@example.com',
                    display_name: 'Son',
                    avatar_url: null,
                    onboarded: true,
                    bank_configured: true,
                    group_count: 2,
                    premium_plan: 'personal',
                    created_at: '2026-06-10T08:00:00.000Z',
                  },
                ],
              },
              error: null,
            }
          }
          return {
            data: {
              checked_at: '2026-06-10T09:00:00.000Z',
              profile: {
                user_id: 'user-1',
                email: 'owner@example.com',
                display_name: 'Son',
                avatar_url: null,
                onboarded_at: '2026-06-10T08:10:00.000Z',
                created_at: '2026-06-10T08:00:00.000Z',
                updated_at: '2026-06-10T08:30:00.000Z',
                bank_configured: true,
                bank_code: '970436',
                bank_account_last4: '6789',
              },
              groups: [
                {
                  group_id: 'group-1',
                  name: 'Da Nang trip',
                  emoji: '🏖️',
                  base_currency: 'VND',
                  settlement_method: 'smart_settle',
                  owner_id: 'user-1',
                  owner_email: 'owner@example.com',
                  member_id: 'member-1',
                  member_name: 'Son',
                  member_role: 'owner',
                  is_owner: true,
                  member_count: 3,
                  expense_count: 8,
                  settlement_count: 1,
                  created_at: '2026-06-10T08:20:00.000Z',
                  updated_at: '2026-06-10T08:40:00.000Z',
                  version: 4,
                  members: [
                    {
                      member_id: 'member-1',
                      user_id: 'user-1',
                      email: 'owner@example.com',
                      name: 'Son',
                      role: 'owner',
                      bank_configured: true,
                      joined_at: '2026-06-10T08:20:00.000Z',
                    },
                  ],
                },
              ],
              subscription: {
                user_id: 'user-1',
                plan: 'personal',
                status: 'active',
                period_end: '2026-07-10T09:00:00.000Z',
                source: 'payos',
                team_id: null,
                days_left: 30,
                created_at: '2026-06-10T08:00:00.000Z',
                updated_at: '2026-06-10T08:50:00.000Z',
              },
              payments: [
                {
                  order_code: 202606101234,
                  plan: 'personal',
                  cycle: 'month',
                  amount: 14000,
                  status: 'paid',
                  created_at: '2026-06-10T08:00:00.000Z',
                  paid_at: '2026-06-10T08:01:00.000Z',
                },
              ],
              redemptions: [
                {
                  id: 'use-1',
                  code: 'SPLITZ30',
                  plan: 'personal',
                  duration_days: 30,
                  used_at: '2026-06-10T08:02:00.000Z',
                },
              ],
              ai_usage: [
                { feature: 'parse_expense', period: '2026-06', count: 5, updated_at: '2026-06-10T08:30:00.000Z' },
              ],
              push: {
                subscription_count: 2,
                latest_created_at: '2026-06-10T08:30:00.000Z',
                endpoint_hosts: [{ host: 'fcm.googleapis.com', count: 2 }],
              },
            },
            error: null,
          }
        },
      },
    }

    await expect(searchAdminSupportUsers(client, { query: ' sonss ', limit: 25 })).resolves.toEqual([
      {
        userId: 'user-1',
        email: 'owner@example.com',
        displayName: 'Son',
        avatarUrl: null,
        onboarded: true,
        bankConfigured: true,
        groupCount: 2,
        premiumPlan: 'personal',
        createdAt: '2026-06-10T08:00:00.000Z',
      },
    ])

    await expect(loadAdminSupportUser(client, 'owner@example.com')).resolves.toMatchObject({
      checkedAt: '2026-06-10T09:00:00.000Z',
      profile: {
        userId: 'user-1',
        email: 'owner@example.com',
        bankConfigured: true,
        bankAccountLast4: '6789',
      },
      groups: [
        {
          groupId: 'group-1',
          name: 'Da Nang trip',
          isOwner: true,
          memberCount: 3,
          members: [{ memberId: 'member-1', email: 'owner@example.com', bankConfigured: true }],
        },
      ],
      subscription: { plan: 'personal', status: 'active', daysLeft: 30 },
      payments: [{ orderCode: '202606101234', status: 'paid' }],
      redemptions: [{ code: 'SPLITZ30', durationDays: 30 }],
      aiUsage: [{ feature: 'parse_expense', count: 5 }],
      push: { subscriptionCount: 2, endpointHosts: [{ host: 'fcm.googleapis.com', count: 2 }] },
    })

    expect(calls).toEqual([
      { name: 'admin-support', options: { body: { action: 'search_users', query: 'sonss', limit: 25 } } },
      { name: 'admin-support', options: { body: { action: 'user_snapshot', query: 'owner@example.com' } } },
    ])
  })
})
