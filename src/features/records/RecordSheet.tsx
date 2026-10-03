import { useMemo, useState, type FormEvent } from 'react'
import { addDays, addMonths, diffDays, isIsoDate, type IsoDate } from '../../domain/dates.ts'
import { lowestUntilNextIncome } from '../../domain/forecast.ts'
import { centsToInput, parseAmount } from '../../domain/money.ts'
import type { BudgetRecord, BudgetSettings, NewBudgetRecord, RecordType } from '../../domain/records.ts'
import { useDeleteRecord, useRepeatMonthly, useSaveRecord, useStopSeriesFrom, useUpdateSeriesFrom } from '../../data/queries.ts'
import { useI18n } from '../../i18n.ts'
import { money, shortDate } from '../../lib/format.ts'
import { Button, Chip, Sheet, TextField, icons } from '../../components/ui.tsx'

export type SheetState = { mode: 'new'; type: RecordType; draft?: Partial<NewBudgetRecord> } | { mode: 'edit'; record: BudgetRecord }

interface Props {
  state: SheetState | null
  onClose: () => void
  onChange: (next: SheetState) => void
  records: BudgetRecord[]
  settings: BudgetSettings
  today: IsoDate
}

export function RecordSheet({ state, onClose, onChange, records, settings, today }: Props) {
  const { t } = useI18n()
  const label = state?.mode === 'edit' ? t('record.edit') : state?.type === 'income' ? t('record.newIncome') : t('record.newExpense')
  return (
    <Sheet open={state !== null} onClose={onClose} label={label}>
      {state && (
        <RecordForm
          key={state.mode === 'edit' ? `edit-${state.record.id}` : `new-${state.type}-${state.draft?.dateFrom ?? ''}-${state.draft?.title ?? ''}`}
          state={state}
          onClose={onClose}
          onChange={onChange}
          records={records}
          settings={settings}
          today={today}
        />
      )}
    </Sheet>
  )
}

