import { describe, expect, it } from 'vitest'
import { listAdminAuditLogs, writeAdminAuditLog, type AdminAuditLog } from './adminAudit'

function auditRow(overrides: Partial<AdminAuditLog> = {}) {
  return {
    id: 'log-1',
    actorUserId: 'user-1',
    actorEmail: 'owner@example.com',
    actorRole: 'owner',
    action: 'redeem.create',
    targetType: 'redemption_code',
    targetId: 'SPLITZ30',
    payloadSummary: { code: 'SPLITZ30', token: '[redacted]' },
    status: 'success',
    errorMessage: null,
    createdAt: '2026-06-10T07:00:00.000Z',
    ...overrides,
  }
}

describe('admin audit client', () => {
  it('lists normalized audit logs through the guarded RPC', async () => {
    const calls: unknown[] = []
    const client = {
      rpc: async (name: string, params: unknown) => {
        calls.push({ name, params })
        return {
          data: [
            {
              id: 'log-1',
              actor_user_id: 'user-1',
              actor_email: 'owner@example.com',
              actor_role: 'owner',
              action: 'redeem.create',
              target_type: 'redemption_code',
              target_id: 'SPLITZ30',
              payload_summary: { code: 'SPLITZ30' },
              status: 'success',
              error_message: null,
              created_at: '2026-06-10T07:00:00.000Z',
            },
          ],
          error: null,
        }
      },
    }

    await expect(listAdminAuditLogs(client, { status: 'success', action: 'redeem', limit: 25 })).resolves.toEqual([
      auditRow({ payloadSummary: { code: 'SPLITZ30' } }),
    ])
    expect(calls).toEqual([
      {
        name: 'admin_list_audit_logs',
        params: { p_status: 'success', p_action: 'redeem', p_limit: 25 },
      },
    ])
  })

  it('treats missing config, RPC errors, and malformed rows as an empty audit list', async () => {
    await expect(listAdminAuditLogs(null)).resolves.toEqual([])
    await expect(listAdminAuditLogs({ rpc: async () => ({ data: null, error: new Error('forbidden') }) })).resolves.toEqual([])
    await expect(
      listAdminAuditLogs({ rpc: async () => ({ data: [{ id: 'bad', status: 'weird' }], error: null }) }),
    ).resolves.toEqual([])
  })

  it('writes audit entries through the guarded RPC', async () => {
    const calls: unknown[] = []
    const client = {
      rpc: async (name: string, params: unknown) => {
        calls.push({ name, params })
        return { data: 'audit-id-1', error: null }
      },
    }

    await expect(
      writeAdminAuditLog(client, {
        action: 'health.check',
        targetType: 'system',
        targetId: 'providers',
        payloadSummary: { provider: 'resend', configured: true },
        status: 'success',
      }),
    ).resolves.toBe('audit-id-1')
    expect(calls).toEqual([
      {
        name: 'admin_write_audit_log',
        params: {
          p_action: 'health.check',
          p_target_type: 'system',
          p_target_id: 'providers',
          p_payload_summary: { provider: 'resend', configured: true },
          p_status: 'success',
          p_error_message: null,
        },
      },
    ])
  })
})
