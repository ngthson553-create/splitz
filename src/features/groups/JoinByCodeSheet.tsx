import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Button, Field, Input } from '../../components/ui'

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
      title="Tham gia nhóm"
      footer={
        <Button fullWidth size="lg" onClick={submit} disabled={!value.trim()}>
          Tiếp tục <ArrowRight size={18} />
        </Button>
      }
    >
      <div className="space-y-4 py-1">
        <p className="text-sm text-muted">
          Dán <strong>link mời</strong> hoặc nhập <strong>mã nhóm</strong> bạn nhận được để tham gia.
        </p>
        <Field label="Link mời hoặc mã nhóm">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && value.trim() && submit()}
            placeholder="VD: ABC123 hoặc https://…/join/…"
          />
        </Field>
      </div>
    </Sheet>
  )
}
