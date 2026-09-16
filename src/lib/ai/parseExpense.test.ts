import { describe, expect, it } from 'vitest'
import { parseExpenseRuleBased, isLowConfidence } from './parseExpense'

describe('parseExpenseRuleBased', () => {
  const members = ['Sơn', 'Quân', 'Linh', 'Hải', 'Bình']

  it('bóc định dạng triệu+nghìn (tr, k) + người trả', () => {
    const r = parseExpenseRuleBased('Hải sản 1tr750 Sơn trả chia cho 5 người', members)
    expect(r.title).toBe('Hải sản')
    expect(r.amount).toBe(1_750_000)
    expect(r.payerName).toBe('Sơn')
    expect(r.participantNames).toEqual(members) // không có tên cụ thể sau "chia" → cả nhóm
    expect(r.splitMode).toBe('equal')
  })

  it('bóc định dạng nghìn (k) + người tham gia cụ thể', () => {
    const r = parseExpenseRuleBased('Ăn trưa 200k Linh trả chia đều Sơn Quân Linh', members)
    expect(r.title).toBe('Ăn trưa')
    expect(r.amount).toBe(200_000)
    expect(r.payerName).toBe('Linh')
    expect(r.participantNames).toEqual(['Sơn', 'Quân', 'Linh'])
  })

  it('bóc "do X trả chia cho A và B"', () => {
    const r = parseExpenseRuleBased('Trà sữa 150k do Quân trả chia cho Sơn và Quân', members)
    expect(r.title).toBe('Trà sữa')
    expect(r.amount).toBe(150_000)
    expect(r.payerName).toBe('Quân')
    expect(r.participantNames).toEqual(['Sơn', 'Quân'])
  })

  it('bóc số đầy đủ có dấu chấm + "thanh toán"', () => {
    const r = parseExpenseRuleBased('Vé xe phim 350.000đ do Bình thanh toán', members)
    expect(r.title).toBe('Vé xe phim')
    expect(r.amount).toBe(350_000)
    expect(r.payerName).toBe('Bình')
    expect(r.participantNames).toEqual(members)
  })

  it('câu rỗng → kết quả an toàn', () => {
    const r = parseExpenseRuleBased('   ', members)
    expect(r.amount).toBe(0)
    expect(r.title).toBe('')
  })

  it('isLowConfidence: thiếu tiền hoặc người trả', () => {
    expect(isLowConfidence({ title: 'X', amount: 0, payerName: 'Sơn' })).toBe(true)
    expect(isLowConfidence({ title: 'X', amount: 1000 })).toBe(true)
    expect(isLowConfidence({ title: 'X', amount: 1000, payerName: 'Sơn' })).toBe(false)
  })
})
