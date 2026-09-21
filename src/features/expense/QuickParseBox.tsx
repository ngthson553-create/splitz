import { useRef, useState } from 'react'
import { ReceiptText, Sparkles, Wand2, Zap } from 'lucide-react'
import { Button, Input } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { useSubscription } from '../../lib/subscription'
import { useT } from '../../lib/i18n'
import { parseExpenseRuleBased, type ParsedExpense } from '../../lib/ai/parseExpense'
import { parseExpenseRemote } from '../../lib/ai/remote'
import { ocrReceiptRemote, type OcrItem } from '../../lib/ai/ocr'
import { trackEvent } from '../../lib/analytics'
import type { Group } from '../../lib/types'

/**
 * Ô "Nhập nhanh" ở đầu ExpenseSheet (chỉ khi TẠO MỚI). Hai tầng theo mô hình lai:
 *  • "Điền nhanh" = parser quy tắc (offline, FREE unlimited, tức thì).
 *  • "Hiểu thông minh" = LLM (Gemini) cho câu phức tạp — FREE 15 lần/tháng → Premium unlimited.
 * Kết quả CHỈ điền sẵn các trường bên dưới; user luôn xem lại & sửa trước khi lưu.
 */
export function QuickParseBox({
  group,
  onApply,
  onReceiptScanned,
}: {
  group: Group
  onApply: (p: ParsedExpense) => void
  /** OCR hoá đơn → danh sách món + ảnh đã nén (để đính kèm sau khi lưu). */
  onReceiptScanned: (items: OcrItem[], file: File) => void
}) {
  const { mode } = useStore()
  const { isPremium } = useSubscription()
  const toast = useToast()
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<'rule' | 'ai' | 'ocr' | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const names = group.members.map((m) => m.name)
  const canUseAI = mode === 'cloud' // LLM/vision cần đăng nhập + Edge Function

  function fillNow() {
    const trimmed = text.trim()
    if (!trimmed) return
    setBusy('rule')
    try {
      onApply(parseExpenseRuleBased(trimmed, names))
      trackEvent('expense_quickparse_rule')
    } finally {
      setBusy(null)
    }
  }

  async function fillWithAI() {
    const trimmed = text.trim()
    if (!trimmed) return
    setBusy('ai')
    try {
      const res = await parseExpenseRemote(trimmed, names)
      onApply(res.parsed)
      setRemaining(res.remaining)
      trackEvent('expense_quickparse_ai')
      if (res.remaining !== null) {
        toast.success(t.expense.filledWithQuota({ n: res.remaining }))
      } else {
        toast.success(t.expense.filledByAi)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.expense.parseFailed)
    } finally {
      setBusy(null)
    }
  }

  async function onPickReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng ảnh
    if (!file) return
    setBusy('ocr')
    try {
      const res = await ocrReceiptRemote(file)
      if (res.items.length === 0) {
        toast.show(res.message ?? t.expense.ocrNoItems, 'info')
        return
      }
      onReceiptScanned(res.items, res.file)
      setRemaining(res.remaining)
      trackEvent('expense_ocr_receipt', { items: res.items.length })
      const more = res.remaining !== null ? t.expense.ocrQuotaLeft({ n: res.remaining }) : ''
      toast.success(t.expense.ocrScanned({ n: res.items.length }) + more)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.expense.ocrFailed)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] surface-sunken p-3 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Sparkles size={13} className="text-brand-600 dark:text-brand-300" />
        {t.expense.quickParseTitle}
      </div>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.expense.quickParsePlaceholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            fillNow()
          }
        }}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          fullWidth
          onClick={fillNow}
          disabled={busy !== null || !text.trim()}
        >
          <Zap size={15} /> {t.expense.quickFill}
        </Button>
        {canUseAI && (
          <Button
            size="sm"
            fullWidth
            onClick={fillWithAI}
            disabled={busy !== null || !text.trim()}
          >
            <Wand2 size={15} /> {busy === 'ai' ? t.expense.aiThinking : t.expense.aiUnderstand}
          </Button>
        )}
      </div>
      {canUseAI && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickReceipt}
          />
          <Button
            size="sm"
            variant="secondary"
            fullWidth
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
          >
            <ReceiptText size={15} />{' '}
            {busy === 'ocr' ? t.expense.scanningReceipt : t.expense.scanReceipt}
          </Button>
        </>
      )}
      <p className="text-[11px] text-faint leading-snug">
        {t.expense.quickParseNoteFree}
        {canUseAI ? (
          <>
            {' '}
            {t.expense.quickParseNoteAi}
            {!isPremium && remaining !== null ? t.expense.quickParseQuotaLeft({ n: remaining }) : ''}
            {!isPremium && remaining === null ? t.expense.quickParseNoteFreeQuota : ''}.
          </>
        ) : null}{' '}
        {t.expense.quickParseNoteEditable}
      </p>
    </div>
  )
}
