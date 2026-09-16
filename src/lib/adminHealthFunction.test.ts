/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('admin-health edge function', () => {
  it('limits recent error health status to a bounded time window', () => {
    const source = readFileSync('supabase/functions/admin-health/index.ts', 'utf8')

    expect(source).toContain('errorWindowCutoff')
    expect(source.match(/\.gte\('created_at', errorWindowCutoff\)/g)).toHaveLength(3)
  })
})
