import type { vi } from '../vi'

export const home: typeof vi.home = {
  // ── Dashboard ──
  greeting: (p: { name: string }) => `Hi ${p.name} 👋`,
  hello: 'Hello 👋',
  profile: 'Profile',
  welcomeTitle: 'Welcome to Splitz',
  welcomeDescription: 'Create your first group to start tracking expenses and splitting fairly.',
  createFirstGroup: 'Create first group',
  loadFailedTitle: 'Couldn’t load groups',
  aiInsightTitle: 'AI spending insights',
  aiInsightSubtitle: 'Spending review, trends & settlement suggestions',
  insightTitle: 'Spending insights',
  needsSettlement: 'Needs settling',
  recent: 'Recent',
  viewGroups: 'View groups',
  allSettled: 'You’re all settled up',
  youOwe: 'You owe',
  youAreOwed: 'You’re owed',
  details: 'Details',
  toReceive: 'To receive',
  toPay: 'To pay',
  totalSpendAllGroups: 'Total across groups',
  setNameHint: 'Set your name in Settings to see whether you owe or are owed.',
  oweAmount: (p: { amount: string }) => `Owe ${p.amount}`,
  receiveAmount: (p: { amount: string }) => `Receive ${p.amount}`,
  notSettled: 'Not settled',
  paidBy: (p: { name: string }) => `${p.name} paid`,

  // ── Cross-group debts ──
  crossGroupTitle: 'Cross-group debts',
  crossGroupMergeHint: (p: { n: number }) => `Mergeable with ${p.n} people across groups.`,
  unlock: 'Unlock',
  youPay: 'You pay',
  youReceive: 'You receive',
  totalToPay: 'To pay',
  sharedGroups: (p: { n: number }) => `${p.n} shared group${p.n === 1 ? '' : 's'}`,
  receiveShort: 'Receive',
  payShort: 'Pay',
  openSettleTab: 'Open settle tab',

  // ── Groups ──
  groups: 'Groups',
  groupsEmptyTitle: 'No groups yet',
  join: 'Join',
  joinByCode: 'Join by code/link',
  createGroup: 'New group',
  needsSettleShort: 'Settle',
  totalSpendLabel: 'Total spent',
  noMembers: 'No one yet',

  // ── Join group ──
  joinGroup: 'Join group',
  joinedToast: 'Joined the group',
  joinFailed: 'Couldn’t join the group.',
  loginRequiredTitle: 'Sign in to join',
  loginRequiredDescription:
    'Joining via link/code requires a Splitz cloud account.',
  backHome: 'Back to home',
  invalidInviteTitle: 'Invalid invite',
  invalidInviteDescription: 'The invite may have expired or been revoked.',
  invitedTo: 'You’re invited to join',
  memberCount: (p: { n: number }) => `${p.n} member${p.n === 1 ? '' : 's'}`,
  claimIdentity: (p: { name: string }) => `Join as “${p.name}” in the group`,
  inviteExpired: 'This invite has expired or run out of uses.',
  loginToJoin: 'Sign in to join',
  joinHintPaste: 'Paste',
  joinHintLinkInvite: 'invite link',
  joinHintOrEnter: 'or enter',
  joinHintGroupCode: 'group code',
  joinHintSuffix: 'you received to join.',
  inviteFieldLabel: 'Invite link or group code',
  invitePlaceholder: 'e.g. ABC123 or https://…/join/…',
  continueLabel: 'Continue',

  // ── Manage group ──
  editGroup: 'Edit group',
  groupName: 'Group name',
  editNameAndEmoji: 'Edit name & icon',
  deleteGroup: 'Delete group',
  deleteConfirmTitle: (p: { name: string }) => `Delete group “${p.name}”?`,
  deleteConfirmDescription:
    'All expenses and members in this group will be permanently removed.',
  updatedToast: 'Group updated',
  deletedToast: 'Group deleted',

  // ── New group ──
  newGroupTitle: 'New group',
  groupNameExample: 'e.g. Da Lat in June, Team lunch…',
  creating: 'Creating…',
  addOthersCloud: 'Add others (you’re already a member)',
  members: 'Members',
  memberNamePlaceholder: (p: { n: number }) => `Member ${p.n} name`,
  removeMember: 'Remove',
  addMember: 'Add member',
  createFailed: 'Couldn’t create the group.',

  // ── Spending insights ──
  insightIntroDescription:
    'Splitz reads your numbers and surfaces insights: what you spend the most on, who spends the most, this month’s trends and settlement suggestions.',
  observationLabel: 'Insight',
  aiDisclaimer:
    'Numbers are calculated exactly by Splitz; the narrative is AI-written and may not be perfect.',
  quotaOutMessage:
    'You’ve used all free insights for this month. Upgrade to Premium for unlimited insights (open in Settings → Plans).',
  analyzing: 'Analyzing…',
  reanalyze: 'Regenerate',
  generateInsight: 'Generate insights',
  insightFailed: 'Couldn’t generate the analysis.',
  freeRemaining: (p: { n: number }) =>
    `Free — ${p.n} AI insight${p.n === 1 ? '' : 's'} left this month. Premium is unlimited.`,

  // ── Navigation ──
  navHome: 'Home',
  navNotifications: 'Notifications',
  navSettings: 'Settings',
  addExpense: 'Add expense',
  navTagline: 'Group expense splitting',
  recordExpense: 'New expense',
  notHoldingFunds: 'We don’t hold your money',
  transparencyNote:
    'Splitz only records expenses, creates QR codes and two-way confirmations to keep debts transparent.',
}
