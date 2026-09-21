// Xuất báo cáo nhóm dạng PDF qua print-to-PDF của trình duyệt (hỗ trợ tiếng Việt +
// nhúng ảnh chứng từ qua signed URL). Mở cửa sổ mới, chờ ảnh tải, gọi print().
import type { Group } from './types'
import { formatVnd, formatDate } from './format'
import { settleState } from './settlement'
import { listGroupAttachments } from './data/attachments'
import { t } from './i18n'
import { getLang } from './i18n/locale'

export type ReportAttachment = { name: string; isImage: boolean; url: string }
export type ReportAttachmentMap = Map<string, ReportAttachment[]>

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

export async function exportGroupReport(group: Group): Promise<void> {
  let attachments: ReportAttachmentMap = new Map()
  try {
    attachments = await listGroupAttachments(group.id)
  } catch {
    // không có chứng từ / lỗi → bỏ qua
  }

  const html = buildGroupReportHtml(group, attachments)

  const w = window.open('', '_blank')
  if (!w) throw new Error(t().errors.popupBlocked)
  w.document.write(html)
  w.document.close()
  // Chờ ảnh tải xong rồi mở hộp thoại in (lưu PDF).
  const imgs = Array.from(w.document.images)
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.onload = () => res()
            img.onerror = () => res()
          }),
    ),
  )
  w.focus()
  w.print()
}

export function buildGroupReportHtml(
  group: Group,
  attachments: ReportAttachmentMap = new Map(),
  exportedAt = new Date().toISOString(),
): string {
  const memberName = (id: string) => group.members.find((m) => m.id === id)?.name ?? '—'
  const state = settleState(group)
  const total = group.expenses.reduce((a, e) => a + e.amount, 0)
  const C = t().common

  const expensesRows = [...group.expenses]
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
    .map((e) => {
      const payer = e.payers.map((p) => memberName(p.memberId)).join(', ')
      const atts = attachments.get(e.id) ?? []
      const attHtml = atts.length
        ? `<div class="att-title">${esc(C.reportAttachments)}</div><div class="atts">${atts
            .map((a) =>
              a.isImage
                ? `<img src="${esc(a.url)}" alt="${esc(a.name)}"/>`
                : `<div class="pdf">📄 ${esc(a.name)} — <a href="${esc(a.url)}">${esc(C.reportOpen)}</a></div>`,
            )
            .join('')}</div>`
        : ''
      return `<tr><td>${esc(formatDate(e.paidAt))}</td><td>${esc(e.title)}</td><td>${esc(payer)}</td>
        <td class="r">${esc(formatVnd(e.amount))}</td></tr>${atts.length ? `<tr><td colspan="4">${attHtml}</td></tr>` : ''}`
    })
    .join('')

  const balanceRows = state.confirmedBalances
    .map((b) => {
      const cls = b.balance > 0 ? 'pos' : b.balance < 0 ? 'neg' : ''
      const label = b.balance > 0 ? C.reportReceivable : b.balance < 0 ? C.reportOwes : C.reportSettledUp
      return `<tr><td>${esc(b.name)}</td><td class="r ${cls}">${esc(formatVnd(Math.abs(b.balance)))} (${label})</td></tr>`
    })
    .join('')

  const transferRows = state.transfers
    .map(
      (t) =>
        `<tr><td>${esc(memberName(t.fromMemberId))} → ${esc(memberName(t.toMemberId))}</td>
         <td class="r">${esc(formatVnd(t.amount))}</td></tr>`,
    )
    .join('')

  const html = `<!doctype html><html lang="${getLang()}"><head><meta charset="utf-8"/>
  <title>${esc(C.reportTitle)} ${esc(group.name)}</title>
  <style>
    *{font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;box-sizing:border-box}
    body{margin:24px;color:#0f172a}
    h1{font-size:22px;margin:0 0 2px;color:#1d4ed8}
    .muted{color:#64748b;font-size:13px}
    h2{font-size:15px;margin:22px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    td{padding:6px 8px;border-bottom:1px solid #eef2f7;vertical-align:top}
    .r{text-align:right;font-variant-numeric:tabular-nums}
    .pos{color:#059669}.neg{color:#dc2626}
    .att-title{font-size:11px;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:.04em;margin:2px 0 6px}
    .atts{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0}
    .atts img{max-height:160px;max-width:240px;border:1px solid #e2e8f0;border-radius:8px}
    .pdf{font-size:12px;color:#475569}
    .total{font-size:18px;font-weight:800}
    @media print{a{color:#1d4ed8;text-decoration:none}}
  </style></head><body>
    <h1>${esc(group.emoji ?? '')} ${esc(group.name)}</h1>
    <p class="muted">${esc(C.reportSubtitle.replace('{date}', formatDate(exportedAt)))}</p>
    <p class="total">${esc(C.reportTotalSpent)}: ${esc(formatVnd(total))}</p>

    <h2>${esc(C.reportBalancesTitle)}</h2>
    <table>${balanceRows || `<tr><td class="muted">${esc(C.reportNoData)}</td></tr>`}</table>

    ${
      state.transfers.length
        ? `<h2>${esc(C.reportTransfersTitle)}</h2><table>${transferRows}</table>`
        : `<h2>${esc(C.reportStatusTitle)}</h2><p class="muted">${esc(C.reportSettled)}</p>`
    }

    <h2>${esc(C.reportExpensesTitle)} (${group.expenses.length})</h2>
    <table>${expensesRows || `<tr><td class="muted">${esc(C.reportNoExpenses)}</td></tr>`}</table>

    <p class="muted" style="margin-top:24px">${esc(C.reportFooter)}</p>
  </body></html>`
  return html
}
