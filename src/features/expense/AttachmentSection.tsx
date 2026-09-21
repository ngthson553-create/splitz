import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { FileText, ImageIcon, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmDialog'
import { useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useT } from '../../lib/i18n'
import {
  listAttachments,
  uploadAttachment,
  removeAttachment,
  signedUrl,
} from '../../lib/data/attachments'
import type { Attachment, Group } from '../../lib/types'

const ACCEPT = 'image/*,application/pdf'
const MAX_BYTES = 10 * 1024 * 1024

export function AttachmentSection({ group, expenseId }: { group: Group; expenseId: string }) {
  const { mode } = useStore()
  const { profile } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Chứng từ chỉ hoạt động ở chế độ cloud (cần Storage).
  const enabled = mode === 'cloud'
  const myMemberId = group.members.find((m) => m.userId === profile?.id)?.id

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let active = true
    listAttachments(expenseId)
      .then((rows) => active && setItems(rows))
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [enabled, expenseId])

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      for (const f of files) {
        if (f.size > MAX_BYTES) {
          toast.error(t.expense.fileTooLarge({ name: f.name }))
          continue
        }
        const att = await uploadAttachment(group.id, expenseId, f, myMemberId)
        setItems((prev) => [...prev, att])
      }
      toast.success(t.expense.attachmentUploaded)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.expense.attachmentUploadFailed)
    } finally {
      setBusy(false)
    }
  }

  async function open(att: Attachment) {
    try {
      const url = await signedUrl(att.storagePath)
      window.open(url, '_blank', 'noopener')
    } catch {
      toast.error(t.expense.attachmentOpenFailed)
    }
  }

  async function remove(att: Attachment) {
    const ok = await confirm({
      title: t.expense.deleteAttachmentConfirm,
      description: att.fileName ?? t.expense.deleteAttachmentDescription,
      confirmLabel: t.common.delete,
      danger: true,
    })
    if (!ok) return
    try {
      await removeAttachment(att)
      setItems((prev) => prev.filter((x) => x.id !== att.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.expense.attachmentDeleteFailed)
    }
  }

  if (!enabled) return null

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-muted flex items-center gap-1.5">
          <Paperclip size={14} /> {t.expense.attachments} {items.length > 0 && `(${items.length})`}
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="press inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-300 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {t.common.add}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-faint">{t.common.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-faint">{t.expense.attachmentsEmpty}</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((att) => {
            const isImg = (att.mimeType ?? '').startsWith('image/')
            return (
              <div key={att.id} className="flex items-center gap-2.5 p-2.5 rounded-2xl surface-sunken">
                <div className="grid place-items-center h-9 w-9 rounded-lg bg-[var(--surface-2)] text-brand-600 dark:text-brand-300 shrink-0">
                  {isImg ? <ImageIcon size={16} /> : <FileText size={16} />}
                </div>
                <button onClick={() => open(att)} className="press min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold truncate">{att.fileName ?? t.expense.attachmentFallbackName}</p>
                  <p className="text-xs text-muted">{t.expense.tapToView}</p>
                </button>
                <button
                  onClick={() => remove(att)}
                  className="press grid place-items-center h-8 w-8 rounded-lg text-faint hover:text-neg shrink-0"
                  aria-label={t.expense.deleteAttachment}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={onPick} />
    </section>
  )
}
