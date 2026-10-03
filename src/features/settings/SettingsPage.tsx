import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { centsToInput, parseAmount } from '../../domain/money.ts'
import type { BudgetSettings } from '../../domain/records.ts'
import { useSettings, useUpdateSettings } from '../../data/queries.ts'
import { supabase } from '../../data/supabase.ts'
import { useI18n } from '../../i18n.ts'
import { Button, Card, Spinner, TextField, icons } from '../../components/ui.tsx'

/** Currencies offered in settings; RUB is the default for new accounts (see the migration). */
const currencies = ['RUB', 'EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CZK', 'SEK', 'NOK', 'DKK', 'TRY', 'GEL', 'AMD', 'KZT', 'UAH', 'RSD', 'AED', 'THB', 'VND'] as const

function currencyLabel(code: string, locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale === 'en' ? 'en' : 'ru'], { type: 'currency' }).of(code)
    return name ? `${code} · ${name}` : code
  } catch {
    return code
  }
}

/** The list plus the account's current currency if it is not in the list (e.g. set via SQL). */
function currencyOptions(current: string, locale: string) {
  const codes: string[] = [...currencies]
  if (!codes.includes(current)) codes.unshift(current)
  return codes.map((c) => ({ value: c, label: currencyLabel(c, locale) }))
}

export function SettingsPage() {
  const { t } = useI18n()
  const settings = useSettings()
  if (!settings.data) return <Spinner label={t('common.loading')} />
  return <SettingsForm settings={settings.data} />
}

type MoneyField = 'balance' | 'dailyExpenses' | 'warningBalance' | 'criticalBalance'

function SettingsForm({ settings }: { settings: BudgetSettings }) {
  const { t, locale } = useI18n()
  const update = useUpdateSettings()
  const [savedField, setSavedField] = useState<string | null>(null)
  const [values, setValues] = useState<Record<MoneyField, string>>({
    balance: centsToInput(settings.balance, locale),
    dailyExpenses: centsToInput(settings.dailyExpenses, locale),
    warningBalance: centsToInput(settings.warningBalance, locale),
    criticalBalance: centsToInput(settings.criticalBalance, locale),
  })
  const [scale, setScale] = useState(String(settings.scaleMonths))
  const [errors, setErrors] = useState<Partial<Record<MoneyField | 'scale', string>>>({})

  /** Saves on blur: no "Save" button, as in the production version. */
  async function saveMoney(field: MoneyField) {
    const cents = parseAmount(values[field])
    if (cents === null || (field === 'dailyExpenses' && cents < 0)) {
      setErrors((e) => ({ ...e, [field]: t('record.errorAmount') }))
      return
    }
    setErrors((e) => ({ ...e, [field]: undefined }))
    if (cents === settings[field]) return
    const patch: Partial<Pick<BudgetSettings, MoneyField>> = {}
    patch[field] = cents
    await update.mutateAsync(patch)
    setSavedField(field)
  }

  async function saveScale() {
    const n = Number(scale)
    if (!Number.isInteger(n) || n < 1 || n > 24) {
      setErrors((e) => ({ ...e, scale: '1–24' }))
      return
    }
    setErrors((e) => ({ ...e, scale: undefined }))
    if (n === settings.scaleMonths) return
    await update.mutateAsync({ scaleMonths: n })
    setSavedField('scale')
  }

  const field = (name: MoneyField, label: string, hint?: string) => (
    <TextField
      label={label}
      hint={savedField === name ? t('settings.saved') : hint}
      error={errors[name]}
      inputMode="decimal"
      value={values[name]}
      onChange={(e) => {
        setSavedField(null)
        setValues((v) => ({ ...v, [name]: e.target.value }))
      }}
      onBlur={() => saveMoney(name)}
    />
  )

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-3 pb-10">
      <header className="flex items-center gap-2">
        <Link to="/" aria-label={t('common.back')} className="-ml-2.5 flex size-11 items-center justify-center text-ink">
          {icons.back}
        </Link>
        <h1 className="m-0 text-[22px] font-bold">{t('settings.title')}</h1>
      </header>

      <Card className="flex flex-col gap-4 p-4">
        {field('balance', t('settings.balance'), t('settings.balanceHint'))}
        {field('dailyExpenses', t('settings.daily'), t('settings.dailyHint'))}
      </Card>

      <Card className="flex flex-col gap-4 p-4">
        {field('warningBalance', t('settings.warning'))}
        {field('criticalBalance', t('settings.critical'))}
        <TextField
          label={t('settings.scale')}
          inputMode="numeric"
          value={scale}
          hint={savedField === 'scale' ? t('settings.saved') : undefined}
          error={errors.scale}
          onChange={(e) => {
            setSavedField(null)
            setScale(e.target.value)
          }}
          onBlur={saveScale}
        />
      </Card>

      <Card className="flex flex-col gap-4 p-4">
        <SelectField
          label={t('settings.currency')}
          value={settings.currency}
          options={currencyOptions(settings.currency, locale)}
          onChange={(currency) => update.mutate({ currency })}
        />
        <SelectField
          label={t('settings.language')}
          value={settings.locale}
          options={[
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English' },
          ]}
          onChange={(value) => update.mutate({ locale: value === 'en' ? 'en' : 'ru' })}
        />
      </Card>

      {update.error && (
        <p role="alert" className="rounded-2xl bg-crit-soft p-3 text-sm text-crit-ink">
          {t('common.error', { message: update.error.message })}
        </p>
      )}

      <Button variant="danger" onClick={() => supabase.auth.signOut()}>
        {t('settings.signOut')}
      </Button>
    </main>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const id = `select-${label}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl border border-line bg-card px-3 text-base text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
