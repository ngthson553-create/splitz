import { getSupabase } from '../supabase/client'
import { compressImage, dataUrlToBase64 } from '../image'

async function fnError(error: unknown): Promise<never> {
  const ctx = (error as { context?: Response })?.context
  if (ctx) {
    try {
      const body = await ctx.json()
      if (body?.error) throw new Error(body.error)
    } catch (e) {
      if (e instanceof Error && e.message) throw e
    }
  }
  throw error instanceof Error ? error : new Error('Không quét được hoá đơn.')
}

export type OcrItem = { title: string; amount: number }

export type OcrResult = {
  items: OcrItem[]
  /** Lượt quét còn lại tháng này (null = Premium / không áp dụng). */
  remaining: number | null
  limit: number | null
  plan?: string
  message?: string
  /** Ảnh ĐÃ NÉN — để upload làm chứng từ sau khi lưu khoản chi. */
  file: File
}

/** Nén ảnh client → gửi Edge Function vision (Gemini) → danh sách món. */
export async function ocrReceiptRemote(rawFile: File): Promise<OcrResult> {
  const { file, dataUrl } = await compressImage(rawFile, 1280, 0.8)
  const imageBase64 = dataUrlToBase64(dataUrl)
  const { data, error } = await getSupabase().functions.invoke('ocr-receipt', {
    body: { imageBase64, mimeType: 'image/jpeg' },
  })
  if (error) await fnError(error)
  return {
    items: (data?.items ?? []) as OcrItem[],
    remaining: data?.remaining ?? null,
    limit: data?.limit ?? null,
    plan: data?.plan,
    message: data?.message,
    file,
  }
}
