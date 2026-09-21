import type { vi } from '../vi'

export const group: typeof vi.group = {
  // ── Group screen / tabs ──
  expensesTab: 'Expenses',
  settleTab: 'Settle up',
  totalSpent: 'Total spent',
  expenseNoun: 'Expenses',
  defaultExpenseTitle: 'Expense',
  members: 'Members',
  groupSpace: 'Group space',
  settingsShort: 'Settings',
  addExpense: 'Add expense',
  insightAria: 'AI insights',
  insightTitle: (p: { name: string }) => `Insights · ${p.name}`,
  backToGroups: 'Back to groups',
  loadErrorTitle: "Couldn't load this group.",
  notFoundTitle: 'Group not found.',

  // ── Desktop panel ──
  itemsPending: (p: { n: number }) => `${p.n} item${p.n === 1 ? '' : 's'}`,
  pendingSettlements: 'Still to settle',
  transfersRemaining: (p: { n: number; amount: string }) =>
    `${p.n} transfer${p.n === 1 ? '' : 's'} remaining — ${p.amount} suggested in total.`,
  awaitingConfirmations: 'Some payments are awaiting confirmation from both sides.',
  moreMembers: (p: { n: number }) => `+${p.n} more member${p.n === 1 ? '' : 's'}`,
  hasQr: 'QR transfer ready',

  // ── Group settings sheet ──
  settingsTitle: 'Group settings',
  saveChanges: 'Save changes',
  savedToast: 'Group saved',
  namePlaceholder: 'Group name',
  youAreMemberHint: "You're a member of this group.",
  leaveButKeepHint:
    'Want to leave but keep the group? Open a member who has an account → “Transfer ownership”, then you can leave.',

  // ── Members ──
  membersCount: (p: { n: number }) => `Members (${p.n})`,
  defaultMemberName: (p: { n: number }) => `Member ${p.n}`,
  addMember: 'Add member',
  memberNameLabel: 'Name',
  memberNamePlaceholder: 'Member name',
  owner: 'Group owner',
  virtualNoAccount: 'Virtual member — no account yet',
  noBankAccount: 'No payout account',
  virtualMembersHint:
    'Virtual members have just a name; invite them to claim their identity so they can manage their own account.',
  freeNameHint: 'Type any name for each member.',
  claimMemberAria: 'Invite this member to claim their profile',
  deleteMemberTitle: (p: { name: string }) => `Delete ${p.name}?`,
  deleteMemberDesc: 'This member is not part of any expense yet.',

  // ── Invites ──
  inviteMembers: 'Invite members',
  inviteLink: 'Invite link',
  claimLinkLabel: 'Claim link',
  inviteCodeLabel: 'Group code',
  inviteHint:
    'Share the link or code so others can join. A “claim link” attaches the user to that exact virtual member.',
  inviteError: "Couldn't create the invite.",
  copyError: "Couldn't copy",

  // ── Settlement method ──
  settlementMethodTitle: 'Settlement method',
  methodSmart: 'Smart',
  methodMinTransfers: 'Fewest transfers',
  settlementMethodHint:
    '“Smart” settles debts directly between two people; “Fewest transfers” clusters debts to minimise the number of transfers.',

  // ── Reports ──
  reportTitle: 'Reports',
  exportReport: 'Export PDF report (with receipts)',
  reportHint:
    'Opens the print dialog to save a PDF. Receipt images are embedded; PDF receipts are listed per expense.',
  reportExportError: "Couldn't export the report.",

  // ── Danger zone: delete / leave ──
  deleteThisGroup: 'Delete this group',
  deleteGroup: 'Delete group',
  deleteGroupTitle: (p: { name: string }) => `Delete group “${p.name}”?`,
  deleteGroupDesc: 'All expenses and members will be permanently deleted.',
  deletedToast: 'Group deleted',
  leave: 'Leave group',
  leaveTitle: (p: { name: string }) => `Leave group “${p.name}”?`,
  leaveDesc: "You'll no longer see this group. You can rejoin if you're invited again.",
  leftToast: 'You left the group',
  leaveError: "Couldn't leave the group.",
  leaveDebtError: 'You still owe this group. Settle up before leaving.',
  leaveCreditError: 'The group still owes you. Finish settling up before leaving.',

  // ── Settle tab ──
  nothingToSettleTitle: 'Nothing to settle yet',
  nothingToSettleDesc:
    'Add an expense first — Splitz will suggest the optimal way to pay each other.',
  allSettledTitle: 'Everyone is square!',
  allSettledDesc: 'No one owes anyone. Every expense has been settled.',
  pendingCount: (p: { n: number }) => `Awaiting confirmation (${p.n})`,
  awaitingYourConfirm: 'Confirm you received this?',
  awaitingConfirm: (p: { name: string }) => `Waiting for ${p.name} to confirm`,
  viewProof: 'View receipt',
  received: 'Received',
  decline: 'Decline',
  waitingConfirm: 'Waiting for confirmation…',
  transfersLeftPrefix: 'Only',
  transfersLeftCount: (p: { n: number }) => `${p.n} transfer${p.n === 1 ? '' : 's'} left`,
  transfersLeftSuffix: 'to clear all debts.',
  remindAll: 'Remind all',
  pay: 'Pay',
  reminded: 'Reminded',
  remindDebt: 'Remind to pay',
  settleDisclaimer:
    'Splitz never holds your money. The payer opens the payment sheet to scan the QR or attach a receipt, then the recipient taps “Received” so the debt is cleared transparently.',
  remindedCount: (p: { n: number }) => `Reminded ${p.n} ${p.n === 1 ? 'person' : 'people'}.`,
  remindSentToast: 'Reminder sent.',
  noDeviceToast: "They haven't enabled notifications, so the reminder wasn't delivered.",
  remindCooldownToast: 'You reminded them recently — try again later.',
  remindError: "Couldn't send the reminder.",
  confirmedToast: 'Payment confirmed',
  confirmError: "Couldn't confirm.",
  cancelSettleTitle: 'Cancel this settlement?',
  cancelSettleDesc: 'The debt will go back to the pending transfers list.',
  cancelSettle: 'Cancel settlement',
  cancelledToast: 'Settlement cancelled',
  cancelError: "Couldn't cancel.",
  proofOpenError: "Couldn't open the receipt.",

  // ── Expenses tab ──
  splitEqual: 'Even split',
  splitShares: 'By shares',
  splitPercent: 'By percent',
  splitExact: 'Exact amounts',
  splitItemized: 'By item',
  paidLabel: 'paid',
  deleteForbiddenToast: 'Only the group owner or the expense creator can delete this expense.',
  deleteExpenseTitle: (p: { title: string }) => `Delete “${p.title}”?`,
  deleteExpenseDesc: (p: { amount: string }) => `${p.amount} will be removed from the group.`,
  expenseConflictToast: 'This expense changed — the list has been refreshed.',
  deleteExpenseError: "Couldn't delete the expense.",
  expenseDeletedTitle: (p: { title: string }) => `Deleted “${p.title}”`,
  expenseDeletedToast: 'Expense deleted',
  noExpensesTitle: 'No expenses yet',
  noExpensesDesc: 'Start recording what was spent to split it with the group.',

  // ── Member details sheet ──
  memberSheetTitle: 'Member details',
  hasSplitzAccount: 'Has a Splitz account',
  payoutAccount: 'Payout account',
  payoutAccountQr: 'Payout account (for QR)',
  notConfigured: 'Not set up',
  selfManagedBankHint: 'This member manages their payout details in their personal settings.',
  bankLabel: 'Bank',
  selectBank: '— Select a bank —',
  accountNumberLabel: 'Account number',
  accountNumberPlaceholder: 'e.g. 0123456789',
  accountNameLabel: 'Account holder name',
  accountNameHint: 'No diacritics, exactly as shown in the banking app.',
  accountHolder: 'Account holder',
  permissionsTitle: 'Ownership',
  transferOwnership: 'Transfer ownership',
  transferOwnershipFull: 'Transfer group ownership',
  transferOwnershipTitle: (p: { name: string }) => `Transfer ownership to ${p.name}?`,
  transferOwnershipDesc:
    'This person will become the group owner (edit/delete the group, manage members). You will become a regular member.',
  ownershipTransferredToast: 'Ownership transferred',
  transferOwnershipError: "Couldn't transfer ownership.",

  // ── QR payment sheet ──
  qrSheetTitle: 'Pay debt',
  iHavePaid: "I've transferred",
  payOtherWay: 'Other method + receipt',
  accountCopiedToast: 'Account number copied',
  qrUnavailableToast:
    "Couldn't create a QR for this payment. Pay another way and attach a receipt.",
  markedPaidToast: 'Recorded. Waiting for the recipient to confirm.',
  markPaidError: "Couldn't record the payment.",
  proofTooLarge: 'The receipt exceeds 10MB.',
  proofUploadedToast: 'Recorded with receipt. Waiting for the recipient to confirm.',
  proofFailedToast: 'The transfer was recorded but the receipt could not be attached.',
  proofUploadError: "Couldn't upload the payment receipt.",
  qrHintStart: 'Open your banking app, scan the QR and ',
  qrHintHighlight: 'check the recipient’s name',
  qrHintEnd: ' before you confirm the transfer.',
  altPaymentHint:
    'If you already paid in cash, via another app, or have a photo of the slip, use the receipt button below so the recipient can confirm more easily.',
  noBankHint:
    ' has no payout account. Add their bank details in Group settings to create a QR.',
  altPaymentStillHint:
    'You can still pay another way and attach a receipt using the button below.',

  // ── Settlement engine errors ──
  errors: {
    transferAmountPositive: 'Transfer amount must be positive.',
    cannotSelfTransfer: 'Cannot transfer to yourself.',
    totalTransferredInvalid: (p: { memberId: string }) =>
      `Total transferred by ${p.memberId} is invalid.`,
    totalReceivedInvalid: (p: { memberId: string }) =>
      `Total received by ${p.memberId} is invalid.`,
    balancedMemberNoTx: (p: { memberId: string }) =>
      `Balanced member ${p.memberId} should not have transactions.`,
    expenseNeedsParticipants: 'An expense needs at least one participant.',
    totalSharesPositive: 'Total shares must be greater than 0.',
    sharesMismatch: 'Split shares do not match the expense amount.',
  },
}
