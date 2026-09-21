import type { vi } from '../vi'

export const adminPages: typeof vi.adminPages = {
  // ── Module groups ──
  group: {
    operations: 'Operations',
    growth: 'Growth',
    configuration: 'Configuration',
    control: 'Control',
  },

  // ── Module metadata (consoleModules) ──
  modules: {
    health: {
      label: 'Ops dashboard',
      summary: 'Supabase, Edge Functions, Resend, AI, PayOS, recent jobs and recent errors.',
      bullets: ['Health cards', 'Provider checks', 'Recent jobs', 'Recent errors'],
    },
    notifications: {
      label: 'System notifications',
      summary: 'Send in-app/web push with preview, scheduling, retry and delivery logs.',
      bullets: ['Send now', 'Schedule', 'Pick users/groups/plans', 'Preview + confirm'],
    },
    jobs: {
      label: 'Job schedule',
      summary: 'Track completed, upcoming and failed jobs with recent errors.',
      bullets: ['Pending/running/done/failed', 'Read-only details', 'Retry/cancel locked'],
    },
    redeem: {
      label: 'Premium codes',
      summary: 'Create single/batch codes, campaigns, lookup, revoke and usage history.',
      bullets: ['Single/batch codes', 'Campaign prefix', 'Revoke codes', 'Usage history'],
    },
    billing: {
      label: 'Billing / Premium',
      summary: 'Track Premium plans, payment orders, PayOS webhooks and user status.',
      bullets: ['Premium plans', 'Payment orders', 'Webhook health', 'Manual grants with audit'],
    },
    ai: {
      label: 'AI operations',
      summary: 'Toggle AI, quotas, model/providers, prompt templates and parser/OCR/insight testing.',
      bullets: ['Feature flags', 'Quotas', 'Providers/models', 'Filtered test results'],
    },
    email: {
      label: 'Email / Resend',
      summary: 'Check Resend, send test emails, templates and delivery errors.',
      bullets: ['Resend health', 'Test email', 'Templates', 'Delivery errors'],
    },
    config: {
      label: 'System settings',
      summary: 'Feature flags, kill switch, maintenance banner and plan limits.',
      bullets: ['Feature flags', 'Plan limits', 'Maintenance', 'Approval mode'],
    },
    support: {
      label: 'User / group support',
      summary: 'Read-only support views for users, groups, Premium, redeem and AI usage.',
      bullets: ['User lookup', 'Group roles', 'Premium', 'Read-only priority'],
    },
    adminAccess: {
      label: 'Admin access',
      summary: 'Manage who can enter the console, roles, status and mandatory audit.',
      bullets: ['Owner-only', 'Role/status', 'Mandatory audit', 'No SQL actions'],
    },
    releases: {
      label: 'Release notes',
      summary: 'Draft in-app announcements and link them to notification campaigns.',
      bullets: ['Draft/publish', 'Preview', 'Campaign linking'],
    },
    dataQuality: {
      label: 'Data quality',
      summary: 'Scanner that detects anomalous data; cleanup only after rules exist.',
      bullets: ['Read-only scanner', 'Issue list', 'Dry-run before cleanup'],
    },
    audit: {
      label: 'Audit log',
      summary: 'Admin activity history with redacted payloads, statuses and errors.',
      bullets: ['Actor/action/time', 'Payload summary', 'Success/failure', 'Filters'],
    },
  },

  // ── Navigation shell ──
  shell: {
    backToApp: 'Back to Splitz',
    today: 'Today',
    showAdvancedMenu: 'Show advanced menu',
    hideAdvancedMenu: 'Hide advanced menu',
    toReview: 'To review',
    homeSummary: 'A no-code screen for what needs handling, quick actions and paths into advanced areas.',
  },

  // ── Access gate ──
  gate: {
    openingTitle: 'Opening Splitz',
    openingDescription: 'Please wait a moment.',
  },

  // ── useConsoleAccess ──
  contextMissingProvider: 'useConsoleAccess must be used inside a ConsoleAccessProvider.',

  // ── Console home ──
  home: {
    advancedModeBadge: 'Advanced mode',
    today: 'Today',
    intro:
      'Open the console to see what to check first, which actions are quick and which parts are only for deep dives. Critical actions still go through guards, preview, confirm and audit.',
    securityLabel: 'Security',
    securityValue: 'Admin guard',
    auditLabel: 'Logged',
    auditValue: 'Audit on',
    priorityLabel: 'Priority',
    priorityValue: 'Task-first',
    quickGuideTitle: 'Simplest way to use it',
    quickGuideSubtitle: 'Check alerts first, act after',
    guideNoLinkInApp: 'No links exposed in the user app',
    guideNoSecretFrontend: 'No secrets in the frontend',
    guideUserRedirect: 'Regular users visiting /console are sent back home',
    prioritiesTitle: 'Priority center',
    prioritiesDescription: 'Handle first: open exactly where you need to look, without reading every module.',
    noHiddenScan: 'No hidden scans',
    suggestedNextStep: 'Suggested handling',
    quickTasksTitle: 'Quick tasks',
    quickTasksDescription: 'Frequent ops tasks, opening the right screen right away.',
    guidedBadge: 'Guided',
    guidedFlowBadge: 'Guided workflow',
    beforeYouStart: 'Before you start',
    steps: 'Steps',
    confirmReminder: 'Reminder before opening',
    noHiddenActions: 'No hidden actions',
    quickHealthTitle: 'Quick health',
    healthSystemLabel: 'System',
    healthSystemValue: 'View health',
    healthJobsLabel: 'Jobs',
    healthJobsValue: 'Track jobs',
    healthDataLabel: 'Data',
    healthDataValue: 'Read-only scanner',
    advancedTitle: 'Advanced',
    advancedDeepOnly: 'Only for deep dives per module, checking logs or handling specific cases.',
    advancedOffHint: 'Advanced mode is off. Only turn it on when you need to go deeper than daily operations.',
    hideAdvanced: 'Hide advanced mode',
    showAdvanced: 'Show advanced mode',
    advancedOnBadge: 'Advanced mode is on',
    moduleCount: (p: { n: number }) => `${p.n} module${p.n === 1 ? '' : 's'}`,
    advancedShortBadge: 'Advanced',
    notForDailyTasks: 'Not for daily tasks',
    advancedClosedTitle: 'Advanced mode is closed.',
  },

  // ── Guided quick tasks ──
  guided: {
    redeem: {
      title: 'Create Premium codes',
      description: 'Create daily/monthly codes, batches or check existing codes.',
      badge: 'Redeem',
      beforeYouStart: ['Pick the number of Premium days', 'Check the campaign prefix'],
      steps: ['Open the code form', 'Pick plan and expiry', 'Save and re-check the code'],
      confirmNote: 'Check the code after creating, then review usage history to make sure it works.',
      actionLabel: 'Open Premium codes',
    },
    notifications: {
      title: 'Send system notifications',
      description: 'Compose, preview and send in-app/web push with controls.',
      badge: 'Push',
      beforeYouStart: ['Pick the right audience', 'Check the preview content'],
      steps: ['Compose the content', 'Pick the target', 'Confirm the schedule'],
      confirmNote: 'Only send after checking the preview and the audience.',
      actionLabel: 'Open system notifications',
    },
    support: {
      title: 'Check a user',
      description: 'Look up profile, groups, Premium, redeem and AI usage in read-only mode.',
      badge: 'Support',
      beforeYouStart: ['Prepare the email or user ID', 'Decide which part you need'],
      steps: ['Look up the user', 'Check groups and Premium', 'Read related history'],
      confirmNote: 'Support views are read-only and never touch financial data.',
      actionLabel: 'Open user / group support',
    },
    config: {
      title: 'Enable maintenance banner',
      description: 'Go to system settings, maintenance banner and kill switch.',
      badge: 'Config',
      beforeYouStart: ['Check the maintenance window', 'Write short, clear content'],
      steps: ['Open system settings', 'Enable the maintenance banner', 'Save and re-check'],
      confirmNote: 'Only enable the banner once timing and content are agreed.',
      actionLabel: 'Open system settings',
    },
    releases: {
      title: 'Draft release notes',
      description: 'Write release notes and prepare the in-app announcement.',
      badge: 'Release',
      beforeYouStart: ['Summarize changes in 3-4 points', 'Keep the tone concise'],
      steps: ['Write the content', 'Review the preview', 'Attach to the announcement'],
      confirmNote: 'Avoid long technical details in this announcement.',
      actionLabel: 'Open release notes',
    },
    email: {
      title: 'Send a test email',
      description: 'Check Resend, templates and recent delivery errors.',
      badge: 'Email',
      beforeYouStart: ['Pick the test recipient', 'Pick the right template'],
      steps: ['Open the email screen', 'Send the test', 'Read the response log'],
      confirmNote: 'If the test email does not arrive, check the log before changing config.',
      actionLabel: 'Open Email / Resend',
    },
  },

  // ── Priority center ──
  issues: {
    health: {
      title: 'Run a system health check',
      signal: 'Use when you need to know whether Supabase, Edge Functions, Resend, AI, PayOS or push are healthy.',
      nextStep: 'Open the ops dashboard, read the failed/missing cards first, then go deeper.',
      actionLabel: 'Open ops dashboard',
    },
    jobs: {
      title: 'Review failed job runs',
      signal:
        'Use when notification jobs, reminders or admin jobs run slow, fail or need a recent status check.',
      nextStep: 'Open the schedule, filter failed/running and read the latest error before retrying manually.',
      actionLabel: 'View job schedule',
    },
    dataQuality: {
      title: 'Check for anomalous data',
      signal:
        'Use when you suspect a group without owner, mismatched subscriptions, long pending payments or redeem count mismatches.',
      nextStep: 'Open the read-only scanner, review critical issues first; cleanup stays locked until rules exist.',
      actionLabel: 'Open data quality',
    },
    audit: {
      title: 'Review admin activity',
      signal: 'Use when you need to know who created codes, sent notifications, changed config or which action failed.',
      nextStep: 'Open the audit history, filter by failed or related action, then read the redacted payload.',
      actionLabel: 'Open audit log',
    },
  },

  priority: {
    high: 'High priority',
    medium: 'Medium priority',
    low: 'Watch later',
  },

  // ── Unbuilt module page ──
  modulePage: {
    notImplementedBadge: 'Not built yet',
    actionLocked: 'Action locked',
    scopeTitle: 'Module scope',
    phaseStatusTitle: 'Phase 1 status',
    phaseStatusDescription:
      'The route is ready in the console shell. Backend actions, real data and audit logs will be wired in the matching phase.',
    apiLabel: 'Real API',
    apiNotCalled: 'Not called yet',
    auditLabel: 'Audit',
    auditPhaseValue: 'Phase 2',
    confirmLabel: 'Confirm',
    confirmLaterValue: 'Required later',
  },

  // ── Audit page ──
  audit: {
    phaseBadge: 'Phase 2',
    rpcBadge: 'Admin RPC',
    title: 'Audit log',
    description:
      'Admin activity is read through a guarded RPC. Payloads are shown as redacted summaries to avoid leaking secrets.',
    refresh: 'Refresh',
    filterAll: 'All',
    success: 'Success',
    failed: 'Failed',
    viewingLabel: 'Logs viewed',
    filterPlaceholder: 'Filter by action, e.g. redeem.create',
    emptyTitle: 'No audit logs yet',
    emptyDescription: 'Once real admin actions ship in later phases, logs will appear here.',
    unknownActor: 'Unknown actor',
    unknownRole: 'unknown role',
    systemTarget: 'system',
    detailTitle: 'Log details',
    actorLabel: 'Actor',
    roleLabel: 'Role',
    timeLabel: 'Time',
    targetLabel: 'Target',
    unknown: 'Unknown',
    unknownRoleShort: 'unknown',
    errorLabel: 'Error',
    payloadSummary: 'Payload summary',
    noLogTitle: 'No log selected',
    noLogDescription: 'Pick an audit row to see its payload and full error.',
  },
}
