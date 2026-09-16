import { useRef, useState } from 'react'
import { ReceiptText, Sparkles, Wand2, Zap } from 'lucide-react'
import { Button, Input } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useStore } from '../../lib/store'
import { useSubscription } from '../../lib/subscription'
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
        toast.success(`Đã điền. Còn ${res.remaining} lượt AI tháng này.`)
      } else {
        toast.success('Đã điền bằng AI.')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không phân tích được.')
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
        toast.show(res.message ?? 'Không nhận được món nào từ ảnh. Thử ảnh rõ hơn.', 'info')
        return
      }
      onReceiptScanned(res.items, res.file)
      setRemaining(res.remaining)
      trackEvent('expense_ocr_receipt', { items: res.items.length })
      const more = res.remaining !== null ? ` Còn ${res.remaining} lượt quét tháng này.` : ''
      toast.success(`Đã nhận ${res.items.length} món.${more}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không quét được hoá đơn.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] surface-sunken p-3 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Sparkles size={13} className="text-brand-600 dark:text-brand-300" />
        Nhập nhanh bằng một câu
      </div>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='VD: "Ăn tối 500k Hùng trả chia đều"'
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
          <Zap size={15} /> Điền nhanh
        </Button>
        {canUseAI && (
          <Button
            size="sm"
            fullWidth
            onClick={fillWithAI}
            disabled={busy !== null || !text.trim()}
          >
            <Wand2 size={15} /> {busy === 'ai' ? 'Đang hiểu…' : 'Hiểu thông minh'}
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
            <ReceiptText size={15} /> {busy === 'ocr' ? 'Đang quét hoá đơn…' : 'Quét hoá đơn (chia theo món)'}
          </Button>
        </>
      )}
      <p className="text-[11px] text-faint leading-snug">
        “Điền nhanh” miễn phí, tức thì.
        {canUseAI ? (
          <>
            {' '}“Hiểu thông minh” dùng AI cho câu phức tạp
            {!isPremium && remaining !== null ? ` · còn ${remaining} lượt tháng này` : ''}
            {!isPremium && remaining === null ? ' · miễn phí 15 lượt/tháng' : ''}.
          </>
        ) : null}{' '}
        Kết quả luôn cho bạn sửa lại.
      </p>
    </div>
  )
}
