/** Money in minor units (cents). Never a float. */
export type Cents = number

/**
 * Parses user input like "1 450", "1450,50", "1.450,5", "€ 12.30" into cents.
 * The last "," or "." followed by 1-2 digits is the decimal separator; other separators are grouping.
 * Returns null for empty or invalid input.
 */
export function parseAmount(input: string): Cents | null {
  const cleaned = input.replace(/[\s  €$£₽]/g, '')
  if (cleaned === '' || /[^\d.,-]/.test(cleaned)) return null
  const negative = cleaned.startsWith('-')
  const body = negative ? cleaned.slice(1) : cleaned
  if (body === '' || body.includes('-')) return null
  const m = /^(.*?)(?:[.,](\d{1,2}))?$/.exec(body)
  if (!m) return null
  const intPart = m[1].replace(/[.,]/g, '')
  if (intPart === '' && !m[2]) return null
  if (!/^\d*$/.test(intPart)) return null
  const fraction = (m[2] ?? '').padEnd(2, '0')
  const cents = Number(intPart || '0') * 100 + Number(fraction || '0')
  if (!Number.isSafeInteger(cents)) return null
  return negative ? -cents : cents
}

/** Formats cents for editing in an input: "1450" or "1450,50" (locale decimal separator). */
export function centsToInput(cents: Cents, locale: string): string {
  const sep = locale.startsWith('en') ? '.' : ','
  const abs = Math.abs(cents)
  const whole = Math.trunc(abs / 100)
  const frac = abs % 100
  const text = frac === 0 ? String(whole) : `${whole}${sep}${String(frac).padStart(2, '0')}`
  return cents < 0 ? `-${text}` : text
}

export function formatMoney(cents: Cents, currency: string, locale: string, opts?: { signed?: boolean }): string {
  const whole = cents % 100 === 0
  const fmt = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
    signDisplay: opts?.signed ? 'exceptZero' : 'auto',
  })
  return fmt.format(cents / 100)
}
