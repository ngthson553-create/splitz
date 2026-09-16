import { describe, expect, it } from 'vitest'
import {
  listSystemNotifications,
  markAllSystemNotificationsRead,
  markSystemNotificationRead,
} from './systemNotifications'

describe('system notifications client', () => {
  it('normalizes remote in-app deliveries for the system tab', async () => {
    const client = {
      rpc: async () => ({
        data: [
          {
            id: 'delivery-1',
            title: 'Cập nhật Splitz',
            body: 'Tính năng redeem đã sẵn sàng.',
            href: '/notifications',
            read_at: null,
            sent_at: '2026-06-10T08:00:00.000Z',
          },
        ],
        error: null,
      }),
    }

    await expect(listSystemNotifications(client)).resolves.toEqual([
      {
        id: 'sys:delivery-1',
        kind: 'system',
        title: 'Cập nhật Splitz',
        body: 'Tính năng redeem đã sẵn sàng.',
        href: '/notifications',
        createdAt: '2026-06-10T08:00:00.000Z',
        read: false,
      },
    ])
  })

  it('marks one or all remote notifications as read through RPC', async () => {
    const calls: unknown[] = []
    const client = {
      rpc: async (name: string, params: unknown) => {
        calls.push({ name, params })
        return { data: name === 'mark_all_my_system_notifications_read' ? 3 : 'delivery-1', error: null }
      },
    }

    await expect(markSystemNotificationRead(client, 'sys:delivery-1')).resolves.toBe(true)
    await expect(markAllSystemNotificationsRead(client)).resolves.toBe(true)
    expect(calls).toEqual([
      { name: 'mark_my_system_notification_read', params: { p_delivery_id: 'delivery-1' } },
      { name: 'mark_all_my_system_notifications_read', params: undefined },
    ])
  })
})
