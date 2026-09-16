import { describe, expect, it } from 'vitest'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('uses message from Supabase/PostgREST-like error objects', () => {
    expect(errorMessage({ code: '42501', message: 'Bạn chỉ sửa được khoản chi do mình tạo.' }, 'fallback')).toBe(
      'Bạn chỉ sửa được khoản chi do mình tạo.',
    )
  })

  it('falls back when the thrown value has no readable message', () => {
    expect(errorMessage({ code: 'UNKNOWN' }, 'Không lưu được khoản chi.')).toBe('Không lưu được khoản chi.')
  })
})

