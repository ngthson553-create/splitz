import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Users } from 'lucide-react'
import { Button, Field, Input } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { extractToken } from './JoinByCodeSheet'

/**
 * Màn nhập mã/link tham gia độc lập tại `/join` (không token).
 * Thay cho lỗi 404 thô khi người dùng mở `/join` trực tiếp.
 */
export function JoinEntryScreen() {
  const t = useT()
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  function submit() {
    const token = extractToken(value)
    if (!token) return
    navigate(`/join/${token}`)
  }

  return (
    <div className="relative min-h-dvh flex flex-col">
      <div className="app-aurora" />
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
        <div className="grid place-items-center h-20 w-20 rounded-3xl gradient-brand text-white shadow-glow mb-5">
          <Users size={36} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-app text-center">{t.home.joinGroup}</h1>
        <p className="mt-2 text-sm text-muted text-center max-w-xs">
          {t.home.joinHintPaste} <strong>{t.home.joinHintLinkInvite}</strong> {t.home.joinHintOrEnter}{' '}
          <strong>{t.home.joinHintGroupCode}</strong> {t.home.joinHintSuffix}
        </p>

        <div className="w-full mt-7 space-y-4">
          <Field label={t.home.inviteFieldLabel}>
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && value.trim() && submit()}
              placeholder={t.home.invitePlaceholder}
            />
          </Field>
          <Button fullWidth size="lg" onClick={submit} disabled={!value.trim()}>
            {t.home.continueLabel} <ArrowRight size={18} />
          </Button>
          <Button fullWidth variant="ghost" onClick={() => navigate('/', { replace: true })}>
            {t.home.backHome}
          </Button>
        </div>
      </div>
    </div>
  )
}
