import { maxDate, type IsoDate } from './dates.ts'
import type { Cents } from './money.ts'

export type RecordType = 'income' | 'expense'

/**
 * A planned income or expense. Both types share one shape: a period [dateFrom, dateTo]
 * ("not earlier than" .. "not later than"). A single-day record has dateFrom === dateTo.
 */
export interface BudgetRecord {
  id: number
  type: RecordType
  title: string
  amount: Cents
  dateFrom: IsoDate
  dateTo: IsoDate
  completed: boolean
  /** Set when the record is one month of a monthly series. */
  seriesId?: number | null
}

export type NewBudgetRecord = Omit<BudgetRecord, 'id'> & { id?: number }

export interface BudgetSettings {
  balance: Cents
  balanceUpdatedAt: string
  dailyExpenses: Cents
  warningBalance: Cents
  criticalBalance: Cents
  scaleMonths: number
  currency: string
  locale: 'ru' | 'en'
}

/** Not completed and its period is over: the user has to decide what happened. */
export function isOverdue(record: Pick<BudgetRecord, 'completed' | 'dateTo'>, today: IsoDate): boolean {
  return !record.completed && record.dateTo < today
}

/**
 * The day the record affects the forecast: its first possible day, but never in the past.
 * A record whose period has started and not ended yet counts today.
 */
export function anchorDate(record: Pick<BudgetRecord, 'dateFrom'>, today: IsoDate): IsoDate {
  return maxDate(record.dateFrom, today)
}

export function signedAmount(record: Pick<BudgetRecord, 'type' | 'amount'>): Cents {
  return record.type === 'income' ? record.amount : -record.amount
}

export function isSingleDay(record: Pick<BudgetRecord, 'dateFrom' | 'dateTo'>): boolean {
  return record.dateFrom === record.dateTo
}
