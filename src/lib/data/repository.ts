import type { Expense, Group } from '../types'

/**
 * Hợp đồng lưu trữ nhóm. Local (localStorage) và Cloud (Supabase) cùng cài đặt.
 * `save` ở chế độ cloud hoạt động theo kiểu DIFF per-record (cập nhật/ thêm/ xoá
 * từng thành viên riêng), KHÔNG ghi đè cả cục — đúng nguyên tắc chống xung đột.
 */
export interface GroupRepository {
  readonly mode: 'local' | 'cloud'
  list(): Promise<Group[]>
  get(id: string): Promise<Group | null>
  /** Tạo nhóm mới (cloud: qua RPC, owner = người đăng nhập). Trả về nhóm đã tạo. */
  createGroup(name: string, memberNames: string[]): Promise<Group>
  /**
   * Lưu nhóm. `removedMemberIds` là các thành viên người dùng CHỦ ĐỘNG xoá khỏi
   * danh sách (so với bản đang cầm) — cloud chỉ xoá đúng các id này, KHÔNG suy ra
   * từ diff với DB, tránh xoá nhầm thành viên người khác vừa thêm đồng thời.
   */
  save(group: Group, removedMemberIds?: string[]): Promise<void>
  remove(id: string): Promise<void>
  /** Ghi 1 khoản chi (per-record). Tạo mới khi expense.version == null; sửa thì kiểm version.
   *  Ném ConflictError nếu version lệch. Trả về id + version mới. */
  saveExpense(groupId: string, expense: Expense): Promise<{ id: string; version: number }>
  /** Xoá 1 khoản chi (cascade). `version` != null → kiểm để không xoá đè bản vừa bị sửa (ConflictError). */
  removeExpense(groupId: string, expenseId: string, version?: number): Promise<void>
  /** Ghi nhận quyết toán "tôi đã chuyển" (status pending). Người trả tạo. */
  createSettlement(groupId: string, fromMemberId: string, toMemberId: string, amount: number): Promise<string>
  /** Người nhận xác nhận đã nhận → confirmed. */
  confirmSettlement(groupId: string, settlementId: string): Promise<void>
  /** Huỷ một quyết toán đang chờ. */
  cancelSettlement(groupId: string, settlementId: string): Promise<void>
}
