import type { Expense, Group } from './types'

export function currentMemberIdForUser(group: Group, userId: string | null | undefined): string | null {
  if (!userId) return null
  return group.members.find((member) => member.userId === userId)?.id ?? null
}

export function canManageExpense({
  group,
  expense,
  mode,
  userId,
}: {
  group: Group
  expense: Expense
  mode: 'local' | 'cloud'
  userId?: string | null
}): boolean {
  if (mode === 'local') return true
  if (!userId) return false
  if (group.ownerId === userId) return true
  const myMemberId = currentMemberIdForUser(group, userId)
  return Boolean(myMemberId && expense.createdByMemberId === myMemberId)
}

