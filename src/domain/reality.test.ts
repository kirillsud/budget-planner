import { describe, expect, it } from 'vitest'
import { realityCheck, suggestDailyExpenses, type BalanceSnapshot } from './reality.ts'
import type { BudgetRecord } from './records.ts'

let nextId = 1
function rec(type: BudgetRecord['type'], amount: number, dateFrom: string, extra: Partial<BudgetRecord> = {}): BudgetRecord {
  return { id: nextId++, type, title: `${type} ${amount}`, amount, dateFrom, dateTo: dateFrom, completed: true, ...extra }
}

const snap = (date: string, balance: number): BalanceSnapshot => ({ date, balance })

describe('realityCheck', () => {
  it('needs at least a week of history', () => {
    const r = realityCheck({ today: '2026-10-10', snapshots: [snap('2026-10-05', 1000), snap('2026-10-10', 900)], records: [] })
    expect(r).toEqual({ status: 'collecting', days: 5, needDays: 7 })
  })

  it('without snapshots it is still collecting', () => {
    expect(realityCheck({ today: '2026-10-10', snapshots: [], records: [] })).toEqual({ status: 'collecting', days: 0, needDays: 7 })
  })

  it('unplanned spending is the balance change not explained by completed records', () => {
    // 10 days: 10 000 -> 6 000. Confirmed: salary +3 000, rent -5 000. Unexplained: -2 000 = 200 a day.
    const r = realityCheck({
      today: '2026-10-11',
      snapshots: [snap('2026-10-01', 10_000), snap('2026-10-11', 6_000)],
      records: [rec('income', 3_000, '2026-10-05'), rec('expense', 5_000, '2026-10-03')],
    })
    expect(r).toMatchObject({
      status: 'ready',
      from: '2026-10-01',
      to: '2026-10-11',
      days: 10,
      startBalance: 10_000,
      endBalance: 6_000,
      incomes: 3_000,
      expenses: 5_000,
      unplanned: 2_000,
      perDay: 200,
      pendingPast: 0,
    })
  })

  it('counts only completed records whose first day is inside (from, to]', () => {
    const r = realityCheck({
      today: '2026-10-11',
      snapshots: [snap('2026-10-01', 10_000), snap('2026-10-11', 9_000)],
      records: [
        rec('expense', 500, '2026-10-01'), // on the start day: already in the start balance
        rec('expense', 400, '2026-10-12'), // after the end
        rec('expense', 300, '2026-10-04', { completed: false, dateTo: '2026-10-20' }), // not confirmed yet
        rec('expense', 200, '2026-10-11'), // on the end day: counts
      ],
    })
    expect(r).toMatchObject({ status: 'ready', expenses: 200, unplanned: 800, perDay: 80 })
  })

  it('reports past records waiting for a decision, they make the estimate unreliable', () => {
    const r = realityCheck({
      today: '2026-10-11',
      snapshots: [snap('2026-10-01', 10_000), snap('2026-10-11', 9_000)],
      records: [rec('expense', 300, '2026-10-04', { completed: false })],
    })
    expect(r).toMatchObject({ status: 'ready', pendingPast: 1, unplanned: 1_000 })
  })

  it('uses at most the last 30 days and the last snapshot of the start day', () => {
    const r = realityCheck({
      today: '2026-11-15',
      snapshots: [
        snap('2026-09-01', 50_000), // too old
        snap('2026-10-16', 20_000),
        snap('2026-10-16', 19_000), // later the same day: this one is the start
        snap('2026-11-01', 15_000),
        snap('2026-11-15', 13_000),
      ],
      records: [],
    })
    expect(r).toMatchObject({ status: 'ready', from: '2026-10-16', to: '2026-11-15', days: 30, startBalance: 19_000, perDay: 200 })
  })

  it('more income than planned gives a negative estimate', () => {
    const r = realityCheck({
      today: '2026-10-08',
      snapshots: [snap('2026-10-01', 1_000), snap('2026-10-08', 1_700)],
      records: [],
    })
    expect(r).toMatchObject({ status: 'ready', unplanned: -700, perDay: -100 })
  })

  it('rounds the daily figure to whole cents', () => {
    const r = realityCheck({ today: '2026-10-08', snapshots: [snap('2026-10-01', 1_000), snap('2026-10-08', 0)], records: [] })
    expect(r).toMatchObject({ perDay: 143 })
  })
})

describe('suggestDailyExpenses', () => {
  const ready = (perDay: number, days = 14, pendingPast = 0) =>
    ({ status: 'ready', from: '2026-10-01', to: '2026-10-15', days, startBalance: 0, endBalance: 0, incomes: 0, expenses: 0, unplanned: perDay * days, perDay, pendingPast }) as const

  it('suggests the real figure when it differs enough', () => {
    expect(suggestDailyExpenses(ready(6_800), 5_000)).toBe(6_800)
  })
  it('stays quiet for small differences', () => {
    expect(suggestDailyExpenses(ready(5_300), 5_000)).toBeNull()
    expect(suggestDailyExpenses(ready(150), 100)).toBeNull()
  })
  it('needs two weeks and no undecided records', () => {
    expect(suggestDailyExpenses(ready(6_800, 10), 5_000)).toBeNull()
    expect(suggestDailyExpenses(ready(6_800, 14, 2), 5_000)).toBeNull()
  })
  it('never suggests zero or negative spending', () => {
    expect(suggestDailyExpenses(ready(-100), 5_000)).toBeNull()
    expect(suggestDailyExpenses({ status: 'collecting', days: 3, needDays: 7 }, 5_000)).toBeNull()
  })
})
