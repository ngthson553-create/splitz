import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compressImage } from './image'

describe('compressImage', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>
  const realCreateElement = document.createElement.bind(document)
  let failBlobLoad = false

  beforeEach(() => {
    failBlobLoad = false

    class FailingFileReader {
      result: string | ArrayBuffer | null = null
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null
      onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null

      readAsDataURL(file?: Blob) {
        if (failBlobLoad) {
          this.result = 'data:image/heic;base64,fallback123'
          this.onload?.call(
            this as unknown as FileReader,
            { target: { result: 'data:image/heic;base64,fallback123' } } as ProgressEvent<FileReader>,
          )
          return
        }
        void file
        this.onerror?.call(this as unknown as FileReader, new ProgressEvent('error') as ProgressEvent<FileReader>)
      }
    }

    class FakeImage {
      width = 2400
      height = 1600
      onload: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null
      onerror: OnErrorEventHandler = null

      set src(value: string) {
        if (value === 'blob:receipt' && failBlobLoad) {
          queueMicrotask(() => {
            if (typeof this.onerror === 'function') this.onerror.call(this as unknown as OnErrorEventHandlerNonNull, new Event('error'))
          })
          return
        }
        if (value === 'blob:receipt') {
          queueMicrotask(() => {
            this.onload?.call(this as unknown as GlobalEventHandlers, new Event('load'))
          })
          return
        }
        if (value === 'data:image/heic;base64,fallback123') {
          queueMicrotask(() => {
            this.onload?.call(this as unknown as GlobalEventHandlers, new Event('load'))
          })
          return
        }
        queueMicrotask(() => {
          if (typeof this.onerror === 'function') this.onerror.call(this as unknown as OnErrorEventHandlerNonNull, new Event('error'))
        })
      }
    }

    const createObjectURL = vi.fn(() => 'blob:receipt')
    const revokeObjectURL = vi.fn()

    vi.stubGlobal('FileReader', FailingFileReader)
    vi.stubGlobal('Image', FakeImage)
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName !== 'canvas') return realCreateElement(tagName)
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toDataURL: () => 'data:image/jpeg;base64,abc123',
        toBlob: (callback: BlobCallback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
      } as unknown as HTMLCanvasElement
    }) as typeof document.createElement)
  })

  afterEach(() => {
    createElementSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('still compresses a receipt when data-url loading fails on the original file', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'hoa-don.heic', { type: 'image/heic' })

    const result = await compressImage(file, 1280, 0.8)

    expect(result.dataUrl).toBe('data:image/jpeg;base64,abc123')
    expect(result.file.name).toBe('hoa-don.jpg')
    expect(URL.createObjectURL).toHaveBeenCalledWith(file)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:receipt')
  })

  it('falls back to data-url loading when blob-url decoding fails on the device', async () => {
    failBlobLoad = true
    const file = new File([new Uint8Array([1, 2, 3])], 'hoa-don.heic', { type: 'image/heic' })

    const result = await compressImage(file, 1280, 0.8)

    expect(result.dataUrl).toBe('data:image/jpeg;base64,abc123')
    expect(result.file.name).toBe('hoa-don.jpg')
    expect(URL.createObjectURL).toHaveBeenCalledWith(file)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:receipt')
  })
})
