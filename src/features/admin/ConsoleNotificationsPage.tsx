import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, BellRing, Loader2, RefreshCw, Send, ShieldAlert } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Segmented } from '../../components/ui'
import { t, useT } from '../../lib/i18n'
import { getIntlLocale } from '../../lib/i18n/locale'
import {
  listAdminNotificationDeliveries,
  listAdminNotifications,
  previewAdminNotificationTarget,
  sendAdminNotificationNow,
  type AdminNotificationCampaign,
  type AdminNotificationChannel,
  type AdminNotificationDelivery,
  type AdminNotificationDeliveryStatus,
  type AdminNotificationStatus,
  type AdminNotificationTargetType,
} from '../../lib/adminNotifications'

type ChannelKey = 'inApp' | 'webPush'

const CHANNEL_LABEL: Record<AdminNotificationChannel, string> = {
  in_app: 'in-app',
  web_push: 'web push',
}

export function ConsoleNotificationsPage() {
  const t = useT()
  const [campaigns, setCampaigns] = useState<AdminNotificationCampaign[]>([])
  const [deliveries, setDeliveries] = useState<AdminNotificationDelivery[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [href, setHref] = useState('/notifications')
  const [targetType, setTargetType] = useState<AdminNotificationTargetType>('all')
  const [targetValue, setTargetValue] = useState('')
  const [channels, setChannels] = useState<Record<ChannelKey, boolean>>({ inApp: true, webPush: true })
  const [preview, setPreview] = useState<{ targetCount: number; pushSubscriberCount: number } | null>(null)

  const TARGET_OPTIONS: { value: AdminNotificationTargetType; label: string }[] = [
    { value: 'all', label: t.adminBilling.filterAll },
    { value: 'free', label: 'Free' },
    { value: 'premium', label: 'Premium' },
    { value: 'user', label: t.adminBilling.labelUser },
    { value: 'group', label: t.adminBilling.targetGroup },
  ]

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true)
    const rows = await listAdminNotifications(undefined, { limit: 50 })
    setCampaigns(rows)
    setSelectedId((current) => (current && rows.some((item) => item.id === current) ? current : rows[0]?.id ?? null))
    setLoadingCampaigns(false)
  }, [])

  const loadDeliveries = useCallback(async () => {
    if (!selectedId) {
      setDeliveries([])
      return
    }
    setLoadingDeliveries(true)
    setDeliveries(await listAdminNotificationDeliveries(undefined, selectedId, 100))
    setLoadingDeliveries(false)
  }, [selectedId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCampaigns()
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [loadCampaigns])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDeliveries()
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [loadDeliveries])

  const selected = useMemo(
    () => campaigns.find((item) => item.id === selectedId) ?? campaigns[0] ?? null,
    [campaigns, selectedId],
  )
  const sentCount = campaigns.filter((item) => item.status === 'sent').length
  const failedPush = campaigns.reduce((total, item) => total + item.pushFailed, 0)

  async function onPreview() {
    setBusy(true)
    setNotice(null)
    const result = await previewAdminNotificationTarget(undefined, {
      targetType,
      targetValue,
      channels: { inApp: channels.inApp, webPush: channels.webPush },
    })
    setPreview(result)
    setNotice(result ? t.adminBilling.previewOk({ users: result.targetCount, devices: result.pushSubscriberCount }) : t.adminBilling.previewFailed)
    setBusy(false)
  }

  async function onSendNow() {
    const cleanTitle = title.trim()
    const cleanBody = body.trim()
    if (!cleanTitle || !cleanBody) {
      setNotice(t.adminBilling.notifContentRequired)
      return
    }
    if (!channels.inApp && !channels.webPush) {
      setNotice(t.adminBilling.notifChannelRequired)
      return
    }
    if ((targetType === 'user' || targetType === 'group') && !targetValue.trim()) {
      setNotice(targetType === 'user' ? t.adminBilling.notifUserEmailRequired : t.adminBilling.notifGroupIdRequired)
      return
    }
    if (targetType === 'all') {
      if (!preview || preview.targetCount <= 0) {
        setNotice(t.adminBilling.notifPreviewRequired)
        return
      }
      const ok = window.confirm(t.adminBilling.notifSendAllConfirm)
      if (!ok) return
    }

    setBusy(true)
    setNotice(null)
    const result = await sendAdminNotificationNow(undefined, {
      title: cleanTitle,
      body: cleanBody,
      href,
      targetType,
      targetValue,
      channels: { inApp: channels.inApp, webPush: channels.webPush },
    })
    if (result) {
      setNotice(t.adminBilling.notifSentSummary({ inApp: result.inAppSent, push: result.pushSent, failed: result.pushFailed }))
      setSelectedId(result.notificationId)
      setPreview(null)
      await loadCampaigns()
    } else {
      setNotice(t.adminBilling.notifSendFailed)
    }
    setBusy(false)
  }

  function toggleChannel(key: ChannelKey) {
    setChannels((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 4</Badge>
              <Badge tone="pos">In-app + web push</Badge>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-app">{t.adminBilling.notifTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {t.adminBilling.notifDescription}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadCampaigns()} disabled={loadingCampaigns || busy}>
            <RefreshCw size={16} className={loadingCampaigns ? 'animate-spin' : undefined} /> {t.adminBilling.refresh}
          </Button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <StatusPill label={t.adminBilling.pillCampaigns} value={String(campaigns.length)} tone="brand" />
          <StatusPill label={t.adminBilling.sent} value={String(sentCount)} tone="pos" />
          <StatusPill label={t.adminBilling.pillPushFailed} value={String(failedPush)} tone={failedPush > 0 ? 'muted' : 'pos'} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
              <BellRing size={20} />
            </span>
            <div>
              <h3 className="font-bold text-app">{t.adminBilling.composeTitle}</h3>
              <p className="text-xs text-muted">{t.adminBilling.composeDescription}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-muted">{t.adminBilling.labelNotifTitle}</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t.adminBilling.notifTitlePlaceholder} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-muted">{t.adminBilling.labelNotifBody}</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                placeholder={t.adminBilling.notifBodyPlaceholder}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-muted">{t.adminBilling.labelHref}</span>
              <Input value={href} onChange={(event) => setHref(event.target.value)} placeholder="/notifications" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-muted">{t.adminBilling.labelTarget}</span>
              <Segmented options={TARGET_OPTIONS} value={targetType} onChange={setTargetType} />
            </label>
            {(targetType === 'user' || targetType === 'group') && (
              <label className="block space-y-1.5">
                <span className="text-[13px] font-semibold text-muted">{targetType === 'user' ? t.adminBilling.labelTargetUserEmail : t.adminBilling.labelTargetGroupId}</span>
                <Input
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.target.value)}
                  placeholder={targetType === 'user' ? 'user@example.com' : t.adminBilling.targetGroupPlaceholder}
                />
              </label>
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <ChannelToggle label="In-app" active={channels.inApp} onClick={() => toggleChannel('inApp')} />
            <ChannelToggle label="Web push" active={channels.webPush} onClick={() => toggleChannel('webPush')} />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => void onPreview()} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />} {t.adminBilling.previewTargetButton}
            </Button>
            <Button onClick={() => void onSendNow()} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {t.adminBilling.sendNowButton}
            </Button>
          </div>

          {preview && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <StatusPill label={t.adminBilling.pillReceivers} value={String(preview.targetCount)} tone="brand" />
            <StatusPill label={t.adminBilling.pillPushDevices} value={String(preview.pushSubscriberCount)} tone="pos" />
            </div>
          )}
          {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-app">Preview</h3>
          <div className="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl gradient-brand text-white">
                <Bell size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-extrabold text-app">{title.trim() || t.adminBilling.notifTitleFallback}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{body.trim() || t.adminBilling.notifBodyFallback}</p>
                <p className="mt-2 text-xs font-semibold text-faint">{targetLabel(targetType)} · {channels.inApp ? 'in-app' : ''}{channels.inApp && channels.webPush ? ' + ' : ''}{channels.webPush ? 'web push' : ''}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-3 min-w-0">
          <Card className="overflow-hidden p-0">
            {loadingCampaigns && campaigns.length === 0 ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
              </div>
            ) : campaigns.length === 0 ? (
              <EmptyState icon={<Bell size={28} />} title={t.adminBilling.noCampaignsTitle} description={t.adminBilling.noCampaignsDescription} />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => setSelectedId(campaign.id)}
                    className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(13rem,1fr)_8rem_7rem_8rem] lg:items-center ${selected?.id === campaign.id ? 'bg-brand-500/8' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-app">{campaign.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{targetLabel(campaign.targetType)} · {formatDate(campaign.createdAt)}</span>
                    </span>
                    <span className="text-sm font-bold text-app">{t.adminBilling.targetUsersCount({ n: campaign.targetCount })}</span>
                    <span className="text-sm font-extrabold text-app">{campaign.pushSent}/{campaign.pushFailed}</span>
                    <span className="lg:justify-self-end"><NotificationStatusBadge status={campaign.status} /></span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </section>

        <DeliveryPanel campaign={selected} deliveries={deliveries} loading={loadingDeliveries} />
      </div>
    </div>
  )
}

