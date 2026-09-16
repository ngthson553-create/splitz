import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Users } from 'lucide-react'
import { Button, Field, Input } from '../../components/ui'
import { extractToken } from './JoinByCodeSheet'

/**
 * Màn nhập mã/link tham gia độc lập tại `/join` (không token).
 * Thay cho lỗi 404 thô khi người dùng mở `/join` trực tiếp.
 */
export function JoinEntryScreen() {
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
        <h1 className="text-2xl font-extrabold tracking-tight text-app text-center">Tham gia nhóm</h1>
        <p className="mt-2 text-sm text-muted text-center max-w-xs">
          Dán <strong>link mời</strong> hoặc nhập <strong>mã nhóm</strong> bạn nhận được để tham gia.
        </p>

        <div className="w-full mt-7 space-y-4">
          <Field label="Link mời hoặc mã nhóm">
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && value.trim() && submit()}
              placeholder="VD: ABC123 hoặc https://…/join/…"
            />
          </Field>
          <Button fullWidth size="lg" onClick={submit} disabled={!value.trim()}>
            Tiếp tục <ArrowRight size={18} />
          </Button>
          <Button fullWidth variant="ghost" onClick={() => navigate('/', { replace: true })}>
            Về trang chủ
          </Button>
        </div>
      </div>
    </div>
  )
}
