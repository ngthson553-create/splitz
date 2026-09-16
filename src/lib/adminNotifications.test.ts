import { describe, expect, it } from 'vitest'
import {
  listAdminNotificationDeliveries,
  listAdminNotifications,
  previewAdminNotificationTarget,
  sendAdminNotificationNow,
} from './adminNotifications'

describe('admin notifications client', () => {
  it('previews targets through the guarded Edge Function', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: unknown) => {
          calls.push({ name, options })
          return { data: { target_count: 12, push_subscriber_count: 7 }, error: null }
        },
      },
      rpc: async () => ({ data: null, error: null }),
    }

    await expect(
      previewAdminNotificationTarget(client, {
        targetType: 'premium',
        targetValue: '  ',
        channels: { inApp: true, webPush: true },
      }),
    ).resolves.toEqual({ targetCount: 12, pushSubscriberCount: 7 })

    expect(calls).toEqual([
      {
        name: 'admin-notifications',
        options: {
          body: {
            action: 'preview',
            target_type: 'premium',
            target_value: null,
            channels: { in_app: true, web_push: true },
          },
        },
      },
    ])
  })

  it('sends now and normalizes campaign and delivery logs', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: unknown) => {
          calls.push({ name, options })
          return {
            data: {
              notification_id: 'ntf-1',
              job_id: 'job-1',
              target_count: 2,
              in_app_sent: 2,
              push_sent: 1,
              push_failed: 1,
            },
            error: null,
          }
        },
      },
      rpc: async (name: string) => {
        if (name === 'admin_list_notification_deliveries') {
          return {
            data: [
              {
                id: 'delivery-1',
                notification_id: 'ntf-1',
                user_id: 'user-1',
                user_email: 'a@example.com',
                channel: 'in_app',
                status: 'sent',
                error_message: null,
                sent_at: '2026-06-10T08:00:00.000Z',
                read_at: null,
                created_at: '2026-06-10T08:00:00.000Z',
              },
            ],
            error: null,
          }
        }
        return {
          data: [
            {
              id: 'ntf-1',
              title: 'Bảo trì hệ thống',
              body: 'Splitz bảo trì lúc 22:00.',
              href: '/notifications',
              target_type: 'all',
              target_value: null,
              status: 'sent',
              channel_in_app: true,
              channel_web_push: true,
              target_count: 2,
              in_app_sent: 2,
              push_sent: 1,
              push_failed: 1,
              created_at: '2026-06-10T08:00:00.000Z',
              sent_at: '2026-06-10T08:00:01.000Z',
            },
          ],
          error: null,
        }
      },
    }

    await expect(
      sendAdminNotificationNow(client, {
        title: '  Bảo trì hệ thống  ',
        body: ' Splitz bảo trì lúc 22:00. ',
        href: ' /notifications ',
        targetType: 'all',
        targetValue: null,
        channels: { inApp: true, webPush: true },
      }),
    ).resolves.toEqual({
      notificationId: 'ntf-1',
      jobId: 'job-1',
      targetCount: 2,
      inAppSent: 2,
      pushSent: 1,
      pushFailed: 1,
    })

    await expect(listAdminNotifications(client)).resolves.toEqual([
      {
        id: 'ntf-1',
        title: 'Bảo trì hệ thống',
        body: 'Splitz bảo trì lúc 22:00.',
        href: '/notifications',
        targetType: 'all',
        targetValue: null,
        status: 'sent',
        channelInApp: true,
        channelWebPush: true,
        targetCount: 2,
        inAppSent: 2,
        pushSent: 1,
        pushFailed: 1,
        createdAt: '2026-06-10T08:00:00.000Z',
        sentAt: '2026-06-10T08:00:01.000Z',
      },
    ])
    await expect(listAdminNotificationDeliveries(client, 'ntf-1')).resolves.toEqual([
      {
        id: 'delivery-1',
        notificationId: 'ntf-1',
        userId: 'user-1',
        userEmail: 'a@example.com',
        channel: 'in_app',
        status: 'sent',
        errorMessage: null,
        sentAt: '2026-06-10T08:00:00.000Z',
        readAt: null,
        createdAt: '2026-06-10T08:00:00.000Z',
      },
    ])
    expect(calls[0]).toEqual({
      name: 'admin-notifications',
      options: {
        body: {
          action: 'send_now',
          title: 'Bảo trì hệ thống',
          body: 'Splitz bảo trì lúc 22:00.',
          href: '/notifications',
          target_type: 'all',
          target_value: null,
          channels: { in_app: true, web_push: true },
        },
      },
    })
  })
})
