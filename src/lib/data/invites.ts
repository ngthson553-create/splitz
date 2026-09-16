import { getSupabase } from '../supabase/client'

export type InviteKind = 'link' | 'code'

export type CreatedInvite = {
  token: string
  /** Link mời đầy đủ để chia sẻ. */
  url: string
  /** Mã nhóm dạng ngắn (chỉ với kind 'code'). */
  code?: string
}

export type InvitePreview = {
  groupId: string
  groupName: string
  groupEmoji?: string
  memberCount: number
  isClaim: boolean
  targetName?: string
  valid: boolean
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // bỏ ký tự dễ nhầm

function randomToken(len = 20): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  let out = ''
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return out
}

export function inviteUrl(token: string): string {
  return `${window.location.origin}/join/${token}`
}

/**
 * Tạo lời mời. kind 'code' sinh mã ngắn 6 ký tự để nhập tay; 'link' sinh token dài.
 * targetMemberId != null → lời mời để "claim" một thành viên ảo cụ thể.
 */
export async function createInvite(
  groupId: string,
  opts: { kind: InviteKind; targetMemberId?: string; maxUses?: number; expiresAt?: string } = {
    kind: 'link',
  },
): Promise<CreatedInvite> {
  const sb = getSupabase()
  const token = opts.kind === 'code' ? randomToken(6) : randomToken(20)
  const { error } = await sb.from('group_invites').insert({
    group_id: groupId,
    kind: opts.kind,
    token,
    target_member_id: opts.targetMemberId ?? null,
    max_uses: opts.maxUses ?? (opts.targetMemberId ? 1 : 50),
    expires_at: opts.expiresAt ?? null,
  })
  if (error) throw error
  return {
    token,
    url: inviteUrl(token),
    code: opts.kind === 'code' ? token : undefined,
  }
}

export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const { data, error } = await getSupabase().rpc('get_invite_preview', { p_token: token })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return {
    groupId: row.group_id,
    groupName: row.group_name,
    groupEmoji: row.group_emoji ?? undefined,
    memberCount: Number(row.member_count ?? 0),
    isClaim: Boolean(row.is_claim),
    targetName: row.target_name ?? undefined,
    valid: Boolean(row.valid),
  }
}

/** Tham gia (hoặc claim) nhóm qua token. Trả về groupId. */
export async function joinViaInvite(token: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('join_group_via_invite', { p_token: token })
  if (error) throw error
  return data as string
}
