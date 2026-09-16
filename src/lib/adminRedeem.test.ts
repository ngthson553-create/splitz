import { describe, expect, it } from 'vitest'
import {
  createAdminRedeemBatch,
  createAdminRedeemCode,
  listAdminRedeemCodes,
  lookupAdminRedeemCode,
  revokeAdminRedeemCode,
  type AdminRedeemCode,
} from './adminRedeem'

function redeemRow(overrides: Partial<AdminRedeemCode> = {}): AdminRedeemCode {
  return {
    code: 'SPLITZ30',
    plan: 'personal',
    durationDays: 30,
    maxUses: 1,
    usedCount: 0,
    status: 'active',
    expiresAt: '2026-07-10T00:00:00.000Z',
    createdAt: '2026-06-10T07:00:00.000Z',
    internalNote: 'launch batch',
    batchId: 'batch-1',
    batchPrefix: 'SPLITZ',
    uses: [],
    ...overrides,
  }
}

describe('admin redeem client', () => {
  it('creates a single redeem code through the guarded RPC', async () => {
    const calls: unknown[] = []
    const client = {
      rpc: async (name: string, params: unknown) => {
        calls.push({ name, params })
        return { data: 'SPLITZ30', error: null }
      },
    }

    await expect(
      createAdminRedeemCode(client, {
        code: ' splitz30 ',
        plan: 'personal',
        durationDays: 30,
        maxUses: 1,
        expiresAt: '2026-07-10T00:00:00.000Z',
        internalNote: 'launch batch',
      }),
    ).resolves.toBe('SPLITZ30')
    expect(calls).toEqual([
      {
        name: 'admin_create_redeem_code',
        params: {
          p_code: 'SPLITZ30',
          p_plan: 'personal',
          p_duration_days: 30,
          p_max_uses: 1,
          p_expires_at: '2026-07-10T00:00:00.000Z',
          p_internal_note: 'launch batch',
        },
      },
    ])
  })

  it('creates a batch and normalizes returned codes', async () => {
    const client = {
      rpc: async () => ({
        data: [
          { batch_id: 'batch-1', code: 'SPLITZ-A1' },
          { batch_id: 'batch-1', code: 'SPLITZ-A2' },
        ],
        error: null,
      }),
    }

    await expect(
      createAdminRedeemBatch(client, {
        prefix: 'splitz',
        count: 2,
        plan: 'team',
        durationDays: 90,
        maxUses: 3,
        expiresAt: null,
        internalNote: '',
      }),
    ).resolves.toEqual({ batchId: 'batch-1', codes: ['SPLITZ-A1', 'SPLITZ-A2'] })
  })

  it('lists and looks up redeem codes with usage history', async () => {
    const client = {
      rpc: async (name: string) => {
        if (name === 'admin_lookup_redeem_code') {
          return {
            data: [
              {
                code: 'SPLITZ30',
                plan: 'personal',
                duration_days: 30,
                max_uses: 1,
                used_count: 1,
                status: 'exhausted',
                expires_at: '2026-07-10T00:00:00.000Z',
                created_at: '2026-06-10T07:00:00.000Z',
                internal_note: 'launch batch',
                batch_id: 'batch-1',
                batch_prefix: 'SPLITZ',
                uses: [{ id: 'use-1', used_by: 'user-1', used_email: 'a@example.com', used_at: '2026-06-10T08:00:00.000Z' }],
              },
            ],
            error: null,
          }
        }
        return {
          data: [
            {
              code: 'SPLITZ30',
              plan: 'personal',
              duration_days: 30,
              max_uses: 1,
              used_count: 0,
              status: 'active',
              expires_at: '2026-07-10T00:00:00.000Z',
              created_at: '2026-06-10T07:00:00.000Z',
              internal_note: 'launch batch',
              batch_id: 'batch-1',
              batch_prefix: 'SPLITZ',
              uses: [],
            },
          ],
          error: null,
        }
      },
    }

    await expect(listAdminRedeemCodes(client, { search: 'splitz', status: 'active', limit: 20 })).resolves.toEqual([
      redeemRow(),
    ])
    await expect(lookupAdminRedeemCode(client, 'splitz30')).resolves.toEqual(
      redeemRow({
        usedCount: 1,
        status: 'exhausted',
        uses: [{ id: 'use-1', usedBy: 'user-1', usedEmail: 'a@example.com', usedAt: '2026-06-10T08:00:00.000Z' }],
      }),
    )
  })

  it('revokes a code and hides RPC failures behind null results', async () => {
    const calls: unknown[] = []
    const client = {
      rpc: async (name: string, params: unknown) => {
        calls.push({ name, params })
        return { data: 'SPLITZ30', error: null }
      },
    }

    await expect(revokeAdminRedeemCode(client, ' splitz30 ', 'campaign ended')).resolves.toBe('SPLITZ30')
    expect(calls).toEqual([
      {
        name: 'admin_revoke_redeem_code',
        params: { p_code: 'SPLITZ30', p_reason: 'campaign ended' },
      },
    ])

    await expect(listAdminRedeemCodes(null)).resolves.toEqual([])
    await expect(lookupAdminRedeemCode({ rpc: async () => ({ data: null, error: new Error('forbidden') }) }, 'X')).resolves.toBeNull()
  })
})