function DeliveryPanel({
  campaign,
  deliveries,
  loading,
}: {
  campaign: AdminNotificationCampaign | null
  deliveries: AdminNotificationDelivery[]
  loading: boolean
}) {
  const t = useT()
  if (!campaign) {
    return (
      <aside className="card h-fit p-5 text-center xl:sticky xl:top-6">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
          <Bell size={20} />
        </div>
        <p className="mt-3 font-bold text-app">{t.adminBilling.noCampaignSelectedTitle}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{t.adminBilling.noCampaignSelectedDescription}</p>
      </aside>
    )
  }

  return (
    <aside className="card h-fit p-5 xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{t.adminBilling.deliveryLogLabel}</p>
          <h3 className="mt-1 truncate text-lg font-extrabold text-app">{campaign.title}</h3>
        </div>
        <NotificationStatusBadge status={campaign.status} />
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <MetaRow label={t.adminBilling.labelAudience} value={targetLabel(campaign.targetType)} />
        <MetaRow label="In-app" value={String(campaign.inAppSent)} />
        <MetaRow label="Push" value={t.adminBilling.pushSummary({ sent: campaign.pushSent, failed: campaign.pushFailed })} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">{t.adminBilling.recentLabel}</p>
        {loading && deliveries.length === 0 ? (
          <div className="space-y-2">
            {[0, 1].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
          </div>
        ) : deliveries.length === 0 ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-muted">{t.adminBilling.noDeliveries}</p>
        ) : (
          <div className="space-y-2">
            {deliveries.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-app">{item.userEmail ?? item.userId ?? t.adminBilling.unknownUser}</p>
                  <DeliveryStatusBadge status={item.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted">{CHANNEL_LABEL[item.channel]} · {item.sentAt ? formatDate(item.sentAt) : formatDate(item.createdAt)}</p>
                {item.errorMessage && <p className="mt-1 break-words text-xs text-neg">{item.errorMessage}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function ChannelToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-brand-400/40 bg-brand-500/10' : 'border-[var(--border)] bg-[var(--surface-2)]'}`}
    >
      <span className="block text-sm font-extrabold text-app">{label}</span>
      <span className="mt-0.5 block text-xs font-semibold text-muted">{active ? t.adminBilling.on : t.adminBilling.off}</span>
    </button>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-0.5 break-words font-semibold text-app">{value}</p>
    </div>
  )
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'muted' }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${tone === 'pos' ? 'text-pos' : tone === 'brand' ? 'text-brand-600 dark:text-brand-300' : 'text-muted'}`}>{value}</p>
    </div>
  )
}

function NotificationStatusBadge({ status }: { status: AdminNotificationStatus }) {
  const tone = status === 'sent' ? 'pos' : status === 'failed' ? 'neg' : 'muted'
  return <Badge tone={tone}>{notificationStatusLabel(status)}</Badge>
}

function DeliveryStatusBadge({ status }: { status: AdminNotificationDeliveryStatus }) {
  const tone = status === 'sent' ? 'pos' : status === 'failed' ? 'neg' : 'muted'
  return <Badge tone={tone}>{deliveryStatusLabel(status)}</Badge>
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function targetLabel(targetType: AdminNotificationTargetType) {
  const a = t().adminBilling
  if (targetType === 'all') return a.targetAllUsers
  if (targetType === 'free') return a.targetFreeUsers
  if (targetType === 'premium') return a.targetPremiumUsers
  if (targetType === 'user') return a.targetSpecificUser
  return a.targetSpecificGroup
}

function notificationStatusLabel(status: AdminNotificationStatus) {
  const a = t().adminBilling
  if (status === 'draft') return a.notifStatusDraft
  if (status === 'scheduled') return a.notifStatusScheduled
  if (status === 'sending') return a.notifStatusSending
  if (status === 'sent') return a.sent
  if (status === 'failed') return a.notifStatusFailed
  return a.notifStatusCancelled
}

function deliveryStatusLabel(status: AdminNotificationDeliveryStatus) {
  const a = t().adminBilling
  if (status === 'pending') return a.pending
  if (status === 'sent') return a.sent
  if (status === 'failed') return a.notifStatusFailed
  return a.deliverySkipped
}
