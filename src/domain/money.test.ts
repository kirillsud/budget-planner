import { describe, expect, it } from 'vitest'
import { centsToInput, parseAmount } from './money.ts'

describe('parseAmount', () => {
  it.each([
    ['1450', 145000],
    ['1 450', 145000],
    ['1450,5', 145050],
    ['1450.50', 145050],
    ['1.450,50', 145050],
    ['1,450.50', 145050],
    ['€ 12', 1200],
    ['0', 0],
    [',5', 50],
  ])('%s -> %i', (input, cents) => {
    expect(parseAmount(input)).toBe(cents)
  })

  it.each(['', 'abc', '12a', '-', '1-2'])('rejects %s', (input) => {
    expect(parseAmount(input)).toBeNull()
  })

  it('round-trips through the input format', () => {
    expect(parseAmount(centsToInput(145050, 'ru'))).toBe(145050)
    expect(parseAmount(centsToInput(145000, 'en'))).toBe(145000)
  })
})
