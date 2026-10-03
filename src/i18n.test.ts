import { describe, expect, it } from 'vitest'
import { browserLocale } from './i18n.ts'

describe('browserLocale', () => {
  it('takes the first supported language from the preference list', () => {
    expect(browserLocale(['nl-NL', 'ru', 'en'])).toBe('ru')
    expect(browserLocale(['en-GB', 'ru-RU'])).toBe('en')
    expect(browserLocale(['ru-RU'])).toBe('ru')
  })

  it('falls back to English when nothing is supported', () => {
    expect(browserLocale(['nl-NL', 'de'])).toBe('en')
    expect(browserLocale([])).toBe('en')
  })
})
