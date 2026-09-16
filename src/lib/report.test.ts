import { describe, expect, it } from 'vitest'
import type { Group } from './types'
import { buildGroupReportHtml, type ReportAttachmentMap } from './report'

const group: Group = {
  id: 'g1',
  name: 'Đà Lạt',
  emoji: '✈️',
  createdAt: '',
  updatedAt: '',
  settlementMethod: 'smart_settle',
  members: [
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Bình' },
  ],
  expenses: [
    {
      id: 'e1',
      groupId: 'g1',
      title: 'Khách sạn',
      amount: 1_000_000,
      paidAt: '2026-06-09T10:00:00.000Z',
      splitMode: 'equal',
      payers: [{ memberId: 'a', amount: 1_000_000 }],
      participants: [{ memberId: 'a' }, { memberId: 'b' }],
    },
  ],
}

describe('buildGroupReportHtml', () => {
  it('nhúng ảnh chứng từ và liệt kê file PDF theo khoản chi', () => {
    const attachments: ReportAttachmentMap = new Map([
      [
        'e1',
        [
          { name: 'hoa-don.jpg', isImage: true, url: 'https://example.test/receipt.jpg' },
          { name: 'invoice.pdf', isImage: false, url: 'https://example.test/invoice.pdf' },
        ],
      ],
    ])

    const html = buildGroupReportHtml(group, attachments, '2026-06-09T12:00:00.000Z')

    expect(html).toContain('Chứng từ')
    expect(html).toContain('<img src="https://example.test/receipt.jpg" alt="hoa-don.jpg"/>')
    expect(html).toContain('invoice.pdf')
    expect(html).toContain('https://example.test/invoice.pdf')
  })
})
