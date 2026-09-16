import { getSupabase } from '../supabase/client'

/** Member tự rời nhóm (owner phải chuyển quyền trước). */
export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await getSupabase().rpc('leave_group', { p_group_id: groupId })
  if (error) throw error
}

/** Chủ nhóm chuyển quyền sở hữu cho một thành viên đã có tài khoản. */
export async function transferOwnership(groupId: string, toMemberId: string): Promise<void> {
  const { error } = await getSupabase().rpc('transfer_group_ownership', {
    p_group_id: groupId,
    p_to_member: toMemberId,
  })
  if (error) throw error
}
