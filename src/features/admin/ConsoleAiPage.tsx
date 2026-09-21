import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BrainCircuit,
  FileText,
  Gauge,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  TestTube2,
  TriangleAlert,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input, Segmented } from '../../components/ui'
import { useT, type Dict } from '../../lib/i18n'
import { getIntlLocale } from '../../lib/i18n/locale'
import {
  loadAdminAiSnapshot,
  resetAdminAiQuota,
  saveAdminAiConfig,
  testAdminAiInsight,
  testAdminAiOcr,
  testAdminAiParse,
  type AdminAiFeature,
  type AdminAiFeatureFilter,
  type AdminAiFeatureFlag,
  type AdminAiPromptVersion,
  type AdminAiProviderName,
  type AdminAiSnapshot,
  type AdminAiStatus,
  type AdminAiUsageRow,
} from '../../lib/adminAi'

type TestMode = 'parse' | 'ocr' | 'insight'

const TEST_MODE_OPTIONS: { value: TestMode; label: string }[] = [
  { value: 'parse', label: 'Parser' },
  { value: 'ocr', label: 'OCR' },
  { value: 'insight', label: 'Insight' },
]

const PROMPT_KEYS: AdminAiFeature[] = ['parse_expense', 'ocr_receipt', 'insight']

function featureLabel(t: Dict, feature: AdminAiFeature) {
  if (feature === 'parse_expense') return t.adminSystem.aiFeatureParse
  if (feature === 'ocr_receipt') return t.adminSystem.aiFeatureOcr
  return t.adminSystem.aiFeatureInsight
}

