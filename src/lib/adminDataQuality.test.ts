import { describe, expect, it } from 'vitest'
import { loadAdminDataQualitySnapshot } from './adminDataQuality'

describe('admin data quality client', () => {
  it('loads a normalized data quality snapshot through admin-data-quality', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: { body: Record<string, unknown> }) => {
          calls.push({ name, options })
          return {
            data: {
              scan_id: 'scan-1',
              checked_at: '2026-06-11T08:00:00.000Z',
              summary: {
                total_issues: 3,
                critical: 1,
                warning: 2,
                info: 0,
                scanners_run: 6,
              },
              issues: [
                {
                  id: 'issue-1',
                  scanner: 'expenses_missing_party',
                  severity: 'critical',
                  title: 'Expense thiếu payer',
                  detail: 'Khoản chi Dinner không có người trả.',
                  target_type: 'expense',
                  target_id: 'expense-1',
                  detected_at: '2026-06-11T08:00:00.000Z',
                  metadata: { group_id: 'group-1' },
                },
                {
                  id: 'issue-2',
                  scanner: 'push_failure_rate',
                  severity: 'warning',
                  title: 'Web push lỗi cao',
                  detail: 'Tỷ lệ lỗi web push 40%.',
                  target_type: 'notification_delivery',
                  target_id: 'web_push_30d',
                  detected_at: '2026-06-11T08:00:00.000Z',
                  metadata: { failed: 4, total: 10 },
                },
              ],
              recent_scans: [
                { id: 'scan-1', checked_at: '2026-06-11T08:00:00.000Z', total_issues: 3, critical: 1, warning: 2, info: 0 },
              ],
            },
            error: null,
          }
        },
      },
    }

    await expect(loadAdminDataQualitySnapshot(client)).resolves.toEqual({
      scanId: 'scan-1',
      checkedAt: '2026-06-11T08:00:00.000Z',
      summary: { totalIssues: 3, critical: 1, warning: 2, info: 0, scannersRun: 6 },
      issues: [
        {
          id: 'issue-1',
          scanner: 'expenses_missing_party',
          severity: 'critical',
          title: 'Expense thiếu payer',
          detail: 'Khoản chi Dinner không có người trả.',
          targetType: 'expense',
          targetId: 'expense-1',
          detectedAt: '2026-06-11T08:00:00.000Z',
          metadata: { group_id: 'group-1' },
        },
        {
          id: 'issue-2',
          scanner: 'push_failure_rate',
          severity: 'warning',
          title: 'Web push lỗi cao',
          detail: 'Tỷ lệ lỗi web push 40%.',
          targetType: 'notification_delivery',
          targetId: 'web_push_30d',
          detectedAt: '2026-06-11T08:00:00.000Z',
          metadata: { failed: 4, total: 10 },
        },
      ],
      recentScans: [
        { id: 'scan-1', checkedAt: '2026-06-11T08:00:00.000Z', totalIssues: 3, critical: 1, warning: 2, info: 0 },
      ],
    })
    expect(calls).toEqual([{ name: 'admin-data-quality', options: { body: { action: 'snapshot' } } }])
  })
})
