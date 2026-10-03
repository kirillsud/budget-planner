/**
 * Calendar dates as ISO strings "YYYY-MM-DD". No time, no time zone:
 * all arithmetic goes through UTC day numbers, so DST and offsets never shift a date.
 */
export type IsoDate = string

const DAY_MS = 86_400_000
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isIsoDate(value: string): value is IsoDate {
  const m = ISO_RE.exec(value)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}

function toDayNumber(date: IsoDate): number {
  const m = ISO_RE.exec(date)
  if (!m) throw new Error(`Invalid ISO date: ${date}`)
  return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS)
}

function fromDayNumber(day: number): IsoDate {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

/** Local calendar date of `now` in the user's time zone. */
export function todayIso(now: Date = new Date()): IsoDate {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromDayNumber(toDayNumber(date) + days)
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return toDayNumber(to) - toDayNumber(from)
}

/** Adds calendar months, clamping the day to the target month's length (Jan 31 + 1 = Feb 28/29). */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const m = ISO_RE.exec(date)
  if (!m) throw new Error(`Invalid ISO date: ${date}`)
  const total = +m[1] * 12 + (+m[2] - 1) + months
  const year = Math.floor(total / 12)
  const month = total - year * 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(+m[3], lastDay)
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(date: IsoDate): number {
  return new Date(toDayNumber(date) * DAY_MS).getUTCDay()
}

/** "YYYY-MM" */
export function monthKey(date: IsoDate): string {
  return date.slice(0, 7)
}

export function dayOfMonth(date: IsoDate): number {
  return +date.slice(8, 10)
}
