import { addDays, diffDays, type IsoDate } from './dates.ts'
import type { Cents } from './money.ts'
import { isOverdue, type BudgetRecord } from './records.ts'

/** A balance the user saw (entered by hand or read from the bank), on the user's local date. */
export interface BalanceSnapshot {
  date: IsoDate
  balance: Cents
}

export const REALITY_MIN_DAYS = 7
export const REALITY_MAX_DAYS = 30

export type RealityCheck =
  | { status: 'collecting'; days: number; needDays: number }
  | {
      status: 'ready'
      from: IsoDate
      to: IsoDate
      days: number
      startBalance: Cents
      endBalance: Cents
      /** Completed incomes and expenses inside the window (both positive). */
      incomes: Cents
      expenses: Cents
      /** Money that left the account without a record: the real "daily spending" of the window. */
      unplanned: Cents
      perDay: Cents
      /** Records in the window still waiting for a decision: if they happened, the estimate is too high. */
      pendingPast: number
    }

/**
 * How much was really spent outside the records, from two balance observations up to 30 days apart.
 *
 *   unplanned = start balance + confirmed incomes − confirmed expenses − end balance
 *
 * A record counts when it is completed and its first day is after the start day and not after the end
 * day (anything on the start day is assumed to be in the start balance already).
 * Snapshots must be in chronological order.
 */
export function realityCheck(input: { today: IsoDate; snapshots: readonly BalanceSnapshot[]; records: readonly BudgetRecord[] }): RealityCheck {
  const { today, snapshots, records } = input
  const earliest = addDays(today, -REALITY_MAX_DAYS)
  const recent = snapshots.filter((s) => s.date >= earliest && s.date <= today)
  if (recent.length === 0) return { status: 'collecting', days: 0, needDays: REALITY_MIN_DAYS }

  const startDate = recent[0].date
  const start = recent.filter((s) => s.date === startDate).at(-1)!
  const end = recent[recent.length - 1]
  const days = diffDays(start.date, end.date)
  if (days < REALITY_MIN_DAYS) return { status: 'collecting', days, needDays: REALITY_MIN_DAYS }

  const inWindow = records.filter((r) => r.dateFrom > start.date && r.dateFrom <= end.date)
  let incomes = 0
  let expenses = 0
  for (const r of inWindow) {
    if (!r.completed) continue
    if (r.type === 'income') incomes += r.amount
    else expenses += r.amount
  }
  const unplanned = start.balance + incomes - expenses - end.balance

  return {
    status: 'ready',
    from: start.date,
    to: end.date,
    days,
    startBalance: start.balance,
    endBalance: end.balance,
    incomes,
    expenses,
    unplanned,
    perDay: Math.round(unplanned / days),
    pendingPast: inWindow.filter((r) => isOverdue(r, today)).length,
  }
}

/**
 * Whether the estimate is worth offering as the new daily spending: two weeks of data, nothing left
 * undecided, and a difference of at least 10% (and at least 1 currency unit).
 */
export function suggestDailyExpenses(check: RealityCheck, current: Cents): Cents | null {
  if (check.status !== 'ready' || check.days < 14 || check.pendingPast > 0 || check.perDay <= 0) return null
  const diff = Math.abs(check.perDay - current)
  if (diff < 100 || diff < current * 0.1) return null
  return check.perDay
}
