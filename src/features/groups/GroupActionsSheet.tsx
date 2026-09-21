import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Button, Input } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { useStore } from '../../lib/store'
import { useConfirm } from '../../components/ConfirmDialog'
import { useToast } from '../../components/Toast'
import type { Group } from '../../lib/types'

const EMOJIS = ['💸', '🍜', '✈️', '🏠', '🎉', '⚽', '🏖️', '☕', '🎬', '🛒', '🍻', '🚕']

export function GroupActionsSheet({
  group,
  onClose,
}: {
  group: Group | null
  onClose: () => void
}) {
  const t = useT()
  const { updateGroup, removeGroup } = useStore()
  const confirm = useConfirm()
  const toast = useToast()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('💸')

  useEffect(() => {
    if (group) {
      setEditing(false)
      setName(group.name)
      setEmoji(group.emoji ?? '💸')
    }
  }, [group])

  if (!group) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const g = group

  async function saveEdit() {
    await updateGroup(g.id, (prev) => ({
      ...prev,
      name: name.trim() || prev.name,
      emoji,
    }))
    toast.success(t.home.updatedToast)
    onClose()
  }

  async function doDelete() {
    const ok = await confirm({
      title: t.home.deleteConfirmTitle({ name: g.name }),
      description: t.home.deleteConfirmDescription,
      confirmLabel: t.home.deleteGroup,
      danger: true,
    })
    if (!ok) return
    await removeGroup(g.id)
    toast.success(t.home.deletedToast)
    onClose()
    navigate('/groups')
  }

  return (
    <Sheet open={Boolean(group)} onClose={onClose} title={editing ? t.home.editGroup : g.name}>
      {editing ? (
        <div className="space-y-4 py-1">
          <div className="flex flex-wrap gap-2 justify-center">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`press grid place-items-center h-10 w-10 rounded-xl text-xl transition ${
                  emoji === e ? 'gradient-brand-soft shadow-soft' : 'surface-sunken'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.home.groupName} autoFocus />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setEditing(false)}>
              <X size={16} /> {t.common.cancel}
            </Button>
            <Button fullWidth onClick={saveEdit}>
              <Check size={16} /> {t.common.save}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1 py-1">
          <ActionRow icon={<Pencil size={18} />} label={t.home.editNameAndEmoji} onClick={() => setEditing(true)} />
          <ActionRow
            icon={<Trash2 size={18} />}
            label={t.home.deleteGroup}
            danger
            onClick={doDelete}
          />
        </div>
      )}
    </Sheet>
  )
}

function ActionRow({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: ReactNode
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`press w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--surface-2)] transition ${
        danger ? 'text-neg' : 'text-app'
      }`}
    >
      <span className={danger ? 'text-neg' : 'text-muted'}>{icon}</span>
      <span className="font-semibold text-sm">{label}</span>
    </button>
  )
}
