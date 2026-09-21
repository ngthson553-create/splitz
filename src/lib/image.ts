/**
 * Đọc file ảnh, cắt vuông giữa và thu nhỏ về maxSize px, trả về data URL JPEG.
 * Giữ localStorage nhẹ (avatar ~vài chục KB thay vì vài MB).
 */
import { t } from './i18n'

export async function fileToAvatarDataUrl(file: File, maxSize = 256, quality = 0.82): Promise<string> {
  const dataUrl = await readAsDataUrl(file)
  const img = await loadImage(dataUrl)

  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = maxSize
  canvas.height = maxSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Nén ảnh (giữ tỷ lệ, fit trong maxDim) → trả về { file, dataUrl } JPEG.
 * Dùng cho hoá đơn: vừa lấy base64 gửi vision AI, vừa upload làm chứng từ (nhẹ băng thông).
 */
export async function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.8,
): Promise<{ file: File; dataUrl: string }> {
  const img = await loadImageFile(file)
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { file, dataUrl: await readAsDataUrl(file) }
  ctx.drawImage(img, 0, 0, w, h)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
  )
  const baseName = (file.name.replace(/\.[^.]+$/, '') || 'hoa-don') + '.jpg'
  const outFile = blob ? new File([blob], baseName, { type: 'image/jpeg' }) : file
  return { file: outFile, dataUrl }
}

/** Tách phần base64 thuần (bỏ tiền tố `data:...;base64,`) từ data URL. */
export function dataUrlToBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(',')
  return i === -1 ? dataUrl : dataUrl.slice(i + 1)
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(t().errors.fileReadFailed))
    reader.readAsDataURL(file)
  })
}

async function loadImageFile(file: File): Promise<HTMLImageElement> {
  const tryDataUrl = async () => {
    try {
      const dataUrl = await readAsDataUrl(file)
      return await loadImage(dataUrl)
    } catch {
      throw unsupportedImageError(file)
    }
  }

  if (typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(file)
    try {
      return await loadImage(url)
    } catch {
      return await tryDataUrl()
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return tryDataUrl()
}

function unsupportedImageError(file: File): Error {
  const isHeic = /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  if (isHeic) {
    return new Error(t().errors.imageHeicUnsupported)
  }
  return new Error(t().errors.imageUnsupported)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(t().errors.imageLoadFailed))
    img.src = src
  })
}
