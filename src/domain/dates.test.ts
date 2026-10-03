import { describe, expect, it } from 'vitest'
import { addDays, addMonths, diffDays, isIsoDate, weekday } from './dates.ts'

describe('dates', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('is not affected by DST changes', () => {
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2)
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2)
  })

  it('adds months clamping the day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15')
    expect(addMonths('2026-10-03', 1)).toBe('2026-11-03')
  })

  it('validates ISO dates', () => {
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-10-03')).toBe(true)
    expect(isIsoDate('03.10.2026')).toBe(false)
  })

  it('knows the weekday', () => {
    expect(weekday('2026-10-03')).toBe(6)
  })
})
