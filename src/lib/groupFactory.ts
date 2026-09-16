import { colorForIndex } from './format'
import { newId } from './id'
import type { Group, Member } from './types'

const GROUP_EMOJIS = ['💸', '🍜', '✈️', '🏠', '🎉', '⚽', '🏖️', '☕', '🎬', '🛒']

/** Emoji ngẫu nhiên cho nhóm mới (dùng chung local + cloud để nhất quán). */
export function randomGroupEmoji(): string {
  return GROUP_EMOJIS[Math.floor(Math.random() * GROUP_EMOJIS.length)]
}

export function createGroup(name: string, memberNames: string[] = []): Group {
  const now = new Date().toISOString()
  const members: Member[] = memberNames
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n, i) => createMember(n, i))
  return {
    id: newId('grp'),
    name: name.trim() || 'Nhóm mới',
    emoji: randomGroupEmoji(),
    createdAt: now,
    updatedAt: now,
    settlementMethod: 'smart_settle',
    members,
    expenses: [],
  }
}

export function createMember(name: string, index: number): Member {
  return { id: newId('mem'), name: name.trim(), color: colorForIndex(index) }
}

export function touchGroup(group: Group): Group {
  return { ...group, updatedAt: new Date().toISOString() }
}
