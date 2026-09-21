import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Paperclip,
  PartyPopper,
  QrCode,
  X,
} from 'lucide-react'
import { Avatar, Button, Card, EmptyState } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmDialog'
import { signedSettlementProofUrl } from '../../lib/data/attachments'
import { errorMessage } from '../../lib/data/errors'
import { formatVnd } from '../../lib/format'
import { settleState } from '../../lib/settlement'
import { useT } from '../../lib/i18n'
import { useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { remindDebts, listMyDebtReminders, type RemindTarget } from '../../lib/data/reminders'
import { fadeUpItem, stagger } from '../../lib/motion'
import type { Group, Settlement, SettlementTransfer } from '../../lib/types'

// Khớp COOLDOWN_MS phía Edge Function: 1 lần / 24h / khoản.
const REMIND_COOLDOWN_MS = 24 * 60 * 60 * 1000

export function SettleTab({
  group,
  onShowQr,
}: {
  group: Group
  onShowQr: (t: SettlementTransfer) => void
}) {
  const { mode, confirmSettlement, cancelSettlement } = useStore()
  const { profile } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const t = useT()
  const [busy, setBusy] = useState<string | null>(null)

  const memberById = useMemo(() => new Map(group.members.map((m) => [m.id, m])), [group.members])
  const state = useMemo(() => settleState(group), [group])

  const isCloud = mode === 'cloud'
  const myMemberId = useMemo(
    () => (isCloud ? group.members.find((m) => m.userId === profile?.id)?.id : null),
    [isCloud, group.members, profile?.id],
  )
  // Chủ nhóm cũng được huỷ một quyết toán đang chờ (khớp quyền của RPC cancel_settlement).
  const isOwner = !isCloud || group.ownerId === profile?.id
  // Local (demo 1 người) → cho thao tác mọi vai; cloud → đúng người trả/nhận.
  const canAct = (memberId: string) => !isCloud || memberId === myMemberId

  // ── Nhắc nợ: map "lần nhắc gần nhất" theo con nợ (chỉ khoản TÔI là chủ nợ) để hiện cooldown.
  // `now` chốt lúc tải (cooldown 24h nên không cần tick liên tục) → tránh gọi Date.now() khi render.
  const [remindedAt, setRemindedAt] = useState<Map<string, number>>(new Map())
  const [now, setNow] = useState(() => Date.now())

  // Tải theo group.id + myMemberId (KHÔNG theo danh tính object group) → không churn mỗi poll 20s.
  const loadReminders = useCallback(async () => {
    if (!isCloud || !myMemberId) return
    try {
      const m = await listMyDebtReminders(group.id, myMemberId)
      setRemindedAt(m)
      setNow(Date.now())
    } catch {
      // im lặng — không chặn tab nếu tra cooldown lỗi
    }
  }, [isCloud, myMemberId, group.id])

  useEffect(() => {
    void loadReminders()
  }, [loadReminders])

  const onCooldown = (fromMemberId: string) => {
    const ts = remindedAt.get(fromMemberId)
    return ts !== undefined && now - ts < REMIND_COOLDOWN_MS
  }

  async function doRemind(targets: RemindTarget[], key: string) {
    if (targets.length === 0) return
    setBusy(key)
    try {
      const { sent, results } = await remindDebts(group.id, targets)
      const noDevice = results.filter((r) => r.status === 'no_device').length
      const cooldown = results.filter((r) => r.status === 'cooldown').length
      if (sent > 0) {
        toast.success(targets.length > 1 ? t.group.remindedCount({ n: sent }) : t.group.remindSentToast)
      } else if (noDevice > 0) {
        toast.show(t.group.noDeviceToast, 'info')
      } else if (cooldown > 0) {
        toast.error(t.group.remindCooldownToast)
      } else {
        toast.error(t.group.remindError)
      }
      await loadReminders()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.group.remindError)
    } finally {
      setBusy(null)
    }
  }

  async function doConfirm(s: Settlement) {
    setBusy(s.id)
    try {
      await confirmSettlement(group.id, s.id)
      toast.success(t.group.confirmedToast)
    } catch (e) {
      toast.error(errorMessage(e, t.group.confirmError))
    } finally {
      setBusy(null)
    }
  }

  async function doCancel(s: Settlement) {
    const ok = await confirm({
      title: t.group.cancelSettleTitle,
      description: t.group.cancelSettleDesc,
      confirmLabel: t.group.cancelSettle,
      danger: true,
    })
    if (!ok) return
    setBusy(s.id)
    try {
      await cancelSettlement(group.id, s.id)
      toast.success(t.group.cancelledToast)
    } catch (e) {
      toast.error(errorMessage(e, t.group.cancelError))
    } finally {
      setBusy(null)
    }
  }

  async function openProof(s: Settlement) {
    try {
      const url = await signedSettlementProofUrl(s)
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      toast.error(errorMessage(e, t.group.proofOpenError))
    }
  }

  // Các khoản NGƯỜI KHÁC nợ MÌNH, con nợ là user thật, chưa trong cooldown → có thể nhắc.
  const remindAllTargets = useMemo<RemindTarget[]>(() => {
    if (!isCloud || !myMemberId) return []
    return state.transfers
      .filter((t) => t.toMemberId === myMemberId)
      .filter((t) => Boolean(memberById.get(t.fromMemberId)?.userId))
      .filter((t) => {
        const ts = remindedAt.get(t.fromMemberId)
        return ts === undefined || now - ts >= REMIND_COOLDOWN_MS
      })
      .map((t) => ({ fromMemberId: t.fromMemberId, amount: t.amount }))
  }, [isCloud, myMemberId, state.transfers, memberById, remindedAt, now])

  if (group.expenses.length === 0) {
    return (
      <EmptyState
        icon={<QrCode size={26} />}
        title={t.group.nothingToSettleTitle}
        description={t.group.nothingToSettleDesc}
      />
    )
  }

  if (state.isSettled) {
    return (
      <EmptyState
        icon={<PartyPopper size={28} />}
        title={t.group.allSettledTitle}
        description={t.group.allSettledDesc}
      />
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
      {/* Đang chờ xác nhận */}
      {state.pending.length > 0 && (
        <motion.div variants={fadeUpItem} className="space-y-2">
          <h3 className="text-[13px] font-semibold text-muted flex items-center gap-1.5">
            <Clock size={14} /> {t.group.pendingCount({ n: state.pending.length })}
          </h3>
          {state.pending.map((s) => {
            const from = memberById.get(s.fromMemberId)
            const to = memberById.get(s.toMemberId)
            const iAmRecipient = canAct(s.toMemberId)
            const iAmPayer = canAct(s.fromMemberId)
            const canCancel = iAmRecipient || iAmPayer || isOwner
            return (
              <Card key={s.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-1 pt-0.5 shrink-0">
                    <Avatar name={from?.name ?? '?'} color={from?.color} src={from?.avatarUrl} size="xs" />
                    <ArrowRight size={13} className="text-faint" />
                    <Avatar name={to?.name ?? '?'} color={to?.color} src={to?.avatarUrl} size="xs" />
                  </div>
                  <span className="max-w-[8.5rem] text-right font-extrabold tnum leading-tight text-brand-600 dark:text-brand-300 shrink-0">
                    {formatVnd(s.amount)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug line-clamp-4 break-words sm:line-clamp-3">
                    {from?.name} → {to?.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5 leading-snug line-clamp-2 break-words">
                    {iAmRecipient ? t.group.awaitingYourConfirm : t.group.awaitingConfirm({ name: to?.name ?? '' })}
                  </p>
                </div>
                {s.proofStoragePath && (
                  <button
                    onClick={() => void openProof(s)}
                    className="press inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300"
                  >
                    <Paperclip size={13} /> {t.group.viewProof}
                  </button>
                )}
                <div className="flex gap-2">
                  {iAmRecipient && (
                    <Button
                      size="sm"
                      fullWidth
                      onClick={() => doConfirm(s)}
                      disabled={busy === s.id}
                    >
                      <Check size={15} /> {t.group.received}
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth={!iAmRecipient}
                      onClick={() => doCancel(s)}
                      disabled={busy === s.id}
                    >
                      <X size={15} /> {iAmRecipient ? t.group.decline : t.common.cancel}
                    </Button>
                  )}
                  {!canCancel && (
                    <p className="text-xs text-faint w-full text-center py-1.5">{t.group.waitingConfirm}</p>
                  )}
                </div>
              </Card>
            )
          })}
        </motion.div>
      )}

      {/* Cần chuyển */}
      {state.transfers.length > 0 && (
        <>
          <motion.div variants={fadeUpItem}>
            <Card className="flex flex-wrap items-center gap-3 gradient-mesh py-3">
              <div className="grid place-items-center h-10 w-10 rounded-xl gradient-brand text-white shadow-soft shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <p className="text-sm flex-1 min-w-[12rem] leading-snug">
                {t.group.transfersLeftPrefix}{' '}
                <span className="font-extrabold text-brand-600 dark:text-brand-300">
                  {t.group.transfersLeftCount({ n: state.transfers.length })}
                </span>{' '}
                {t.group.transfersLeftSuffix}
              </p>
              {/* Nhắc hàng loạt: chỉ hiện khi ≥2 người (là user thật) đang nợ mình & chưa cooldown. */}
              {remindAllTargets.length >= 2 && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => doRemind(remindAllTargets, 'remind-all')}
                  disabled={busy === 'remind-all'}
                >
                  <BellRing size={15} /> {t.group.remindAll}
                </Button>
              )}
            </Card>
          </motion.div>

          {state.transfers.map((tr, i) => {
            const from = memberById.get(tr.fromMemberId)
            const to = memberById.get(tr.toMemberId)
            const iAmPayer = canAct(tr.fromMemberId)
            // Tôi là người NHẬN (người khác nợ tôi) → chỗ trống này dành cho nút "Nhắc".
            const iAmRecipient = !iAmPayer && canAct(tr.toMemberId)
            const debtorIsUser = Boolean(from?.userId)
            const reminded = onCooldown(tr.fromMemberId)
            const remindKey = `remind-${tr.fromMemberId}`
            return (
              <motion.div key={`${tr.fromMemberId}-${tr.toMemberId}-${i}`} variants={fadeUpItem}>
                <Card className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1 pt-0.5 shrink-0">
                      <Avatar name={from?.name ?? '?'} color={from?.color} src={from?.avatarUrl} size="xs" />
                      <ArrowRight size={13} className="text-faint" />
                      <Avatar name={to?.name ?? '?'} color={to?.color} src={to?.avatarUrl} size="xs" />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="max-w-[8.5rem] text-right font-extrabold tnum leading-tight text-brand-600 dark:text-brand-300 sm:max-w-none">
                        {formatVnd(tr.amount)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold leading-snug line-clamp-4 break-words sm:line-clamp-3">
                    {from?.name} → {to?.name}
                  </p>
                  {iAmPayer && (
                    <Button size="sm" fullWidth onClick={() => onShowQr(tr)}>
                      <QrCode size={15} /> {t.group.pay}
                    </Button>
                  )}
                  {iAmRecipient && debtorIsUser && (
                    <Button
                      size="sm"
                      fullWidth
                      variant="secondary"
                      onClick={() => doRemind([{ fromMemberId: tr.fromMemberId, amount: tr.amount }], remindKey)}
                      disabled={busy === remindKey || reminded}
                    >
                      {reminded ? (
                        <>
                          <Check size={15} /> {t.group.reminded}
                        </>
                      ) : (
                        <>
                          <Bell size={15} /> {t.group.remindDebt}
                        </>
                      )}
                    </Button>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </>
      )}

      <p className="text-xs text-faint text-center px-4 pt-1">
        {t.group.settleDisclaimer}
      </p>
    </motion.div>
  )
}
