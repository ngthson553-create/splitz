import { describe, expect, it } from 'vitest'
import {
  loadAdminConfigSnapshot,
  saveAdminFeatureFlags,
  saveAdminLimits,
  saveAdminMaintenance,
} from './adminConfig'

describe('admin config client', () => {
  it('loads system config and saves guarded config sections through admin-config', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: { body: Record<string, unknown> }) => {
          calls.push({ name, options })
          if (options.body.action === 'snapshot') {
            return {
              data: {
                checked_at: '2026-06-10T10:00:00.000Z',
                summary_status: 'configured',
                flags: [
                  {
                    key: 'payments',
                    label: 'Thanh toán PayOS',
                    description: 'Bật/tắt tạo đơn PayOS.',
                    enabled: true,
                    category: 'growth',
                    dangerous: true,
                    updated_at: '2026-06-10T09:00:00.000Z',
                  },
                ],
                limits: {
                  free_max_groups: 3,
                  free_max_members: 8,
                  premium_max_groups: null,
                  premium_max_members: 25,
                  parse_free: 15,
                  ocr_free: 3,
                  insight_free: 3,
                  debt_cooldown_hours: 24,
                  redeem_duration_days: 30,
                  redeem_max_uses: 1,
                },
                maintenance: {
                  enabled: true,
                  title: 'Bảo trì AI',
                  message: 'AI tạm gián đoạn.',
                  severity: 'warning',
                  starts_at: '2026-06-10T10:00:00.000Z',
                  ends_at: '2026-06-10T12:00:00.000Z',
                  updated_at: '2026-06-10T09:30:00.000Z',
                },
                disclaimer: {
                  payment: 'Thanh toán xử lý qua PayOS.',
                  legal: 'Splitz hỗ trợ chia tiền, không phải ví điện tử.',
                  updated_at: '2026-06-10T09:40:00.000Z',
                },
                recent_changes: [
                  { id: 'audit-1', action: 'config.flags.save', actor_email: 'owner@example.com', created_at: '2026-06-10T09:50:00.000Z' },
                ],
              },
              error: null,
            }
          }
          return { data: { saved: true }, error: null }
        },
      },
    }

    await expect(loadAdminConfigSnapshot(client)).resolves.toEqual({
      checkedAt: '2026-06-10T10:00:00.000Z',
      summaryStatus: 'configured',
      flags: [
        {
          key: 'payments',
          label: 'Thanh toán PayOS',
          description: 'Bật/tắt tạo đơn PayOS.',
          enabled: true,
          category: 'growth',
          dangerous: true,
          updatedAt: '2026-06-10T09:00:00.000Z',
        },
      ],
      limits: {
        freeMaxGroups: 3,
        freeMaxMembers: 8,
        premiumMaxGroups: null,
        premiumMaxMembers: 25,
        parseFree: 15,
        ocrFree: 3,
        insightFree: 3,
        debtCooldownHours: 24,
        redeemDurationDays: 30,
        redeemMaxUses: 1,
      },
      maintenance: {
        enabled: true,
        title: 'Bảo trì AI',
        message: 'AI tạm gián đoạn.',
        severity: 'warning',
        startsAt: '2026-06-10T10:00:00.000Z',
        endsAt: '2026-06-10T12:00:00.000Z',
        updatedAt: '2026-06-10T09:30:00.000Z',
      },
      disclaimer: {
        payment: 'Thanh toán xử lý qua PayOS.',
        legal: 'Splitz hỗ trợ chia tiền, không phải ví điện tử.',
        updatedAt: '2026-06-10T09:40:00.000Z',
      },
      recentChanges: [
        { id: 'audit-1', action: 'config.flags.save', actorEmail: 'owner@example.com', createdAt: '2026-06-10T09:50:00.000Z' },
      ],
    })

    await expect(saveAdminFeatureFlags(client, { flags: { payments: false }, reason: 'PayOS incident' })).resolves.toBe(true)
    await expect(saveAdminLimits(client, {
      limits: {
        freeMaxGroups: 3,
        freeMaxMembers: 8,
        premiumMaxGroups: null,
        premiumMaxMembers: 25,
        parseFree: 20,
        ocrFree: 5,
        insightFree: 5,
        debtCooldownHours: 12,
        redeemDurationDays: 30,
        redeemMaxUses: 1,
      },
      reason: 'Adjust launch limits',
    })).resolves.toBe(true)
    await expect(saveAdminMaintenance(client, {
      maintenance: {
        enabled: true,
        title: 'Bảo trì hệ thống',
        message: 'Splitz đang bảo trì.',
        severity: 'info',
        startsAt: null,
        endsAt: null,
      },
      reason: 'Maintenance banner',
    })).resolves.toBe(true)

    expect(calls).toEqual([
      { name: 'admin-config', options: { body: { action: 'snapshot' } } },
      { name: 'admin-config', options: { body: { action: 'save_flags', flags: { payments: false }, reason: 'PayOS incident' } } },
      {
        name: 'admin-config',
        options: {
          body: {
            action: 'save_limits',
            limits: {
              free_max_groups: 3,
              free_max_members: 8,
              premium_max_groups: null,
              premium_max_members: 25,
              parse_free: 20,
              ocr_free: 5,
              insight_free: 5,
              debt_cooldown_hours: 12,
              redeem_duration_days: 30,
              redeem_max_uses: 1,
            },
            reason: 'Adjust launch limits',
          },
        },
      },
      {
        name: 'admin-config',
        options: {
          body: {
            action: 'save_maintenance',
            maintenance: {
              enabled: true,
              title: 'Bảo trì hệ thống',
              message: 'Splitz đang bảo trì.',
              severity: 'info',
              starts_at: null,
              ends_at: null,
            },
            reason: 'Maintenance banner',
          },
        },
      },
    ])
  })
})