export function ConsoleAiPage() {
  const t = useT()
  const [snapshot, setSnapshot] = useState<AdminAiSnapshot | null>(null)
  const [period, setPeriod] = useState(currentPeriod())
  const [feature, setFeature] = useState<AdminAiFeatureFilter>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [providerActive, setProviderActive] = useState<AdminAiProviderName>('gemini')
  const [providerFallback, setProviderFallback] = useState<AdminAiProviderName>('deepseek')
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash')
  const [deepseekModel, setDeepseekModel] = useState('deepseek-v4-flash')
  const [flags, setFlags] = useState({ parseExpense: true, ocrReceipt: true, insight: true })
  const [quotas, setQuotas] = useState({ parseFree: 15, ocrFree: 3, insightFree: 3 })
  const [prompts, setPrompts] = useState<Record<AdminAiFeature, string>>({ parse_expense: '', ocr_receipt: '', insight: '' })

  const [testMode, setTestMode] = useState<TestMode>('parse')
  const [parseText, setParseText] = useState('An trả cafe 150k cho An, Bình và Chi')
  const [memberNames, setMemberNames] = useState('An, Bình, Chi')
  const [ocrBase64, setOcrBase64] = useState('')
  const [ocrMime, setOcrMime] = useState('image/jpeg')
  const [ocrFileName, setOcrFileName] = useState('')
  const [insightStats, setInsightStats] = useState('{"scope":"dashboard","totalSpent":1230000,"topCategory":"Ăn uống"}')
  const [testResult, setTestResult] = useState<unknown>(null)

  const [resetEmail, setResetEmail] = useState('')
  const [resetFeature, setResetFeature] = useState<AdminAiFeature>('parse_expense')

  const hydrateSnapshot = useCallback((next: AdminAiSnapshot) => {
    setProviderActive(next.provider.active)
    setProviderFallback(next.provider.fallback)
    setGeminiModel(next.provider.geminiModel)
    setDeepseekModel(next.provider.deepseekModel)
    setFlags({
      parseExpense: flagEnabled(next.flags, 'ai_parse_expense'),
      ocrReceipt: flagEnabled(next.flags, 'ai_ocr_receipt'),
      insight: flagEnabled(next.flags, 'ai_insight'),
    })
    setQuotas({
      parseFree: quotaValue(next, 'parse_expense', 15),
      ocrFree: quotaValue(next, 'ocr_receipt', 3),
      insightFree: quotaValue(next, 'insight', 3),
    })
    setPrompts({
      parse_expense: promptValue(next.prompts, 'parse_expense'),
      ocr_receipt: promptValue(next.prompts, 'ocr_receipt'),
      insight: promptValue(next.prompts, 'insight'),
    })
  }, [])

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await loadAdminAiSnapshot(undefined, { period, feature })
    setSnapshot(next)
    if (next) {
      hydrateSnapshot(next)
      setNotice(null)
    } else {
      setNotice(t.adminSystem.aiLoadFailed)
    }
    setLoading(false)
  }, [feature, hydrateSnapshot, period, t])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSnapshot()
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [loadSnapshot])

  const usageTotal = useMemo(
    () => snapshot?.usageSummary.reduce((total, item) => total + item.totalCount, 0) ?? 0,
    [snapshot?.usageSummary],
  )
  const enabledCount = Object.values(flags).filter(Boolean).length
  const promptVersions = snapshot?.prompts ?? []

  async function onSaveConfig() {
    setBusy(true)
    setNotice(null)
    const saved = await saveAdminAiConfig(undefined, {
      provider: {
        active: providerActive,
        fallback: providerFallback,
        geminiModel,
        deepseekModel,
      },
      flags,
      quotas,
      prompts: {
        parseExpense: prompts.parse_expense,
        ocrReceipt: prompts.ocr_receipt,
        insight: prompts.insight,
      },
    })
    setNotice(saved ? t.adminSystem.aiSavedConfig : t.adminSystem.aiSaveConfigFailed)
    if (saved) await loadSnapshot()
    setBusy(false)
  }

  async function onRunTest() {
    setBusy(true)
    setNotice(null)
    setTestResult(null)
    let result: Record<string, unknown> | null
    if (testMode === 'parse') {
      result = await testAdminAiParse(undefined, {
        text: parseText,
        memberNames: memberNames.split(',').map((name) => name.trim()).filter(Boolean),
      })
    } else if (testMode === 'ocr') {
      if (!ocrBase64) {
        setNotice(t.adminSystem.aiOcrImageRequired)
        setBusy(false)
        return
      }
      result = await testAdminAiOcr(undefined, { imageBase64: ocrBase64, mimeType: ocrMime })
    } else {
      try {
        result = await testAdminAiInsight(undefined, { stats: JSON.parse(insightStats) })
      } catch {
        setNotice(t.adminSystem.aiInsightStatsInvalid)
        setBusy(false)
        return
      }
    }
    setTestResult(result)
    setNotice(result ? t.adminSystem.aiTestDone : t.adminSystem.aiTestFailed)
    setBusy(false)
  }

  async function onResetQuota(row?: AdminAiUsageRow) {
    const targetEmail = row?.userEmail ?? resetEmail.trim()
    const targetFeature = row?.feature ?? resetFeature
    if (!targetEmail) {
      setNotice(t.adminSystem.aiResetEmailRequired)
      return
    }
    const ok = window.confirm(t.adminSystem.aiResetQuotaConfirm({ feature: featureLabel(t, targetFeature), email: targetEmail, period }))
    if (!ok) return
    setBusy(true)
    const result = await resetAdminAiQuota(undefined, { userEmail: targetEmail, feature: targetFeature, period })
    setNotice(result ? t.adminSystem.aiResetQuotaDone : t.adminSystem.aiResetQuotaFailed)
    if (result) await loadSnapshot()
    setBusy(false)
  }

  async function onOcrFileChange(file: File | null) {
    if (!file) return
    setOcrFileName(file.name)
    setOcrMime(file.type || 'image/jpeg')
    const dataUrl = await readFileAsDataUrl(file)
    const base64 = dataUrl.split(',')[1] ?? ''
    setOcrBase64(base64)
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 6</Badge>
              <AiStatusBadge status={snapshot?.summaryStatus ?? 'unknown'} />
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-app lg:text-3xl">{t.adminSystem.aiTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {t.adminSystem.aiDescription}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading || busy}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} {t.adminSystem.refresh}
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <SummaryPill label={t.adminSystem.aiPillProvider} value={snapshot?.provider.active ?? providerActive} tone="brand" />
          <SummaryPill label={t.adminSystem.aiPillFeaturesOn} value={`${enabledCount}/3`} tone={enabledCount === 3 ? 'pos' : 'warn'} />
          <SummaryPill label={t.adminSystem.aiPillUsage} value={formatNumber(usageTotal)} tone="brand" />
          <SummaryPill label={t.adminSystem.aiPillLastCheck} value={snapshot ? formatDate(snapshot.checkedAt) : loading ? t.adminSystem.loading : t.adminSystem.noneYet} tone="pos" />
        </div>
        {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="space-y-4 min-w-0">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
                <BrainCircuit size={20} />
              </span>
              <div>
                <h3 className="font-extrabold text-app">{t.adminSystem.aiRunConfigTitle}</h3>
                <p className="text-xs text-muted">{t.adminSystem.aiRunConfigHint}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <Field label={t.adminSystem.aiProviderPrimary}>
                <select value={providerActive} onChange={(event) => setProviderActive(event.target.value as AdminAiProviderName)} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-semibold text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30">
                  <option value="gemini">Gemini</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </Field>
              <Field label={t.adminSystem.aiProviderFallback}>
                <select value={providerFallback} onChange={(event) => setProviderFallback(event.target.value as AdminAiProviderName)} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-semibold text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30">
                  <option value="deepseek">DeepSeek</option>
                  <option value="gemini">Gemini</option>
                </select>
              </Field>
              <Field label="Model Gemini">
                <Input value={geminiModel} onChange={(event) => setGeminiModel(event.target.value)} />
              </Field>
              <Field label="Model DeepSeek">
                <Input value={deepseekModel} onChange={(event) => setDeepseekModel(event.target.value)} />
              </Field>
            </div>

            {snapshot?.provider.detail && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-muted">{snapshot.provider.detail}</p>}

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <FeatureSwitch flag={flagFor(snapshot, 'ai_parse_expense')} fallbackLabel={t.adminSystem.aiFeatureParse} enabled={flags.parseExpense} onChange={(enabled) => setFlags((current) => ({ ...current, parseExpense: enabled }))} />
              <FeatureSwitch flag={flagFor(snapshot, 'ai_ocr_receipt')} fallbackLabel={t.adminSystem.aiFeatureOcr} enabled={flags.ocrReceipt} onChange={(enabled) => setFlags((current) => ({ ...current, ocrReceipt: enabled }))} />
              <FeatureSwitch flag={flagFor(snapshot, 'ai_insight')} fallbackLabel={t.adminSystem.aiFeatureInsight} enabled={flags.insight} onChange={(enabled) => setFlags((current) => ({ ...current, insight: enabled }))} />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <Field label={t.adminSystem.aiQuotaParseFree}>
                <Input type="number" min={0} value={quotas.parseFree} onChange={(event) => setQuotas((current) => ({ ...current, parseFree: toInt(event.target.value, 0, 999) }))} />
              </Field>
              <Field label={t.adminSystem.aiQuotaOcrFree}>
                <Input type="number" min={0} value={quotas.ocrFree} onChange={(event) => setQuotas((current) => ({ ...current, ocrFree: toInt(event.target.value, 0, 999) }))} />
              </Field>
              <Field label={t.adminSystem.aiQuotaInsightFree}>
                <Input type="number" min={0} value={quotas.insightFree} onChange={(event) => setQuotas((current) => ({ ...current, insightFree: toInt(event.target.value, 0, 999) }))} />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
                  <FileText size={20} />
                </span>
                <div>
                  <h3 className="font-extrabold text-app">{t.adminSystem.aiPromptTitle}</h3>
                  <p className="text-xs text-muted">{t.adminSystem.aiPromptHint}</p>
                </div>
              </div>
              <Button onClick={() => void onSaveConfig()} disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {t.adminSystem.aiSaveConfig}
              </Button>
            </div>

            <div className="mt-5 grid gap-4">
              {PROMPT_KEYS.map((key) => {
                const version = promptVersions.find((item) => item.promptKey === key)
                return (
                  <label key={key} className="block space-y-2">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-app">{featureLabel(t, key)}</span>
                      {version && <Badge tone="muted">{version.title} v{version.version}</Badge>}
                    </span>
                    <textarea
                      value={prompts[key]}
                      onChange={(event) => setPrompts((current) => ({ ...current, [key]: event.target.value }))}
                      rows={key === 'ocr_receipt' ? 5 : 8}
                      className="w-full resize-y rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm leading-6 text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                    />
                  </label>
                )
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
                  <TestTube2 size={20} />
                </span>
                <div>
                <h3 className="font-extrabold text-app">{t.adminSystem.aiTestTitle}</h3>
                  <p className="text-xs text-muted">{t.adminSystem.aiTestHint}</p>
                </div>
              </div>
              <Segmented options={TEST_MODE_OPTIONS} value={testMode} onChange={setTestMode} className="w-full lg:w-80" />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
              <div className="space-y-3">
                {testMode === 'parse' && (
                  <>
                    <Field label={t.adminSystem.aiParseInputLabel}>
                      <textarea value={parseText} onChange={(event) => setParseText(event.target.value)} rows={4} className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
                    </Field>
                    <Field label={t.adminSystem.aiMemberNamesLabel}>
                      <Input value={memberNames} onChange={(event) => setMemberNames(event.target.value)} />
                    </Field>
                  </>
                )}
                {testMode === 'ocr' && (
                  <>
                    <Field label={t.adminSystem.aiOcrImageLabel}>
                      <input type="file" accept="image/*" onChange={(event) => void onOcrFileChange(event.target.files?.[0] ?? null)} className="block w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 py-2 text-sm text-app" />
                    </Field>
                    <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-muted">
                      {ocrFileName ? `${ocrFileName} · ${ocrMime}` : t.adminSystem.aiOcrImageEmpty}
                    </p>
                  </>
                )}
                {testMode === 'insight' && (
                  <Field label={t.adminSystem.aiInsightStatsLabel}>
                    <textarea value={insightStats} onChange={(event) => setInsightStats(event.target.value)} rows={7} className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
                  </Field>
                )}
                <Button onClick={() => void onRunTest()} disabled={busy}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {testMode === 'parse' ? 'Test parser' : testMode === 'ocr' ? 'Test OCR' : 'Test insight'}
                </Button>
              </div>
              <pre className="min-h-56 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs leading-5 text-muted">
                {testResult ? formatJson(testResult) : t.adminSystem.aiTestResultEmpty}
              </pre>
            </div>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
                <Gauge size={18} />
              </span>
              <div>
                <h3 className="font-extrabold text-app">{t.adminSystem.aiUsageTitle}</h3>
                <p className="text-xs text-muted">{t.adminSystem.aiUsageHint}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <Field label={t.adminSystem.aiUsagePeriod}>
                <Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="2026-06" />
              </Field>
              <Field label={t.adminSystem.aiUsageFeature}>
                <Segmented options={[
                  { value: 'all', label: t.adminSystem.all },
                  { value: 'parse_expense', label: 'Parse' },
                  { value: 'ocr_receipt', label: 'OCR' },
                  { value: 'insight', label: 'Insight' },
                ]} value={feature} onChange={setFeature} />
              </Field>
            </div>
            <div className="mt-4 space-y-2">
              {(snapshot?.usageSummary ?? []).map((item) => (
                <div key={item.feature} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-app">{item.label}</p>
                    <Badge tone="brand">{formatNumber(item.totalCount)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{t.adminSystem.aiUsageMeta({ users: item.userCount, period: item.period })}</p>
                </div>
              ))}
              {!loading && (snapshot?.usageSummary.length ?? 0) === 0 && <EmptyState icon={<Gauge size={28} />} title={t.adminSystem.aiUsageEmptyTitle} description={t.adminSystem.aiUsageEmptyDescription} />}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
                <RotateCcw size={18} />
              </span>
              <div>
                <h3 className="font-extrabold text-app">{t.adminSystem.aiResetTitle}</h3>
                <p className="text-xs text-muted">{t.adminSystem.aiResetHint}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <Field label={t.adminSystem.aiResetEmailLabel}>
                <Input value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="user@example.com" />
              </Field>
              <Field label={t.adminSystem.aiResetFeatureLabel}>
                <select value={resetFeature} onChange={(event) => setResetFeature(event.target.value as AdminAiFeature)} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-semibold text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30">
                  <option value="parse_expense">{t.adminSystem.aiFeatureParse}</option>
                  <option value="ocr_receipt">{t.adminSystem.aiFeatureOcr}</option>
                  <option value="insight">Insight</option>
                </select>
              </Field>
              <Button variant="secondary" onClick={() => void onResetQuota()} disabled={busy}>
                <RotateCcw size={16} /> Reset quota
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            {loading && !snapshot ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
              </div>
            ) : (snapshot?.usageRows.length ?? 0) === 0 ? (
              <EmptyState icon={<BrainCircuit size={28} />} title={t.adminSystem.aiUserUsageEmptyTitle} description={t.adminSystem.aiUserUsageEmptyDescription} />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {snapshot?.usageRows.map((row) => (
                  <div key={`${row.userId}-${row.feature}-${row.period}`} className="grid gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-app">{row.userEmail ?? row.displayName ?? row.userId}</p>
                        <p className="text-xs text-muted">{featureLabel(t, row.feature)} · {row.period}</p>
                      </div>
                      <Badge tone="brand">{row.count}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => void onResetQuota(row)} disabled={busy}>
                      <RotateCcw size={14} /> {t.adminSystem.aiResetRow}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {(snapshot?.recentErrors.length ?? 0) > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-neg">
                  <TriangleAlert size={18} />
                </span>
                <div>
                  <h3 className="font-extrabold text-app">{t.adminSystem.aiErrorsTitle}</h3>
                  <p className="text-xs text-muted">{t.adminSystem.aiErrorsHint}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {snapshot?.recentErrors.map((error) => (
                  <div key={error.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="truncate text-sm font-bold text-app">{error.action ?? error.source}</p>
                    <p className="mt-1 break-words text-xs font-semibold text-neg">{error.message ?? 'unknown_error'}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}

function FeatureSwitch({
  flag,
  fallbackLabel,
  enabled,
  onChange,
}: {
  flag: AdminAiFeatureFlag | null
  fallbackLabel: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  const t = useT()
  return (
    <label className="flex min-h-28 cursor-pointer flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-extrabold text-app">{flag?.label ?? fallbackLabel}</span>
          <span className="mt-1 block text-xs leading-5 text-muted">{flag?.description ?? t.adminSystem.aiFlagFallbackDescription}</span>
        </span>
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? 'bg-brand-500' : 'bg-[var(--surface-3)]'}`}>
          <input type="checkbox" className="sr-only" checked={enabled} onChange={(event) => onChange(event.target.checked)} />
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-soft transition ${enabled ? 'left-6' : 'left-1'}`} />
        </span>
      </span>
      <span className="mt-3 text-xs font-bold uppercase text-faint">{enabled ? t.adminSystem.on : t.adminSystem.off}</span>
    </label>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'warn' }) {
  const valueClass = tone === 'pos' ? 'text-pos' : tone === 'warn' ? 'text-neg' : 'text-brand-600 dark:text-brand-300'
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-xs font-bold uppercase text-faint">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-extrabold ${valueClass}`}>{value}</p>
    </div>
  )
}

function AiStatusBadge({ status }: { status: AdminAiStatus }) {
  const t = useT()
  const tone = status === 'ok' || status === 'configured' ? 'pos' : status === 'unknown' ? 'muted' : 'neg'
  return <Badge tone={tone}>{status === 'configured' || status === 'ok' ? t.adminSystem.statusConfigured : status === 'missing' ? t.adminSystem.statusMissing : status === 'failed' ? t.adminSystem.statusFailed : t.adminSystem.statusUnknown}</Badge>
}

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function flagEnabled(flags: AdminAiFeatureFlag[], key: AdminAiFeatureFlag['key']) {
  return flags.find((flag) => flag.key === key)?.enabled ?? true
}

function flagFor(snapshot: AdminAiSnapshot | null, key: AdminAiFeatureFlag['key']) {
  return snapshot?.flags.find((flag) => flag.key === key) ?? null
}

function quotaValue(snapshot: AdminAiSnapshot, feature: AdminAiFeature, fallback: number) {
  return snapshot.quotas.find((quota) => quota.feature === feature)?.freeLimit ?? fallback
}

function promptValue(prompts: AdminAiPromptVersion[], key: AdminAiFeature) {
  return prompts.find((prompt) => prompt.promptKey === key)?.prompt ?? ''
}

function toInt(value: string, min: number, max: number) {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return min
  return Math.min(Math.max(n, min), max)
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(getIntlLocale()).format(value)
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return String(value ?? '')
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
