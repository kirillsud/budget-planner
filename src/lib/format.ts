import type { IsoDate } from '../domain/dates.ts'
import { formatMoney, type Cents } from '../domain/money.ts'
import type { Locale, Translate } from '../i18n.ts'

const intlLocale = (locale: Locale) => (locale === 'en' ? 'en-GB' : 'ru-RU')

function asUtcDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`)
}

/** "24 окт" / "24 Oct" */
export function shortDate(date: IsoDate, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(asUtcDate(date))
    .replace('.', '')
}

/** "пн" / "Mon" */
export function weekdayShort(date: IsoDate, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short', timeZone: 'UTC' }).format(asUtcDate(date))
}

/** "Октябрь" / "October" (with the year when it is not the current one) */
export function monthTitle(date: IsoDate, locale: Locale, currentYear: number): string {
  const d = asUtcDate(date)
  const opts: Intl.DateTimeFormatOptions = { month: 'long', timeZone: 'UTC' }
  if (d.getUTCFullYear() !== currentYear) opts.year = 'numeric'
  const text = new Intl.DateTimeFormat(intlLocale(locale), opts).format(d)
  const standalone = locale === 'ru' ? text.replace(/ г\.$/, '') : text
  return standalone.charAt(0).toUpperCase() + standalone.slice(1)
}

export function money(cents: Cents, currency: string, locale: Locale, signed = false): string {
  return formatMoney(cents, currency, locale, { signed })
}

export function timeAgo(iso: string, t: Translate, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return t('ago.justNow')
  if (minutes < 60) return t('ago.minutes', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('ago.hours', { n: hours })
  return t('ago.days', { n: Math.floor(hours / 24) })
}