function RecordForm({ state, onClose, onChange, records, settings, today }: Props & { state: SheetState }) {
  const { t, locale } = useI18n()
  const save = useSaveRecord()
  const remove = useDeleteRecord()
  const repeatMonthly = useRepeatMonthly()
  const updateSeries = useUpdateSeriesFrom()
  const stopSeries = useStopSeriesFrom()
  const inSeries = state.mode === 'edit' && Boolean(state.record.seriesId)

  const initial: NewBudgetRecord =
    state.mode === 'edit'
      ? state.record
      : {
          type: state.type,
          title: '',
          amount: 0,
          dateFrom: today,
          dateTo: today,
          completed: false,
          ...state.draft,
        }

  const [type, setType] = useState<RecordType>(initial.type)
  const [title, setTitle] = useState(initial.title)
  const [amountText, setAmountText] = useState(initial.amount ? centsToInput(initial.amount, locale) : '')
  const [dateFrom, setDateFrom] = useState<IsoDate>(initial.dateFrom)
  const [dateTo, setDateTo] = useState<IsoDate>(initial.dateTo)
  const [isPeriod, setIsPeriod] = useState(initial.dateFrom !== initial.dateTo)
  const [submitted, setSubmitted] = useState(false)
  /** New or one-off record: turn it into a monthly series on save. */
  const [repeat, setRepeat] = useState(false)
  /** Month of a series: also change the later months. */
  const [applyToFollowing, setApplyToFollowing] = useState(false)

  const amount = parseAmount(amountText)
  const effectiveTo = isPeriod ? dateTo : dateFrom
  const errors = {
    title: title.trim() === '' ? t('record.errorTitle') : undefined,
    amount: amount === null || amount < 0 ? t('record.errorAmount') : undefined,
    period: isPeriod && dateTo < dateFrom ? t('record.errorPeriod') : undefined,
  }
  const valid = !errors.title && !errors.amount && !errors.period && isIsoDate(dateFrom) && isIsoDate(effectiveTo)
  // a monthly series cannot have months that overlap
  const periodTooLongToRepeat = isIsoDate(dateFrom) && isIsoDate(effectiveTo) && diffDays(dateFrom, effectiveTo) > 27

  const nextIncome = useMemo(
    () => lowestUntilNextIncome({ today, settings, records })?.nextIncomeDate ?? null,
    [today, settings, records],
  )

  const suggestions = useMemo(() => {
    if (state.mode === 'edit') return []
    const counts = new Map<string, number>()
    for (const r of records) if (r.type === type) counts.set(r.title, (counts.get(r.title) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .filter((name) => name.toLowerCase().includes(title.trim().toLowerCase()) && name !== title)
      .slice(0, 4)
  }, [records, type, title, state.mode])

  const impact = useMemo(() => {
    if (amount === null || !isIsoDate(dateFrom) || !isIsoDate(effectiveTo) || effectiveTo < dateFrom) return null
    if (state.mode === 'edit' && state.record.completed) return null
    const draft: BudgetRecord = {
      id: state.mode === 'edit' ? state.record.id : -1,
      type,
      title,
      amount,
      dateFrom,
      dateTo: effectiveTo,
      completed: false,
    }
    const others = records.filter((r) => state.mode !== 'edit' || r.id !== state.record.id)
    const after = lowestUntilNextIncome({ today, settings, records: [...others, draft] })
    const before = lowestUntilNextIncome({ today, settings, records })
    if (!after || !before || after.balance === before.balance) return null
    return after
  }, [amount, dateFrom, effectiveTo, type, title, records, settings, today, state])

  function payload(extra?: Partial<NewBudgetRecord>): NewBudgetRecord {
    return {
      id: state.mode === 'edit' ? state.record.id : undefined,
      type,
      title: title.trim(),
      amount: amount ?? 0,
      dateFrom,
      dateTo: effectiveTo,
      completed: state.mode === 'edit' ? state.record.completed : false,
      ...extra,
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!valid) return
    if (inSeries && applyToFollowing && state.mode === 'edit') {
      await updateSeries.mutateAsync({ ...payload(), id: state.record.id })
    } else {
      const saved = await save.mutateAsync(payload())
      if (!inSeries && repeat && !periodTooLongToRepeat) await repeatMonthly.mutateAsync(saved.id)
    }
    onClose()
  }

  async function stopRepeating() {
    if (state.mode !== 'edit') return
    if (!window.confirm(t('record.stopConfirm', { title: state.record.title }))) return
    await stopSeries.mutateAsync(state.record.id)
    onClose()
  }

  async function toggleDone() {
    if (state.mode !== 'edit') return
    await save.mutateAsync({ ...state.record, completed: !state.record.completed })
    onClose()
  }

  async function del() {
    if (state.mode !== 'edit') return
    if (!window.confirm(t('record.deleteConfirm', { title: state.record.title }))) return
    await remove.mutateAsync(state.record.id)
    onClose()
  }

  /** One tap: saves a copy one month later and opens it, so it can be adjusted right away. */
  async function copyNextMonth() {
    if (!valid) {
      setSubmitted(true)
      return
    }
    const copy = await save.mutateAsync({
      type,
      title: title.trim(),
      amount: amount ?? 0,
      dateFrom: addMonths(dateFrom, 1),
      dateTo: addMonths(effectiveTo, 1),
      completed: false,
    })
    onChange({ mode: 'edit', record: copy })
  }

  function setDay(day: IsoDate) {
    setDateFrom(day)
    if (!isPeriod || dateTo < day) setDateTo(day)
  }

  const busy = save.isPending || remove.isPending || repeatMonthly.isPending || updateSeries.isPending || stopSeries.isPending
  const mutationError = save.error ?? remove.error ?? repeatMonthly.error ?? updateSeries.error ?? stopSeries.error

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="h-1 w-10 self-center rounded-full bg-line" aria-hidden="true" />

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-line-soft p-1" role="radiogroup" aria-label={t('record.edit')}>
        {(['expense', 'income'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => setType(value)}
            className={`h-11 rounded-xl text-[15px] transition ${
              type === value ? 'bg-card font-semibold text-ink shadow-sm' : 'font-medium text-muted'
            }`}
          >
            {value === 'expense' ? t('record.expense') : t('record.income')}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1">
        <label htmlFor="record-amount" className="text-[13px] text-muted">
          {t('record.amount')}
        </label>
        <input
          id="record-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          aria-invalid={submitted && Boolean(errors.amount)}
          className="w-full bg-transparent text-center text-5xl font-bold tracking-tight text-ink outline-none placeholder:text-line"
        />
        {submitted && errors.amount && <span className="text-[13px] text-crit">{errors.amount}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <TextField
          label={t('record.title')}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          error={submitted ? errors.title : undefined}
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTitle(s)}
                className="h-8 rounded-full border border-line bg-paper px-3 text-[13px] text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] text-muted">{t('record.when')}</legend>
        <div className="flex flex-wrap gap-2">
          <Chip active={!isPeriod && dateFrom === today} onClick={() => setDay(today)}>
            {t('record.today')}
          </Chip>
          <Chip active={!isPeriod && dateFrom === addDays(today, 1)} onClick={() => setDay(addDays(today, 1))}>
            {t('record.tomorrow')}
          </Chip>
          {nextIncome && type === 'expense' && (
            <Chip active={!isPeriod && dateFrom === nextIncome} onClick={() => setDay(nextIncome)}>
              {t('record.nextIncome')}
            </Chip>
          )}
          <Chip active={isPeriod} onClick={() => setIsPeriod((v) => !v)}>
            {t('record.period')}
          </Chip>
        </div>
        <div className={`grid gap-2 ${isPeriod ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TextField
            label={isPeriod ? t('record.from') : t('record.singleDay')}
            type="date"
            value={dateFrom}
            onChange={(e) => e.target.value && setDay(e.target.value)}
          />
          {isPeriod && (
            <TextField
              label={t('record.to')}
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => e.target.value && setDateTo(e.target.value)}
              error={errors.period}
            />
          )}
        </div>
      </fieldset>

      {inSeries ? (
        <CheckRow
          checked={applyToFollowing}
          onChange={setApplyToFollowing}
          title={t('record.applyFollowing')}
          hint={t('record.applyFollowingHint')}
        />
      ) : (
        <CheckRow
          checked={repeat && !periodTooLongToRepeat}
          disabled={periodTooLongToRepeat}
          onChange={setRepeat}
          title={t('record.repeatMonthly')}
          hint={periodTooLongToRepeat ? t('record.repeatTooLong') : t('record.repeatMonthlyHint')}
        />
      )}

      {impact && (
        <div
          role="status"
          className={`flex gap-3 rounded-2xl p-3.5 text-sm leading-snug ${
            impact.level === 'critical'
              ? 'bg-crit-soft text-crit-ink'
              : impact.level === 'warning'
                ? 'bg-warn-soft text-warn-ink'
                : 'bg-accent-soft text-accent-ink'
          }`}
        >
          {impact.level !== 'ok' && icons.warning}
          <span>
            {t(impact.level === 'critical' ? 'record.impactBelow' : impact.level === 'warning' ? 'record.impactWarning' : 'record.impactOk', {
              amount: money(impact.balance, settings.currency, locale),
              critical: money(settings.criticalBalance, settings.currency, locale),
              warning: money(settings.warningBalance, settings.currency, locale),
            })}
            {impact.nextIncomeDate && ` (${shortDate(impact.date, locale)})`}
          </span>
        </div>
      )}

      {mutationError && (
        <p role="alert" className="rounded-2xl bg-crit-soft p-3 text-sm text-crit-ink">
          {t('common.error', { message: mutationError.message })}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button type="submit" variant="primary" className="h-13" disabled={busy}>
          {state.mode === 'edit' ? t('record.save') : t('record.add')}
        </Button>
        {state.mode === 'edit' && (
          <div className="grid grid-cols-3 gap-2">
            <Button variant="soft" onClick={toggleDone} disabled={busy} className="px-2 text-sm">
              {state.record.completed ? t('record.markUndone') : t('record.markDone')}
            </Button>
            {inSeries ? (
              <Button onClick={stopRepeating} disabled={busy} className="px-2 text-sm">
                {t('record.stopRepeat')}
              </Button>
            ) : (
              <Button onClick={copyNextMonth} disabled={busy} className="px-2 text-sm">
                {t('record.copyNextMonth')}
              </Button>
            )}
            <Button variant="danger" onClick={del} disabled={busy} className="px-2 text-sm">
              {inSeries ? t('record.deleteThisMonth') : t('record.delete')}
            </Button>
          </div>
        )}
      </div>
    </form>
  )
}

function CheckRow({
  checked,
  disabled,
  onChange,
  title,
  hint,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
  title: string
  hint: string
}) {
  return (
    <label className={`flex min-h-11 items-center justify-between gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-medium">{title}</span>
        <span className="text-xs text-muted">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5.5 shrink-0 accent-accent"
      />
    </label>
  )
}
