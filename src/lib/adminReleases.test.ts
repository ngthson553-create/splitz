import { describe, expect, it } from 'vitest'
import {
  cancelAdminRelease,
  loadAdminReleasesSnapshot,
  publishAdminRelease,
  saveAdminReleaseDraft,
} from './adminReleases'

describe('admin releases client', () => {
  it('loads release notes and sends draft/publish/cancel actions through admin-releases', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: { body: Record<string, unknown> }) => {
          calls.push({ name, options })
          if (options.body.action === 'snapshot') {
            return {
              data: {
                checked_at: '2026-06-10T17:20:00.000Z',
                summary: { total: 2, draft: 1, published: 1, cancelled: 0 },
                releases: [
                  {
                    id: 'release-1',
                    version: '1.2.0',
                    title: 'Splitz 1.2.0',
                    body: 'Có dashboard vận hành mới.',
                    status: 'published',
                    audience: 'all',
                    href: '/notifications',
                    notification_id: 'notification-1',
                    published_at: '2026-06-10T17:00:00.000Z',
                    created_at: '2026-06-10T16:00:00.000Z',
                    updated_at: '2026-06-10T17:00:00.000Z',
                  },
                ],
                recent_changes: [
                  { id: 'audit-1', action: 'release.publish', actor_email: 'owner@example.com', created_at: '2026-06-10T17:00:01.000Z' },
                ],
              },
              error: null,
            }
          }
          if (options.body.action === 'publish') {
            return {
              data: {
                release_id: 'release-1',
                notification_id: 'notification-1',
                target_count: 12,
                in_app_sent: 12,
              },
              error: null,
            }
          }
          if (options.body.action === 'save_draft') return { data: { release_id: 'release-2' }, error: null }
          if (options.body.action === 'cancel') return { data: { release_id: 'release-2', cancelled: true }, error: null }
          return { data: null, error: new Error('bad action') }
        },
      },
    }

    await expect(loadAdminReleasesSnapshot(client)).resolves.toEqual({
      checkedAt: '2026-06-10T17:20:00.000Z',
      summary: { total: 2, draft: 1, published: 1, cancelled: 0 },
      releases: [
        {
          id: 'release-1',
          version: '1.2.0',
          title: 'Splitz 1.2.0',
          body: 'Có dashboard vận hành mới.',
          status: 'published',
          audience: 'all',
          href: '/notifications',
          notificationId: 'notification-1',
          publishedAt: '2026-06-10T17:00:00.000Z',
          createdAt: '2026-06-10T16:00:00.000Z',
          updatedAt: '2026-06-10T17:00:00.000Z',
        },
      ],
      recentChanges: [
        { id: 'audit-1', action: 'release.publish', actorEmail: 'owner@example.com', createdAt: '2026-06-10T17:00:01.000Z' },
      ],
    })

    await expect(saveAdminReleaseDraft(client, {
      version: '1.3.0',
      title: 'Splitz 1.3.0',
      body: 'Tối ưu thông báo hệ thống.',
      audience: 'all',
      href: '/notifications',
      reason: 'Prepare release',
    })).resolves.toBe('release-2')
    await expect(publishAdminRelease(client, { releaseId: 'release-1', reason: 'Ship release' })).resolves.toEqual({
      releaseId: 'release-1',
      notificationId: 'notification-1',
      targetCount: 12,
      inAppSent: 12,
    })
    await expect(cancelAdminRelease(client, { releaseId: 'release-2', reason: 'Superseded' })).resolves.toBe(true)

    expect(calls).toEqual([
      { name: 'admin-releases', options: { body: { action: 'snapshot' } } },
      {
        name: 'admin-releases',
        options: {
          body: {
            action: 'save_draft',
            version: '1.3.0',
            title: 'Splitz 1.3.0',
            body: 'Tối ưu thông báo hệ thống.',
            audience: 'all',
            href: '/notifications',
            reason: 'Prepare release',
          },
        },
      },
      { name: 'admin-releases', options: { body: { action: 'publish', release_id: 'release-1', reason: 'Ship release' } } },
      { name: 'admin-releases', options: { body: { action: 'cancel', release_id: 'release-2', reason: 'Superseded' } } },
    ])
  })
})
