import { describe, expect, it } from 'vitest'
import { loadAdminEmailSnapshot, sendAdminTestEmail } from './adminEmail'

describe('admin email client', () => {
  it('loads and normalizes the guarded email snapshot', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: unknown) => {
          calls.push({ name, options })
          return {
            data: {
              checked_at: '2026-06-10T10:00:00.000Z',
              summary_status: 'configured',
              default_to_email: 'owner@example.com',
              provider: {
                status: 'configured',
                from: 'Splitz <noreply@example.com>',
                reply_to: 'support@example.com',
                detail: 'RESEND_API_KEY configured',
              },
              metrics: [
                { id: 'sent_7d', label: 'Đã gửi 7 ngày', value: 12, detail: 'Resend' },
              ],
              templates: [
                {
                  key: 'premium_reminder',
                  name: 'Premium reminder',
                  category: 'reminder',
                  subject: 'Gói Splitz Premium của bạn sắp hết hạn',
                  description: 'Nhắc gia hạn premium',
                  active: true,
                  updated_at: '2026-06-10T09:30:00.000Z',
                },
              ],
              logs: [
                {
                  id: 'log-1',
                  template_key: 'system_test',
                  to_email: 'owner@example.com',
                  from_email: 'Splitz <noreply@example.com>',
                  subject: 'Test Splitz',
                  status: 'sent',
                  provider: 'resend',
                  provider_message_id: 'email-123',
                  error_message: null,
                  sent_at: '2026-06-10T09:40:00.000Z',
                  created_at: '2026-06-10T09:39:00.000Z',
                },
              ],
              recent_errors: [
                {
                  id: 'err-1',
                  source: 'email_delivery_logs',
                  action: 'system_test',
                  message: 'resend_400',
                  created_at: '2026-06-10T09:45:00.000Z',
                },
              ],
            },
            error: null,
          }
        },
      },
    }

    await expect(loadAdminEmailSnapshot(client)).resolves.toEqual({
      checkedAt: '2026-06-10T10:00:00.000Z',
      summaryStatus: 'configured',
      defaultToEmail: 'owner@example.com',
      provider: {
        status: 'configured',
        from: 'Splitz <noreply@example.com>',
        replyTo: 'support@example.com',
        detail: 'RESEND_API_KEY configured',
      },
      metrics: [
        { id: 'sent_7d', label: 'Đã gửi 7 ngày', value: 12, detail: 'Resend' },
      ],
      templates: [
        {
          key: 'premium_reminder',
          name: 'Premium reminder',
          category: 'reminder',
          subject: 'Gói Splitz Premium của bạn sắp hết hạn',
          description: 'Nhắc gia hạn premium',
          active: true,
          updatedAt: '2026-06-10T09:30:00.000Z',
        },
      ],
      logs: [
        {
          id: 'log-1',
          templateKey: 'system_test',
          toEmail: 'owner@example.com',
          fromEmail: 'Splitz <noreply@example.com>',
          subject: 'Test Splitz',
          status: 'sent',
          provider: 'resend',
          providerMessageId: 'email-123',
          errorMessage: null,
          sentAt: '2026-06-10T09:40:00.000Z',
          createdAt: '2026-06-10T09:39:00.000Z',
        },
      ],
      recentErrors: [
        {
          id: 'err-1',
          source: 'email_delivery_logs',
          action: 'system_test',
          message: 'resend_400',
          createdAt: '2026-06-10T09:45:00.000Z',
        },
      ],
    })

    expect(calls).toEqual([
      { name: 'admin-email', options: { body: { action: 'snapshot', limit: 50 } } },
    ])
  })

  it('sends a test email through the guarded Edge Function', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: unknown) => {
          calls.push({ name, options })
          return {
            data: {
              log_id: 'log-1',
              status: 'sent',
              provider_message_id: 'email-123',
            },
            error: null,
          }
        },
      },
    }

    await expect(
      sendAdminTestEmail(client, {
        toEmail: 'owner@example.com',
        templateKey: 'system_test',
        subject: 'Test Splitz',
        message: 'Kiểm tra Resend production.',
      }),
    ).resolves.toEqual({ logId: 'log-1', status: 'sent', providerMessageId: 'email-123' })

    expect(calls).toEqual([
      {
        name: 'admin-email',
        options: {
          body: {
            action: 'send_test',
            to_email: 'owner@example.com',
            template_key: 'system_test',
            subject: 'Test Splitz',
            message: 'Kiểm tra Resend production.',
          },
        },
      },
    ])
  })
})
