import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Button, Field, Input } from '../../components/ui'
import { useT } from '../../lib/i18n'

/** Trích token từ chuỗi người dùng dán: link mời đầy đủ hoặc mã nhóm. */
export function extractToken(input: string): string {
  const raw = input.trim()
  if (raw.includes('/join/')) {
    const after = raw.split('/join/')[1] ?? ''
    return after.split(/[/?#]/)[0]
  }
  // Mã nhóm: bảng chữ cái viết hoa.
  return raw.toUpperCase()
}

export function JoinByCodeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  function submit() {
    const token = extractToken(value)
    if (!token) return
    onClose()
    setValue('')
    navigate(`/join/${token}`)
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose()
        setValue('')
      }}
      title={t.home.joinGroup}
      footer={
        <Button fullWidth size="lg" onClick={submit} disabled={!value.trim()}>
          {t.home.continueLabel} <ArrowRight size={18} />
        </Button>
      }
    >
      <div className="space-y-4 py-1">
        <p className="text-sm text-muted">
          {t.home.joinHintPaste} <strong>{t.home.joinHintLinkInvite}</strong> {t.home.joinHintOrEnter}{' '}
          <strong>{t.home.joinHintGroupCode}</strong> {t.home.joinHintSuffix}
        </p>
        <Field label={t.home.inviteFieldLabel}>
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && value.trim() && submit()}
            placeholder={t.home.invitePlaceholder}
          />
        </Field>
      </div>
    </Sheet>
  )
}
