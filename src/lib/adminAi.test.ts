import { describe, expect, it } from 'vitest'
import {
  loadAdminAiSnapshot,
  resetAdminAiQuota,
  saveAdminAiConfig,
  testAdminAiInsight,
  testAdminAiOcr,
  testAdminAiParse,
} from './adminAi'

describe('admin ai client', () => {
  it('loads and normalizes the guarded AI snapshot', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: unknown) => {
          calls.push({ name, options })
          return {
            data: {
              checked_at: '2026-06-10T10:00:00.000Z',
              summary_status: 'configured',
              provider: {
                active: 'deepseek',
                fallback: 'gemini',
                gemini_model: 'gemini-2.0-flash',
                deepseek_model: 'deepseek-v4-flash',
                status: 'configured',
                detail: 'Active deepseek / fallback gemini',
              },
              flags: [
                {
                  key: 'ai_parse_expense',
                  label: 'Nhập chi tự nhiên',
                  enabled: false,
                  description: 'Tắt parse expense',
                  updated_at: '2026-06-10T09:30:00.000Z',
                },
              ],
              quotas: [
                {
                  feature: 'parse_expense',
                  label: 'Nhập chi tự nhiên',
                  free_limit: 15,
                  total_count: 31,
                  user_count: 12,
                  remaining: 0,
                },
              ],
              prompts: [
                {
                  prompt_key: 'parse_expense',
                  version: 2,
                  title: 'Parse v2',
                  prompt: 'prompt text',
                  active: true,
                  updated_at: '2026-06-10T09:00:00.000Z',
                },
              ],
              usage_summary: [
                {
                  feature: 'parse_expense',
                  label: 'Nhập chi tự nhiên',
                  period: '2026-06',
                  total_count: 19,
                  user_count: 5,
                  top_users: [
                    {
                      user_id: 'user-1',
                      user_email: 'a@example.com',
                      display_name: 'An',
                      count: 11,
                    },
                  ],
                },
              ],
              usage_rows: [
                {
                  user_id: 'user-1',
                  user_email: 'a@example.com',
                  display_name: 'An',
                  feature: 'parse_expense',
                  period: '2026-06',
                  count: 11,
                  updated_at: '2026-06-10T09:10:00.000Z',
                },
              ],
              recent_errors: [
                {
                  id: 'err-1',
                  source: 'admin_audit_logs',
                  action: 'ai.config.save',
                  message: 'timeout',
                  created_at: '2026-06-10T09:40:00.000Z',
                },
              ],
            },
            error: null,
          }
        },
      },
    }

    await expect(loadAdminAiSnapshot(client, { period: '2026-06', feature: 'all' })).resolves.toEqual({
      checkedAt: '2026-06-10T10:00:00.000Z',
      summaryStatus: 'configured',
      provider: {
        active: 'deepseek',
        fallback: 'gemini',
        geminiModel: 'gemini-2.0-flash',
        deepseekModel: 'deepseek-v4-flash',
        status: 'configured',
        detail: 'Active deepseek / fallback gemini',
      },
      flags: [
        {
          key: 'ai_parse_expense',
          label: 'Nhập chi tự nhiên',
          enabled: false,
          description: 'Tắt parse expense',
          updatedAt: '2026-06-10T09:30:00.000Z',
        },
      ],
      quotas: [
        {
          feature: 'parse_expense',
          label: 'Nhập chi tự nhiên',
          freeLimit: 15,
          totalCount: 31,
          userCount: 12,
          remaining: 0,
        },
      ],
      prompts: [
        {
          promptKey: 'parse_expense',
          version: 2,
          title: 'Parse v2',
          prompt: 'prompt text',
          active: true,
          updatedAt: '2026-06-10T09:00:00.000Z',
        },
      ],
      usageSummary: [
        {
          feature: 'parse_expense',
          label: 'Nhập chi tự nhiên',
          period: '2026-06',
          totalCount: 19,
          userCount: 5,
          topUsers: [
            {
              userId: 'user-1',
              userEmail: 'a@example.com',
              displayName: 'An',
              count: 11,
            },
          ],
        },
      ],
      usageRows: [
        {
          userId: 'user-1',
          userEmail: 'a@example.com',
          displayName: 'An',
          feature: 'parse_expense',
          period: '2026-06',
          count: 11,
          updatedAt: '2026-06-10T09:10:00.000Z',
        },
      ],
      recentErrors: [
        {
          id: 'err-1',
          source: 'admin_audit_logs',
          action: 'ai.config.save',
          message: 'timeout',
          createdAt: '2026-06-10T09:40:00.000Z',
        },
      ],
    })

    expect(calls).toEqual([
      {
        name: 'admin-ai',
        options: { body: { action: 'snapshot', period: '2026-06', feature: 'all' } },
      },
    ])
  })

  it('sends save, test, and reset actions through the guarded Edge Function', async () => {
    const calls: unknown[] = []
    const client = {
      functions: {
        invoke: async (name: string, options: unknown) => {
          calls.push({ name, options })
          if (calls.length === 1) {
            return { data: { saved: true }, error: null }
          }
          if (calls.length === 2) {
            return { data: { parsed: { title: 'Cafe', amount: 50000 } }, error: null }
          }
          if (calls.length === 3) {
            return { data: { items: [{ title: 'Bánh mì', amount: 25000 }] }, error: null }
          }
          if (calls.length === 4) {
            return { data: { insight: { headline: 'Chi tiêu ổn', points: ['Giữ nhịp hiện tại'] } }, error: null }
          }
          return { data: { reset: 1 }, error: null }
        },
      },
    }

    await expect(
      saveAdminAiConfig(client, {
        provider: { active: 'deepseek', fallback: 'gemini', geminiModel: 'gemini-2.0-flash', deepseekModel: 'deepseek-v4-flash' },
        flags: { parseExpense: false, ocrReceipt: true, insight: true },
        quotas: { parseFree: 12, ocrFree: 2, insightFree: 4 },
        prompts: {
          parseExpense: 'parse prompt',
          ocrReceipt: 'ocr prompt',
          insight: 'insight prompt',
        },
      }),
    ).resolves.toEqual({ saved: true })

    await expect(
      testAdminAiParse(client, { text: 'Cafe 50k', memberNames: ['An', 'Bình'] }),
    ).resolves.toEqual({ parsed: { title: 'Cafe', amount: 50000 } })

    await expect(
      testAdminAiOcr(client, { imageBase64: 'abc123', mimeType: 'image/jpeg' }),
    ).resolves.toEqual({ items: [{ title: 'Bánh mì', amount: 25000 }] })

    await expect(
      testAdminAiInsight(client, { stats: { totalSpent: 123000 } }),
    ).resolves.toEqual({ insight: { headline: 'Chi tiêu ổn', points: ['Giữ nhịp hiện tại'] } })

    await expect(
      resetAdminAiQuota(client, { userEmail: 'a@example.com', feature: 'parse_expense', period: '2026-06' }),
    ).resolves.toEqual({ reset: 1 })

    expect(calls).toEqual([
      {
        name: 'admin-ai',
        options: {
          body: {
            action: 'save_config',
            provider: { active: 'deepseek', fallback: 'gemini', gemini_model: 'gemini-2.0-flash', deepseek_model: 'deepseek-v4-flash' },
            flags: { parse_expense: false, ocr_receipt: true, insight: true },
            quotas: { parse_free: 12, ocr_free: 2, insight_free: 4 },
            prompts: {
              parse_expense: 'parse prompt',
              ocr_receipt: 'ocr prompt',
              insight: 'insight prompt',
            },
          },
        },
      },
      {
        name: 'admin-ai',
        options: {
          body: {
            action: 'test_parse',
            text: 'Cafe 50k',
            member_names: ['An', 'Bình'],
          },
        },
      },
      {
        name: 'admin-ai',
        options: {
          body: {
            action: 'test_ocr',
            image_base64: 'abc123',
            mime_type: 'image/jpeg',
          },
        },
      },
      {
        name: 'admin-ai',
        options: {
          body: {
            action: 'test_insight',
            stats: { totalSpent: 123000 },
          },
        },
      },
      {
        name: 'admin-ai',
        options: {
          body: {
            action: 'reset_quota',
            user_email: 'a@example.com',
            feature: 'parse_expense',
            period: '2026-06',
          },
        },
      },
    ])
  })

  it('returns null when config is missing, errors, or malformed', async () => {
    await expect(loadAdminAiSnapshot(null)).resolves.toBeNull()
    await expect(
      loadAdminAiSnapshot({ functions: { invoke: async () => ({ data: null, error: new Error('forbidden') }) } }),
    ).resolves.toBeNull()
    await expect(
      loadAdminAiSnapshot({ functions: { invoke: async () => ({ data: { checked_at: 123 }, error: null }) } }),
    ).resolves.toBeNull()
  })
})
