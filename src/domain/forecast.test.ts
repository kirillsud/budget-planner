import { describe, expect, it } from 'vitest'
import { dailyBalances, forecast, lowestUntilNextIncome, type ForecastSettings } from './forecast.ts'
import type { BudgetRecord } from './records.ts'

const settings: ForecastSettings = {
  balance: 1000,
  dailyExpenses: 10,
  warningBalance: 0,
  criticalBalance: -1_000_000,
  scaleMonths: 2,
}

let nextId = 1
function rec(type: BudgetRecord['type'], amount: number, dateFrom: string, extra: Partial<BudgetRecord> = {}): BudgetRecord {
  return { id: nextId++, type, title: `${type} ${amount}`, amount, dateFrom, dateTo: dateFrom, completed: false, ...extra }
}

describe('forecast: examples from the spec (Miro doc 02)', () => {
  it('example 1: expense then income', () => {
    const f = forecast({
      today: '2026-10-01',
      settings,
      records: [rec('expense', 300, '2026-10-03'), rec('income', 500, '2026-10-05')],
    })
    expect(f.points.map((p) => [p.date, p.total])).toEqual([
      ['2026-10-03', 980],
      ['2026-10-05', 660],
    ])
    expect(f.final.total).toBe(1150)
  })

  it('example 2: a record today', () => {
    const f = forecast({ today: '2026-10-01', settings, records: [rec('expense', 200, '2026-10-01')] })
    expect(f.points.map((p) => p.total)).toEqual([1000])
    expect(f.final.total).toBe(790)
  })

  it('example 3: completed and overdue records do not count', () => {
    const overdueIncome = rec('income', 400, '2026-09-28')
    const f = forecast({
      today: '2026-10-01',
      settings,
      records: [overdueIncome, rec('expense', 100, '2026-10-04', { completed: true }), rec('expense', 50, '2026-10-04')],
    })
    expect(f.overdue).toEqual([overdueIncome])
    expect(f.points.map((p) => [p.date, p.total])).toEqual([['2026-10-04', 970]])
    expect(f.points[0].expenses).toHaveLength(2)
    expect(f.final.total).toBe(910)
  })

  it('example 4: thresholds', () => {
    const f = forecast({
      today: '2026-10-01',
      settings: { ...settings, warningBalance: 900, criticalBalance: 500 },
      records: [rec('expense', 300, '2026-10-03'), rec('income', 500, '2026-10-05')],
    })
    expect(f.points.map((p) => p.level)).toEqual(['ok', 'warning'])
    expect(f.final.level).toBe('ok')
  })
})

describe('forecast: periods', () => {
  it('anchors a future record to date_from', () => {
    const f = forecast({
      today: '2026-10-01',
      settings,
      records: [rec('expense', 120, '2026-10-10', { dateTo: '2026-10-20' })],
    })
    expect(f.points.map((p) => p.date)).toEqual(['2026-10-10'])
  })

  it('a period that already started counts today and is not overdue', () => {
    const r = rec('income', 300, '2026-09-25', { dateTo: '2026-10-05' })
    const f = forecast({ today: '2026-10-01', settings, records: [r] })
    expect(f.overdue).toEqual([])
    expect(f.points.map((p) => [p.date, p.total, p.endTotal])).toEqual([['2026-10-01', 1000, 1300]])
  })

  it('a record is overdue only after date_to', () => {
    const lastDay = rec('expense', 10, '2026-09-20', { dateTo: '2026-10-01' })
    const past = rec('expense', 10, '2026-09-20', { dateTo: '2026-09-30' })
    const f = forecast({ today: '2026-10-01', settings, records: [lastDay, past] })
    expect(f.overdue).toEqual([past])
  })

  it('ignores records beyond the window', () => {
    const f = forecast({ today: '2026-10-01', settings, records: [rec('expense', 10, '2026-12-01')] })
    expect(f.points).toEqual([])
    expect(f.final).toEqual({ date: '2026-10-01', total: 1000, level: 'ok' })
  })
})

describe('dailyBalances and lowestUntilNextIncome', () => {
  const s: ForecastSettings = { balance: 2900, dailyExpenses: 35, warningBalance: 800, criticalBalance: 300, scaleMonths: 1 }
  const records = [
    rec('expense', 1450, '2026-10-05'),
    rec('expense', 60, '2026-10-07'),
    rec('expense', 89, '2026-10-10'),
    rec('expense', 120, '2026-10-15', { dateTo: '2026-10-20' }),
    rec('income', 4200, '2026-10-25'),
    rec('expense', 1450, '2026-11-01'),
  ]

  it('end-of-day balance at a point equals the point endTotal', () => {
    const input = { today: '2026-10-03', settings: s, records }
    const series = dailyBalances(input)
    const f = forecast(input)
    for (const p of f.points) {
      expect(series.find((d) => d.date === p.date)?.balance).toBe(p.endTotal)
    }
    expect(series[0]).toEqual({ date: '2026-10-03', balance: 2900 })
  })

  it('finds the lowest day before the salary and the headroom', () => {
    const low = lowestUntilNextIncome({ today: '2026-10-03', settings: s, records })
    expect(low).toEqual({
      date: '2026-10-24',
      balance: 2900 - 1450 - 60 - 89 - 120 - 35 * 21,
      nextIncomeDate: '2026-10-25',
      headroom: 2900 - 1450 - 60 - 89 - 120 - 35 * 21 - 300,
      level: 'warning',
    })
  })

  it('without incomes searches the whole window', () => {
    const low = lowestUntilNextIncome({ today: '2026-10-03', settings: s, records: [rec('expense', 100, '2026-10-05')] })
    expect(low?.nextIncomeDate).toBeNull()
    expect(low?.date).toBe('2026-11-02')
  })
})
