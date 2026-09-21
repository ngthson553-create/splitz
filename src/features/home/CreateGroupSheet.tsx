import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Avatar, Button, Field, Input } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { useStore } from '../../lib/store'
import { useToast } from '../../components/Toast'
import { colorForIndex } from '../../lib/format'
import { trackEvent } from '../../lib/analytics'

export function CreateGroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const { createGroup, mode } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [members, setMembers] = useState<string[]>([''])
  const [busy, setBusy] = useState(false)

  function reset() {
    setName('')
    setMembers([''])
    setBusy(false)
  }

  function updateMember(i: number, value: string) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? value : m)))
  }

  function addMemberRow() {
    setMembers((prev) => [...prev, ''])
  }

  function removeMemberRow(i: number) {
    setMembers((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  async function submit() {
    if (busy) return
    setBusy(true)
    try {
      const group = await createGroup(name, members)
      trackEvent('group_created', { member_count: members.filter((m) => m.trim()).length })
      onClose()
      reset()
      navigate(`/g/${group.id}`)
    } catch (e) {
      // Giới hạn gói (trigger) hoặc lỗi khác → báo thân thiện.
      toast.error(e instanceof Error ? e.message : t.home.createFailed)
    } finally {
      setBusy(false)
    }
  }

  const canSubmit =
    name.trim().length > 0 && (mode === 'cloud' || members.some((m) => m.trim()))

  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose()
        reset()
      }}
      title={t.home.newGroupTitle}
      footer={
        <Button fullWidth size="lg" disabled={!canSubmit || busy} onClick={submit}>
          {busy ? t.home.creating : t.home.createGroup}
        </Button>
      }
    >
      <div className="space-y-5 py-1">
        <Field label={t.home.groupName}>
          <Input
            autoFocus
            placeholder={t.home.groupNameExample}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-muted">
            {mode === 'cloud' ? t.home.addOthersCloud : t.home.members}
          </span>
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <Avatar name={m || '?'} color={colorForIndex(i)} size="sm" />
                <Input
                  placeholder={t.home.memberNamePlaceholder({ n: i + 1 })}
                  value={m}
                  onChange={(e) => updateMember(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && i === members.length - 1 && m.trim()) addMemberRow()
                  }}
                />
                {members.length > 1 && (
                  <button
                    onClick={() => removeMemberRow(i)}
                    className="press grid place-items-center h-9 w-9 rounded-xl text-faint hover:text-neg"
                    aria-label={t.home.removeMember}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addMemberRow}
            className="press inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-300 mt-1"
          >
            <Plus size={16} /> {t.home.addMember}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
