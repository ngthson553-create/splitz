import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
  settlementSelects: [] as string[],
  settlementMode: 'legacy-columns' as 'legacy-columns' | 'unexpected-failure' | 'ok',
  client: {
    from(table: string) {
      return {
        select(columns: string) {
          const query = {
            table,
            columns,
            then(resolve: (value: unknown) => unknown) {
              resolve(handleQuery(table, columns))
            },
            in() {
              return query
            },
            order() {
              return query
            },
            neq() {
              return query
            },
          }
          return query
        },
      }
    },
  },
}))

function handleQuery(table: string, columns: string) {
  if (table === 'groups') {
    return {
      data: [
        {
          id: 'group-1',
          owner_id: 'user-1',
          name: 'Nhóm cũ',
          emoji: '💸',
          base_currency: 'VND',
          settlement_method: 'smart_settle',
          created_at: '2026-06-10T08:00:00.000Z',
          updated_at: '2026-06-12T08:00:00.000Z',
        },
      ],
      error: null,
    }
  }

  if (table === 'group_members') {
    return {
      data: [
        {
          id: 'member-1',
          group_id: 'group-1',
          user_id: 'user-1',
          name: 'Sơn',
          color: 'sky',
          role: 'owner',
          bank_code: null,
          bank_account_number: null,
          bank_account_name: null,
        },
        {
          id: 'member-2',
          group_id: 'group-1',
          user_id: 'user-2',
          name: 'Anh',
          color: 'amber',
          role: 'member',
          bank_code: null,
          bank_account_number: null,
          bank_account_name: null,
        },
      ],
      error: null,
    }
  }

  if (table === 'profiles') {
    return { data: [], error: null }
  }

  if (table === 'expenses') {
    return { data: [], error: null }
  }

  if (table === 'settlements') {
    mockState.settlementSelects.push(columns)
    if (mockState.settlementMode === 'unexpected-failure') {
      return {
        data: null,
        error: {
          message: 'network request failed while loading settlements',
        },
      }
    }

    if (mockState.settlementMode === 'legacy-columns' && columns.includes('payment_method')) {
      return {
        data: null,
        error: {
          message: "Could not find the 'payment_method' column of 'settlements' in the schema cache",
        },
      }
    }

    return {
      data: [
        {
          id: 'stl-1',
          group_id: 'group-1',
          from_member_id: 'member-2',
          to_member_id: 'member-1',
          amount: 50000,
          status: 'pending',
          created_at: '2026-06-12T09:00:00.000Z',
          confirmed_at: null,
        },
      ],
      error: null,
    }
  }

  throw new Error(`Unexpected query: ${table} -> ${columns}`)
}

vi.mock('../supabase/client', () => ({
  getSupabase: () => mockState.client,
}))

import { SupabaseGroupRepository } from './supabase'

describe('SupabaseGroupRepository', () => {
  beforeEach(() => {
    mockState.settlementSelects.length = 0
    mockState.settlementMode = 'legacy-columns'
  })

  it('still loads existing groups when the production settlements table is missing new proof columns', async () => {
    const repo = new SupabaseGroupRepository()

    const groups = await repo.list()

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      id: 'group-1',
      name: 'Nhóm cũ',
      settlements: [
        {
          id: 'stl-1',
          paymentMethod: 'bank_transfer',
          proofStoragePath: undefined,
        },
      ],
    })
    expect(mockState.settlementSelects).toEqual([
      'id,group_id,from_member_id,to_member_id,amount,status,payment_method,created_at,confirmed_at,proof_storage_path,proof_mime_type,proof_file_name,proof_size_bytes',
      'id,group_id,from_member_id,to_member_id,amount,status,created_at,confirmed_at',
    ])
  })

  it('still loads groups when settlements fail for a non-schema reason', async () => {
    mockState.settlementMode = 'unexpected-failure'
    const repo = new SupabaseGroupRepository()

    const groups = await repo.list()

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      id: 'group-1',
      name: 'Nhóm cũ',
      settlements: [],
    })
    expect(mockState.settlementSelects).toEqual([
      'id,group_id,from_member_id,to_member_id,amount,status,payment_method,created_at,confirmed_at,proof_storage_path,proof_mime_type,proof_file_name,proof_size_bytes',
    ])
  })
})
