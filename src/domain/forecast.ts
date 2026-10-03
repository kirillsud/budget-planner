import { addDays, addMonths, diffDays, type IsoDate } from './dates.ts'
import type { Cents } from './money.ts'
import { anchorDate, isOverdue, signedAmount, type BudgetRecord, type BudgetSettings } from './records.ts'

export type Level = 'ok' | 'warning' | 'critical'

export type ForecastSettings = Pick<
  BudgetSettings,
  'balance' | 'dailyExpenses' | 'warningBalance' | 'criticalBalance' | 'scaleMonths'
>

export interface ForecastInput {
  today: IsoDate
  settings: ForecastSettings
  records: readonly BudgetRecord[]
}

export interface ForecastPoint {
  date: IsoDate
  /** Balance at the start of the day, before this day's records (legacy semantics). */
  total: Cents
  /** Balance after this day's records: total + incomes - expenses. */
  endTotal: Cents
  level: Level
  endLevel: Level
  /** All records anchored to this day, completed ones included (they do not count). */
  incomes: BudgetRecord[]
  expenses: BudgetRecord[]
}

export interface Forecast {
  /** First day after the forecast window: [today, windowEnd) */
  windowEnd: IsoDate
  points: ForecastPoint[]
  final: { date: IsoDate; total: Cents; level: Level }
  overdue: BudgetRecord[]
}

export function levelOf(total: Cents, s: Pick<ForecastSettings, 'warningBalance' | 'criticalBalance'>): Level {
  if (total <= s.criticalBalance) return 'critical'
  if (total <= s.warningBalance) return 'warning'
  return 'ok'
}

function sumActive(records: readonly BudgetRecord[]): Cents {
  return records.reduce((acc, r) => (r.completed ? acc : acc + signedAmount(r)), 0)
}

/**
 * Balance forecast ported from the production version (planner.js, reset()).
 * See the Miro spec, doc 02. Overdue records are excluded and reported separately.
 */
export function forecast({ today, settings, records }: ForecastInput): Forecast {
  const windowEnd = addMonths(today, settings.scaleMonths)
  const overdue: BudgetRecord[] = []
  const byDay = new Map<IsoDate, BudgetRecord[]>()

  for (const r of records) {
    if (isOverdue(r, today)) {
      overdue.push(r)
      continue
    }
    const day = anchorDate(r, today)
    if (day >= windowEnd) continue
    const list = byDay.get(day)
    if (list) list.push(r)
    else byDay.set(day, [r])
  }

  const days = [...byDay.keys()].sort()
  const points: ForecastPoint[] = []
  let prevDate = today
  let base = settings.balance

  for (const date of days) {
    const dayRecords = byDay.get(date) ?? []
    const total = base - settings.dailyExpenses * diffDays(prevDate, date)
    const endTotal = total + sumActive(dayRecords)
    points.push({
      date,
      total,
      endTotal,
      level: levelOf(total, settings),
      endLevel: levelOf(endTotal, settings),
      incomes: dayRecords.filter((r) => r.type === 'income'),
      expenses: dayRecords.filter((r) => r.type === 'expense'),
    })
    prevDate = date
    base = endTotal
  }

  const finalDate = points.length > 0 ? addDays(prevDate, 1) : today
  const finalTotal = points.length > 0 ? base - settings.dailyExpenses * diffDays(prevDate, finalDate) : settings.balance

  overdue.sort((a, b) => (a.dateTo < b.dateTo ? -1 : a.dateTo > b.dateTo ? 1 : 0))

  return {
    windowEnd,
    points,
    final: { date: finalDate, total: finalTotal, level: levelOf(finalTotal, settings) },
    overdue,
  }
}

export interface DailyBalance {
  date: IsoDate
  /** Balance at the end of the day: records up to this day applied, daily spending for the days since today. */
  balance: Cents
}

/**
 * Day-by-day balance for the chart and the "lowest point" hint.
 * At a forecast point's date the value equals that point's endTotal.
 */
export function dailyBalances({ today, settings, records }: ForecastInput): DailyBalance[] {
  const windowEnd = addMonths(today, settings.scaleMonths)
  const delta = new Map<IsoDate, Cents>()
  for (const r of records) {
    if (r.completed || isOverdue(r, today)) continue
    const day = anchorDate(r, today)
    if (day >= windowEnd) continue
    delta.set(day, (delta.get(day) ?? 0) + signedAmount(r))
  }
  const out: DailyBalance[] = []
  let running = settings.balance
  const length = diffDays(today, windowEnd)
  for (let i = 0; i < length; i++) {
    const date = addDays(today, i)
    running += delta.get(date) ?? 0
    out.push({ date, balance: running - settings.dailyExpenses * i })
  }
  return out
}

export interface LowestPoint {
  date: IsoDate
  balance: Cents
  /** First upcoming income day, if any inside the window. The search stops the day before it. */
  nextIncomeDate: IsoDate | null
  /** How much more can be spent before reaching the critical balance. Negative if already below. */
  headroom: Cents
  level: Level
}

/** Lowest end-of-day balance from today until the day before the next income (or the window end). */
export function lowestUntilNextIncome(input: ForecastInput): LowestPoint | null {
  const { today, settings, records } = input
  const series = dailyBalances(input)
  if (series.length === 0) return null

  let nextIncomeDate: IsoDate | null = null
  for (const r of records) {
    if (r.type !== 'income' || r.completed || isOverdue(r, today) || r.amount === 0) continue
    const day = anchorDate(r, today)
    if (day <= today) continue
    if (nextIncomeDate === null || day < nextIncomeDate) nextIncomeDate = day
  }

  let lowest = series[0]
  for (const point of series) {
    if (nextIncomeDate !== null && point.date >= nextIncomeDate) break
    if (point.balance < lowest.balance) lowest = point
  }

  return {
    date: lowest.date,
    balance: lowest.balance,
    nextIncomeDate,
    headroom: lowest.balance - settings.criticalBalance,
    level: levelOf(lowest.balance, settings),
  }
}
