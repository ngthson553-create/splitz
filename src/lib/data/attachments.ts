import { getSupabase } from '../supabase/client'
import type { Attachment, Settlement } from '../types'

const BUCKET = 'receipts'

type Row = {
  id: string
  expense_id: string
  group_id: string
  storage_path: string
  mime_type: string | null
  file_name: string | null
  size_bytes: number | null
  created_at: string
}

function map(r: Row): Attachment {
  return {
    id: r.id,
    expenseId: r.expense_id,
    groupId: r.group_id,
    storagePath: r.storage_path,
    mimeType: r.mime_type ?? undefined,
    fileName: r.file_name ?? undefined,
    sizeBytes: r.size_bytes ?? undefined,
    createdAt: r.created_at,
  }
}

const COLS = 'id,expense_id,group_id,storage_path,mime_type,file_name,size_bytes,created_at'

export async function listAttachments(expenseId: string): Promise<Attachment[]> {
  const { data, error } = await getSupabase()
    .from('expense_attachments')
    .select(COLS)
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as Row[]).map(map)
}

export async function uploadAttachment(
  groupId: string,
  expenseId: string,
  file: File,
  uploadedByMemberId?: string,
): Promise<Attachment> {
  const sb = getSupabase()
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${groupId}/${expenseId}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })
  if (upErr) throw upErr

  const { data, error } = await sb
    .from('expense_attachments')
    .insert({
      expense_id: expenseId,
      group_id: groupId,
      storage_path: path,
      mime_type: file.type || null,
      file_name: file.name,
      size_bytes: file.size,
      uploaded_by: uploadedByMemberId ?? null,
    })
    .select(COLS)
    .single()
  if (error) {
    // rollback file nếu insert metadata lỗi
    await sb.storage.from(BUCKET).remove([path])
    throw error
  }
  return map(data as Row)
}

/** URL ký thời hạn ngắn để xem/tải (bucket private). */
export async function signedUrl(storagePath: string, expiresSec = 3600): Promise<string> {
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(storagePath, expiresSec)
  if (error || !data?.signedUrl) throw error ?? new Error('Không tạo được link xem.')
  return data.signedUrl
}

export async function uploadSettlementProof(
  groupId: string,
  settlementId: string,
  file: File,
): Promise<void> {
  const sb = getSupabase()
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${groupId}/settlements/${settlementId}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })
  if (upErr) throw upErr

  const { error } = await sb.rpc('attach_settlement_proof', {
    p_id: settlementId,
    p_storage_path: path,
    p_mime_type: file.type || null,
    p_file_name: file.name,
    p_size_bytes: file.size,
  })
  if (error) {
    await sb.storage.from(BUCKET).remove([path])
    throw error
  }
}

export async function signedSettlementProofUrl(settlement: Settlement, expiresSec = 3600): Promise<string> {
  if (!settlement.proofStoragePath) throw new Error('Quyết toán này chưa có chứng từ.')
  return signedUrl(settlement.proofStoragePath, expiresSec)
}

export async function removeAttachment(att: Attachment): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('expense_attachments').delete().eq('id', att.id)
  if (error) throw error
  await sb.storage.from(BUCKET).remove([att.storagePath])
}

/** Lấy toàn bộ chứng từ của 1 nhóm (cho xuất báo cáo), kèm signed URL. */
export async function listGroupAttachments(
  groupId: string,
): Promise<Map<string, { name: string; isImage: boolean; url: string }[]>> {
  const { data, error } = await getSupabase()
    .from('expense_attachments')
    .select(COLS)
    .eq('group_id', groupId)
  if (error) throw error
  const rows = ((data ?? []) as Row[]).map(map)
  const out = new Map<string, { name: string; isImage: boolean; url: string }[]>()
  for (const a of rows) {
    let url: string
    try {
      url = await signedUrl(a.storagePath, 3600)
    } catch {
      continue
    }
    const list = out.get(a.expenseId) ?? []
    list.push({ name: a.fileName ?? 'Chứng từ', isImage: (a.mimeType ?? '').startsWith('image/'), url })
    out.set(a.expenseId, list)
  }
  return out
}
