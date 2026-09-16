import { describe, expect, it } from 'vitest'
import { loadCurrentMaintenanceBanner } from './systemConfig'

describe('system config public client', () => {
  it('loads the active maintenance banner through the public RPC', async () => {
    const calls: unknown[] = []
    const client = {
      rpc: async (name: string) => {
        calls.push(name)
        return {
          data: {
            enabled: true,
            title: 'Bảo trì AI',
            message: 'AI tạm gián đoạn trong tối nay.',
            severity: 'warning',
            starts_at: '2026-06-10T22:00:00+07:00',
            ends_at: '2026-06-11T01:00:00+07:00',
          },
          error: null,
        }
      },
    }

    await expect(loadCurrentMaintenanceBanner(client)).resolves.toEqual({
      enabled: true,
      title: 'Bảo trì AI',
      message: 'AI tạm gián đoạn trong tối nay.',
      severity: 'warning',
      startsAt: '2026-06-10T22:00:00+07:00',
      endsAt: '2026-06-11T01:00:00+07:00',
    })
    expect(calls).toEqual(['current_maintenance_banner'])
  })

  it('returns null when the banner is inactive, unavailable, or malformed', async () => {
    await expect(loadCurrentMaintenanceBanner(null)).resolves.toBeNull()
    await expect(loadCurrentMaintenanceBanner({ rpc: async () => ({ data: { enabled: false }, error: null }) })).resolves.toBeNull()
    await expect(loadCurrentMaintenanceBanner({ rpc: async () => ({ data: { enabled: true, title: '' }, error: null }) })).resolves.toBeNull()
    await expect(loadCurrentMaintenanceBanner({ rpc: async () => ({ data: null, error: new Error('rpc failed') }) })).resolves.toBeNull()
  })
})
