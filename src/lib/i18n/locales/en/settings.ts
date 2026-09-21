import type { vi } from '../vi'

export const settings: typeof vi.settings = {
  title: 'Settings',
  sectionAccount: 'Account',
  sectionApp: 'App',
  sectionSupport: 'Support & legal',

  unnamed: 'No name yet',
  cloudAccount: 'Cloud account',
  localProfile: 'Local profile',

  bankAccount: 'Payout account',
  signIn: 'Sign in',
  signInHint: 'Google · Zalo — sync across devices',
  notEnabled: 'Off',

  appearance: 'Appearance',
  language: 'Language',
  data: 'Data & storage',

  faq: 'FAQ',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  tagline: 'Splitz v0.1 · Fair group expense splitting',

  // Language screen
  languageSubtitle: 'Choose your display language',
  languageNote:
    'Amounts are always in VND. Changing the language only affects date formats and digit grouping.',
  langNameVi: 'Tiếng Việt',
  langNameEn: 'English',

  // Shared
  back: 'Back',

  // Profile screen
  profileTitle: 'Profile',
  profileSaved: 'Profile saved',
  changeAvatar: 'Change profile picture',
  avatarUpdated: 'Profile picture updated',
  avatarRemoved: 'Profile picture removed',
  removeAvatar: 'Remove picture',
  avatarError: 'Could not process the image',
  imageFileRequired: 'Please choose an image file',
  displayNameLabel: 'Display name',
  displayNameHint: 'This name is shown to members of your groups.',
  namePlaceholder: 'Enter your name',
  save: 'Save',
  signOut: 'Sign out',
  signOutConfirmTitle: 'Sign out?',
  signOutConfirmDesc: 'You will need to sign in again to keep using Splitz.',

  // Payout account screen
  bankTitle: 'Payout account',
  bankInfoDesc: 'This information lets members of your groups create transfer QR codes for you.',
  bankSaved: 'Payout account saved',
  saveBank: 'Save account',
  bankMissing: 'Please complete your bank details.',
  saveFailed: 'Could not save.',

  // Appearance screen
  appearanceTitle: 'Appearance',
  chooseStyle: 'Choose a display style',
  themeLight: 'Light',
  themeDark: 'Dark',
  toggleThemeAria: 'Toggle light/dark mode',
  prestigePremiumOnly: 'The Prestige theme is exclusive to Premium members.',
  prestigeLockedNote: 'The Prestige theme (black card · gold trim) is reserved for Premium.',

  // Data & storage screen
  dataTitle: 'Data & storage',
  cloudMode: 'Cloud sync',
  localMode: 'On this device',
  cloudModeDesc: 'Data synced via Supabase',
  localModeDesc: (p: { n: number }) =>
    `${p.n} group${p.n === 1 ? '' : 's'} stored in this browser`,
  signInComingSoon: 'Sign in (coming soon) to sync across devices.',
  clearDataTitle: 'Delete all data?',
  clearDataDesc: 'All groups on this device will be deleted. This cannot be undone.',
  clearDataConfirm: 'Delete all',
  localDataCleared: 'Local data deleted',
  clearLocalData: 'Delete local data',
  transparentTitle: 'Transparent & safe',
  transparentDesc:
    'Splitz does not hold money or act as a payment intermediary. QR codes are generated directly from the recipient’s account details. Always check the recipient’s name in your banking app before transferring.',

  // PlanSheet — upgrade to Premium
  upgradeTitle: 'Upgrade to Premium',
  currentPlan: 'Current plan:',
  planPersonal: 'Personal',
  cycleMonth: 'Month',
  cycleYear: 'Year (cheaper)',
  perMonth: '/month',
  perYear: '/year',
  featureUnlimitedGroups: 'Unlimited groups',
  featureMaxMembers: 'Up to 25 members per group',
  featureUnlimitedAi: 'Unlimited AI expense entry',
  featureExportPdf: 'PDF export, multi-currency',
  featureTeamSeats: '5 premium seats for the whole group',
  payWithPayos: 'Pay with PayOS',
  payFailed: 'Could not create the payment.',
  hasActivationCode: 'Have an activation code?',
  codePlaceholder: 'Enter code',
  redeem: 'Redeem',
  planActivated: (p: { plan: string }) => `${p.plan} plan activated`,
  invalidCode: 'Invalid code.',
  payosNote:
    'Payments are processed via PayOS. Subscriptions renew semi-automatically — you pay each cycle yourself.',

  // UpgradePrompt — upgrade nudge
  closeAria: 'Close',
  unlockTitle: 'Unlock Splitz Premium',
  unlockDesc:
    'Unlimited groups, cross-group debt netting, group funds, recurring expenses — plus the Prestige theme with a black card and gold trim.',
  perkUnlimited: 'Unlimited groups · 25 members per group',
  perkAi: 'Unlimited AI expense entry',
  perkPrestige: 'Exclusive Prestige theme',
  viewPlans: 'View plans',
  later: 'Later',
  neverAgain: "Don't ask again",

  // Notifications screen
  notificationsTitle: 'Notifications',
  markAllRead: 'Mark all read',
  tabActivity: 'Activity',
  tabSystem: 'System',
  emptyActivityTitle: 'No activity yet',
  emptyActivityDesc: 'New, edited or deleted group expenses will appear here.',
  emptySystemTitle: 'No system notifications',
  emptySystemDesc: 'Account and app version updates will show up here.',

  // Plan / push / theme rows on the Settings screen
  planLabel: (p: { plan: string }) => `${p.plan} plan`,
  expiringInDays: (p: { n: number }) => `Expiring in ${p.n} day${p.n === 1 ? '' : 's'}`,
  expiresOn: (p: { date: string }) => `Expires ${p.date}`,
  planActive: 'Active',
  quotaLine: (p: { groups: string; members: string }) => `${p.groups} groups · ${p.members} members`,
  pushTitle: 'Push notifications',
  pushDesc: 'Plan renewal reminders, group activity',
  pushToggleAria: 'Toggle notifications',
  pushEnabledToast: 'Push notifications on',
  pushDisabledToast: 'Push notifications off',
  pushToggleFailed: "Couldn't change notifications.",
  themeMode: (p: { mode: string }) => `${p.mode} mode`,
  themeQuickToggle: 'Tap to switch quickly',
  themeToggleAria: 'Toggle light/dark mode',
}
