import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, LogIn, UserPlus, Users } from 'lucide-react'
import { Button } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useT } from '../../lib/i18n'
import { useAuth } from '../../lib/auth'
import { useStore } from '../../lib/store'
import { getInvitePreview, type InvitePreview } from '../../lib/data/invites'
import { trackEvent } from '../../lib/analytics'

export const PENDING_INVITE_KEY = 'splitz.pending_invite'

export function JoinScreen() {
  const t = useT()
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { cloud, session, loading: authLoading } = useAuth()
  const { joinViaInvite } = useStore()

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    // Local/demo: chưa có backend → không thể xem trước/tham gia bằng lời mời.
    if (!cloud) {
      setLoading(false)
      return
    }
    let active = true
    getInvitePreview(token)
      .then((p) => {
        if (!active) return
        if (!p) setNotFound(true)
        else setPreview(p)
      })
      .catch(() => active && setNotFound(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [token, cloud])

  async function onJoin() {
    setBusy(true)
    try {
      const groupId = await joinViaInvite(token)
      trackEvent('group_joined', { is_claim: preview?.isClaim ?? false })
      toast.success(t.home.joinedToast)
      navigate(`/g/${groupId}`, { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.home.joinFailed)
      setBusy(false)
    }
  }

  function onLoginToJoin() {
    localStorage.setItem(PENDING_INVITE_KEY, token)
    navigate('/', { replace: true })
  }

  const showLoading = loading || authLoading

  return (
    <div className="relative min-h-dvh flex flex-col">
      <div className="app-aurora" />
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full text-center">
        {showLoading ? (
          <Loader2 size={28} className="animate-spin text-brand-500" />
        ) : !cloud ? (
          <>
            <p className="text-lg font-bold text-app">{t.home.loginRequiredTitle}</p>
            <p className="mt-1.5 text-sm text-muted">
              {t.home.loginRequiredDescription}
            </p>
            <Button className="mt-6" onClick={() => navigate('/', { replace: true })}>
              {t.home.backHome}
            </Button>
          </>
        ) : notFound || !preview ? (
          <>
            <p className="text-lg font-bold text-app">{t.home.invalidInviteTitle}</p>
            <p className="mt-1.5 text-sm text-muted">{t.home.invalidInviteDescription}</p>
            <Button className="mt-6" onClick={() => navigate('/', { replace: true })}>
              {t.home.backHome}
            </Button>
          </>
        ) : (
          <>
            <div className="grid place-items-center h-20 w-20 rounded-3xl gradient-brand text-white shadow-glow mb-5 text-4xl">
              {preview.groupEmoji ?? <Users size={36} />}
            </div>
            <p className="text-sm text-muted">{t.home.invitedTo}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-app mt-1">{preview.groupName}</h1>
            <p className="mt-2 text-sm text-muted inline-flex items-center gap-1.5">
              <Users size={14} /> {t.home.memberCount({ n: preview.memberCount })}
            </p>
            {preview.isClaim && preview.targetName && (
              <p className="mt-3 text-sm text-brand-600 dark:text-brand-300 font-semibold">
                {t.home.claimIdentity({ name: preview.targetName })}
              </p>
            )}

            {!preview.valid ? (
              <p className="mt-6 text-sm text-neg font-semibold">{t.home.inviteExpired}</p>
            ) : cloud && !session ? (
              <Button className="mt-7" size="lg" fullWidth onClick={onLoginToJoin}>
                <LogIn size={18} /> {t.home.loginToJoin}
              </Button>
            ) : (
              <Button className="mt-7" size="lg" fullWidth onClick={onJoin} disabled={busy}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                {t.home.joinGroup}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
