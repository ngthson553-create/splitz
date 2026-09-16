import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BankFields, type BankValue } from './BankFields'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const parseVietQR = vi.hoisted(() => vi.fn(() => ({ bankCode: '970422', accountNumber: '0123456789' })))
const jsQr = vi.hoisted(() => vi.fn(() => ({ data: 'vietqr-data' })))

vi.mock('jsqr', () => ({
  default: jsQr,
}))

vi.mock('../lib/settlement/vietqr', () => ({
  BANK_GROUPS: [{ label: 'Test', banks: [{ code: '970422', name: 'MB Bank' }] }],
  parseVietQR,
}))

let roots: Root[] = []

describe('BankFields', () => {
  beforeEach(() => {
    jsQr.mockClear()
    parseVietQR.mockClear()

    const createObjectURL = vi.fn(() => 'blob:qr')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    class FakeFileReader {
      result: string | ArrayBuffer | null = null
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null
      onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null

      readAsDataURL() {
        this.result = 'data:image/jpeg;base64,fallback'
        this.onload?.call(this as unknown as FileReader, new ProgressEvent('load') as ProgressEvent<FileReader>)
      }
    }

    vi.stubGlobal('FileReader', FakeFileReader)

    class FakeImage {
      width = 100
      height = 100
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(value: string) {
        queueMicrotask(() => {
          if (value === 'blob:qr') {
            this.onerror?.()
            return
          }
          this.onload?.()
        })
      }
    }

    vi.stubGlobal('Image', FakeImage)

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    } as unknown as CanvasRenderingContext2D)
  })

  afterEach(() => {
    for (const root of roots) root.unmount()
    roots = []
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  async function renderBankFields(props: {
    value?: BankValue
    onChange?: (next: BankValue) => void
    onScanError?: (message: string) => void
  }) {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    roots.push(root)
    const onChange = props.onChange ?? vi.fn()
    const onScanError = props.onScanError ?? vi.fn()
    await act(async () => {
      root.render(
        <BankFields
          value={props.value ?? { bankCode: '', accountNumber: '', accountName: '' }}
          onChange={onChange}
          onScanError={onScanError}
        />, 
      )
    })
    return { onChange, onScanError }
  }

  it('still scans QR account info when blob image loading fails but data-url fallback works', async () => {
    const { onChange, onScanError } = await renderBankFields({})

    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(input).not.toBeNull()

    const file = new File(['qr'], 'bank-qr.heic', { type: 'image/heic' })
    Object.defineProperty(input!, 'files', {
      configurable: true,
      value: [file],
    })

    await act(async () => {
      input!.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(onChange).toHaveBeenCalledWith({
      bankCode: '970422',
      accountNumber: '0123456789',
      accountName: '',
    })
    expect(onScanError).not.toHaveBeenCalled()
  })
})
