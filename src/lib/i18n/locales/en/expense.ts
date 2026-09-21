import type { vi } from '../vi'

export const expense: typeof vi.expense = {
  // ── Sheet titles ──
  addTitle: 'Add expense',
  createTitle: 'Log expense',
  editTitle: 'Edit expense',
  pickGroupTitle: 'Which group?',
  detailTitle: 'Expense details',
  historyTitle: 'Edit history',

  // ── Split modes: short (Segmented) and full labels ──
  modeEqual: 'Even',
  modeExact: 'Exact',
  modePercent: '%',
  modeShares: 'Shares',
  modeItemized: 'Items',
  splitEqual: 'Split equally',
  splitShares: 'By shares',
  splitPercent: 'Percentage',
  splitExact: 'Manual entry',
  splitItemized: 'By item',

  // ── Main form ──
  amount: 'Amount',
  amountHint: 'Try 250k, 1.2M, 50000…',
  fetchingRate: 'Fetching exchange rate…',
  enterAmount: 'Enter an amount',
  fxError: 'Could not fetch the exchange rate. Try again or pick VND.',
  rateLoading: 'Loading exchange rate, try again in a moment.',
  billTotal: 'Bill total',
  billTotalHint: 'Added up from the items below',
  titleLabel: 'Description',
  titlePlaceholder: 'E.g. Dinner, Taxi, Train tickets…',
  noteLabel: 'Note (optional)',
  notePlaceholder: 'Add details if needed',

  // ── Paid by ──
  paidBy: 'Paid by',
  splitPayerPay: 'Split payment equally',
  paidTotal: (p: { paid: string; total: string }) => `Paid ${p.paid} / ${p.total}`,

  // ── Split among ──
  splitModeLabel: 'Split mode',
  splitAmong: 'Split among',
  selectAll: 'Select all',
  deselectAll: 'Deselect all',
  sharesPlaceholder: 'shares',

  // ── Itemized ──
  addItem: 'Add item',
  itemNamePlaceholder: 'Item name',
  deleteItem: 'Delete item',
  defaultItemTitle: 'Item',
  defaultBillTitle: 'Bill',
  defaultExpenseTitle: 'Expense',
  perPerson: (p: { amount: string; count: number }) =>
    `${p.amount}/person · ${p.count} ${p.count === 1 ? 'person' : 'people'}`,

  // ── Quick parse / AI / receipt scan ──
  quickParseTitle: 'Quick entry in one line',
  quickParsePlaceholder: 'E.g. "Dinner 500k Hùng paid split equally"',
  quickFill: 'Quick fill',
  aiUnderstand: 'Smart understand',
  aiThinking: 'Understanding…',
  scanReceipt: 'Scan receipt (split by item)',
  scanningReceipt: 'Scanning receipt…',
  quickParseNoteFree: '“Quick fill” is free and instant.',
  quickParseNoteAi: '“Smart understand” uses AI for complex lines',
  quickParseNoteFreeQuota: ' · 15 free uses/month',
  quickParseNoteEditable: 'You can always edit the result.',
  quickParseQuotaLeft: (p: { n: number }) => ` · ${p.n} use${p.n === 1 ? '' : 's'} left this month`,
  filledWithQuota: (p: { n: number }) => `Filled. ${p.n} AI use${p.n === 1 ? '' : 's'} left this month.`,
  filledByAi: 'Filled with AI.',
  parseFailed: 'Could not parse that.',
  ocrNoItems: 'No items recognized in the photo. Try a clearer one.',
  ocrScanned: (p: { n: number }) => `Recognized ${p.n} item${p.n === 1 ? '' : 's'}.`,
  ocrQuotaLeft: (p: { n: number }) => ` ${p.n} scan${p.n === 1 ? '' : 's'} left this month.`,
  ocrFailed: 'Could not scan the receipt.',

  // ── Save / errors ──
  saveExpense: 'Save expense',
  saveChanges: 'Save changes',
  savedUpdated: 'Expense updated',
  savedCreated: 'Expense logged',
  receiptAttachPending: 'The receipt photo will be attached when you save.',
  receiptAttachFailed: 'Expense saved but the receipt photo could not be attached.',
  saveFailed: 'Could not save the expense.',
  conflictUpdated: 'This expense was just updated by someone else. Close and reopen to see the latest.',
  invalidExpense: 'Invalid expense.',
  needPayer: 'Pick at least one payer.',
  needValidAmount: 'Enter a valid amount.',
  needParticipant: 'Pick at least one participant.',
  needValidItem: 'Add at least one valid item (with a price and people to split it).',
  percentMustBe100: (p: { sum: string }) => `Percentages must add up to 100 (currently ${p.sum}).`,
  exactMustMatch: (p: { expected: string; actual: string }) =>
    `Manual amounts must add up to ${p.expected} (currently ${p.actual}).`,
  sharesMustBePositive: 'Total shares must be greater than 0.',
  payMustMatch: (p: { expected: string; actual: string }) =>
    `Payments must add up to ${p.expected} (currently ${p.actual}).`,
  missingExpenseForHistory: 'Missing expense to record history.',

  // ── Activity notifications ──
  someone: 'Someone',
  editedExpense: (p: { title: string }) => `Edited “${p.title}”`,
  paidExpense: (p: { name: string; title: string }) => `${p.name} paid for “${p.title}”`,

  // ── Expense details ──
  originalAmount: 'Original',
  fxRateLabel: 'rate',
  payer: 'Paid by',
  payerCount: (p: { n: number }) => `Paid by (${p.n})`,
  items: 'Items',
  eachShare: 'Each person owes',
  invalidExpenseData: 'This expense has invalid data.',
  note: 'Note',
  managePermissionNote: 'Only the group owner or the expense creator can edit or delete this expense.',
  nPeople: (p: { n: number }) => `${p.n} ${p.n === 1 ? 'person' : 'people'}`,

  // ── Attachments ──
  attachments: 'Attachments',
  attachmentsEmpty: 'No attachments yet. Tap “Add” to upload a photo or PDF.',
  attachmentFallbackName: 'Attachment',
  tapToView: 'Tap to view',
  deleteAttachment: 'Delete attachment',
  deleteAttachmentConfirm: 'Delete attachment?',
  deleteAttachmentDescription: 'This file will be permanently deleted.',
  fileTooLarge: (p: { name: string }) => `"${p.name}" exceeds 10MB.`,
  attachmentUploaded: 'Attachment uploaded',
  attachmentUploadFailed: 'Upload failed.',
  attachmentOpenFailed: 'Could not open the attachment.',
  attachmentDeleteFailed: 'Could not delete.',

  // ── Edit history ──
  viewAll: 'View all',
  historyEmpty: 'No edits recorded yet.',
  moreChanges: (p: { n: number }) => `+${p.n} more change${p.n === 1 ? '' : 's'}`,
  historyUpdatedFallback: 'Updated the expense',
  historyAdded: (p: { title: string }) => `Added “${p.title}”`,
  historyDeleted: (p: { title: string }) => `Deleted “${p.title}”`,
  historyEdited: (p: { title: string }) => `Edited “${p.title}”`,

  // ── History field labels ──
  fieldTitle: 'Title',
  fieldAmount: 'Amount',
  fieldPaidAt: 'Date',
  fieldSplitMode: 'Split mode',
  fieldPayers: 'Paid by',
  fieldParticipants: 'Participants',
  fieldNote: 'Note',
  fieldEmpty: 'None',

  // ── Quick add: pick a group ──
  loadingGroups: 'Loading groups',
  loadingGroupsHint: 'Splitz is fetching your groups so you can pick where to log this expense.',
  loadGroupsFailed: 'Could not load groups',
  noGroups: 'You have no groups yet',
  noGroupsHint: 'Create a group first, then you can log expenses and split them with everyone.',
  createFirstGroup: 'Create your first group',
}
