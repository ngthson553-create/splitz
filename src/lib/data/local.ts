import type { Expense, Group, Settlement } from '../types'
import type { GroupRepository } from './repository'
import { createGroup as makeGroup } from '../groupFactory'
import { newId } from '../id'
import { t } from '../i18n'

const KEY = 'splitz.groups.v1'

function readAll(): Group[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Group[]) : []
  } catch {
    return []
  }
}

function writeAll(groups: Group[]): void {
  localStorage.setItem(KEY, JSON.stringify(groups))
}

export class LocalGroupRepository implements GroupRepository {
  readonly mode = 'local' as const

  async list(): Promise<Group[]> {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async get(id: string): Promise<Group | null> {
    return readAll().find((g) => g.id === id) ?? null
  }

  async createGroup(name: string, memberNames: string[]): Promise<Group> {
    const group = makeGroup(name, memberNames)
    await this.save(group)
    return group
  }

  async save(group: Group): Promise<void> {
    const all = readAll()
    const index = all.findIndex((g) => g.id === group.id)
    if (index >= 0) all[index] = group
    else all.push(group)
    writeAll(all)
  }

  async saveExpense(groupId: string, expense: Expense): Promise<{ id: string; version: number }> {
    const all = readAll()
    const g = all.find((x) => x.id === groupId)
    if (!g) throw new Error(t().errors.groupMissing)
    const i = g.expenses.findIndex((e) => e.id === expense.id)
    if (i >= 0) g.expenses[i] = expense
    else g.expenses.push(expense)
    g.updatedAt = new Date().toISOString()
    writeAll(all)
    return { id: expense.id, version: 1 }
  }

  async removeExpense(groupId: string, expenseId: string): Promise<void> {
    const all = readAll()
    const g = all.find((x) => x.id === groupId)
    if (!g) return
    g.expenses = g.expenses.filter((e) => e.id !== expenseId)
    g.updatedAt = new Date().toISOString()
    writeAll(all)
  }

  async createSettlement(
    groupId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number,
  ): Promise<string> {
    const all = readAll()
    const g = all.find((x) => x.id === groupId)
    if (!g) throw new Error(t().errors.groupMissing)
    const createdAt = new Date().toISOString()
    const settlement: Settlement = {
      id: newId('stl'),
      groupId,
      fromMemberId,
      toMemberId,
      amount,
      status: 'pending',
      paymentMethod: 'bank_transfer',
      createdAt,
    }
    g.settlements = [...(g.settlements ?? []), settlement]
    g.updatedAt = createdAt
    writeAll(all)
    return settlement.id
  }

  async confirmSettlement(groupId: string, settlementId: string): Promise<void> {
    const all = readAll()
    const g = all.find((x) => x.id === groupId)
    if (!g?.settlements) return
    g.settlements = g.settlements.map((st) =>
      st.id === settlementId
        ? { ...st, status: 'confirmed' as const, confirmedAt: new Date().toISOString() }
        : st,
    )
    g.updatedAt = new Date().toISOString()
    writeAll(all)
  }

  async cancelSettlement(groupId: string, settlementId: string): Promise<void> {
    const all = readAll()
    const g = all.find((x) => x.id === groupId)
    if (!g?.settlements) return
    g.settlements = g.settlements.map((st) =>
      st.id === settlementId ? { ...st, status: 'cancelled' as const } : st,
    )
    g.updatedAt = new Date().toISOString()
    writeAll(all)
  }

  async remove(id: string): Promise<void> {
    writeAll(readAll().filter((g) => g.id !== id))
  }
}
