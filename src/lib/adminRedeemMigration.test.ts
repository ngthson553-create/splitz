/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('admin redeem SQL migrations', () => {
  it('keeps generated redeem codes independent from gen_random_bytes', () => {
    const sql = readFileSync('supabase/migrations/0032_fix_admin_redeem_code_generator.sql', 'utf8')

    expect(sql).toContain('create or replace function public.generate_admin_redeem_code')
    expect(sql).toContain('gen_random_uuid()')
    expect(sql).not.toContain('gen_random_bytes')
  })
})
