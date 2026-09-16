import { describe, expect, it } from 'vitest'
import { getMyAdminRole, type AdminRole } from './admin'

function clientWithRole(role: AdminRole | null) {
  return {
    rpc: async (name: string) => {
      expect(name).toBe('my_admin_role')
      return { data: role, error: null }
    },
  }
}

describe('getMyAdminRole', () => {
  it('returns the active admin role from the guarded RPC', async () => {
    await expect(getMyAdminRole(clientWithRole('owner'))).resolves.toBe('owner')
  })

  it('treats missing Supabase config, null role, or RPC failure as non-admin', async () => {
    await expect(getMyAdminRole(null)).resolves.toBeNull()
    await expect(getMyAdminRole(clientWithRole(null))).resolves.toBeNull()
    await expect(
      getMyAdminRole({ rpc: async () => ({ data: null, error: new Error('forbidden') }) }),
    ).resolves.toBeNull()
  })
})
