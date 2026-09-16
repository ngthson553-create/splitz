import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminRole = 'owner' | 'operator' | 'support' | 'readonly'

type AdminRpcClient = {
  rpc: (name: 'my_admin_role') => Promise<{ data: unknown; error: unknown }>
}

const ROLES = new Set<AdminRole>(['owner', 'operator', 'support', 'readonly'])

function normalizeRole(value: unknown): AdminRole | null {
  return typeof value === 'string' && ROLES.has(value as AdminRole) ? (value as AdminRole) : null
}

/**
 * Returns the current user's console role, or null for normal users/local demo.
 * The RPC enforces the real permission boundary server-side.
 */
export async function getMyAdminRole(client?: AdminRpcClient | null): Promise<AdminRole | null> {
  const rpcClient = client ?? (isSupabaseConfigured ? getSupabase() : null)
  if (!rpcClient) return null

  try {
    const { data, error } = await rpcClient.rpc('my_admin_role')
    if (error) return null
    return normalizeRole(data)
  } catch {
    return null
  }
}
