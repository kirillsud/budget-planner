import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { dayOfMonth, monthKey, todayIso, type IsoDate } from '../../domain/dates.ts'
import { dailyBalances, forecast, lowestUntilNextIncome, type ForecastPoint, type Level } from '../../domain/forecast.ts'
import { isSingleDay, signedAmount, type BudgetRecord, type BudgetSettings } from '../../domain/records.ts'
import { useRecords, useSettings } from '../../data/queries.ts'
import { useBankAutoRefresh, useBankStatus } from '../../data/bank.ts'
import { useI18n } from '../../i18n.ts'
import { money, monthTitle, shortDate, timeAgo, weekdayShort } from '../../lib/format.ts'
import { Button, Card, Spinner, icons } from '../../components/ui.tsx'
import { RecordSheet, type SheetState } from '../records/RecordSheet.tsx'
import { BalanceChart } from './BalanceChart.tsx'

const levelText: Record<Level, string> = { ok: 'text-ink', warning: 'text-warn', critical: 'text-crit' }

export function HomePage() {
  const { t } = useI18n()
  const settings = useSettings()
  const records = useRecords()

  if (settings.error || records.error) {
    const err = settings.error ?? records.error
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
        <p role="alert" className="rounded-2xl bg-crit-soft p-4 text-crit-ink">
          {t('common.error', { message: err?.message ?? '' })}
        </p>
        <Button onClick={() => (settings.error ? settings.refetch() : records.refetch())}>{t('common.retry')}</Button>
      </main>
    )
  }
  if (!settings.data || !records.data) return <Spinner label={t('common.loading')} />
  return <Home settings={settings.data} records={records.data} />
}

type Row =
  | { kind: 'day'; point: ForecastPoint }
  | { kind: 'lowest'; date: IsoDate; balance: number }

function Home({ settings, records }: { settings: BudgetSettings; records: BudgetRecord[] }) {
  const { t, locale } = useI18n()
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const today = todayIso()
  const cur = settings.currency
  const fromBank = settings.balanceSource === 'bank'
  useBankAutoRefresh(fromBank)
  const bank = useBankStatus()
  const conn = bank.data?.connection ?? null
  // the server switches the balance back to manual when consent expires: say so instead of "reconcile"
  const bankExpired = conn?.status === 'expired'

  const { f, series, lowest } = useMemo(() => {
    const input = { today, settings, records }
    return { f: forecast(input), series: dailyBalances(input), lowest: lowestUntilNextIncome(input) }
  }, [today, settings, records])

  const months = useMemo(() => {
    const rows: Row[] = f.points.map((point) => ({ kind: 'day' as const, point }))
    const lowestIsOwnRow = lowest && lowest.level !== 'ok' && !f.points.some((p) => p.date === lowest.date) && lowest.date !== today
    if (lowest && lowestIsOwnRow) {
      rows.push({ kind: 'lowest', date: lowest.date, balance: lowest.balance })
      rows.sort((a, b) => {
        const da = a.kind === 'day' ? a.point.date : a.date
        const db = b.kind === 'day' ? b.point.date : b.date
        return da < db ? -1 : da > db ? 1 : 0
      })
    }
    const groups: { key: string; first: IsoDate; rows: Row[] }[] = []
    for (const row of rows) {
      const date = row.kind === 'day' ? row.point.date : row.date
      const key = monthKey(date)
      const group = groups[groups.length - 1]
      if (group && group.key === key) group.rows.push(row)
      else groups.push({ key, first: date, rows: [row] })
    }
    return groups
  }, [f.points, lowest, today])

  const currentYear = Number(today.slice(0, 4))

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-5 pb-32">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-muted">{t('home.balanceNow')}</span>
          <span className="text-[26px] font-bold tracking-tight">{money(settings.balance, cur, locale)}</span>
          <Link to="/settings" className="text-[13px] font-medium text-accent no-underline">
            {bankExpired
              ? t('home.bankExpired')
              : fromBank && conn
                ? t('home.updatedBank', { bank: conn.aspspName, ago: timeAgo(settings.balanceUpdatedAt, t) })
                : t('home.updated', { ago: timeAgo(settings.balanceUpdatedAt, t) })}
          </Link>
        </div>
        <Link
          to="/settings"
          aria-label={t('home.settings')}
          className="flex size-11 items-center justify-center rounded-full border border-line bg-card text-ink"
        >
          {icons.gear}
        </Link>
      </header>

      {lowest && f.points.length > 0 && (
        <Card className="flex flex-col gap-3 px-4 pt-5 pb-3">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">
              {t(lowest.nextIncomeDate ? 'home.lowestUntilIncome' : 'home.lowestInWindow', {
                date: shortDate(lowest.date, locale),
              })}
            </span>
            <span className={`text-[40px] leading-tight font-bold tracking-tight ${levelText[lowest.level]}`}>
              {money(lowest.balance, cur, locale)}
            </span>
            <span className="text-[15px] leading-snug">
              {lowest.headroom >= 0
                ? t('home.headroom', {
                    amount: money(lowest.headroom, cur, locale),
                    critical: money(settings.criticalBalance, cur, locale),
                  })
                : t('home.belowCritical', {
                    amount: money(-lowest.headroom, cur, locale),
                    critical: money(settings.criticalBalance, cur, locale),
                  })}
            </span>
          </div>
          <BalanceChart
            series={series}
            warning={settings.warningBalance}
            critical={settings.criticalBalance}
            lowestDate={lowest.date}
            label={t('home.lowestInWindow', { date: shortDate(lowest.date, locale) })}
          />
        </Card>
      )}

      {f.overdue.length > 0 && (
        <Link
          to="/overdue"
          className="flex min-h-11 items-center gap-3 rounded-2xl bg-warn-soft px-4 py-3.5 text-warn-ink no-underline"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warn text-sm font-bold text-card">
            {f.overdue.length}
          </span>
          <span className="grow text-[15px] font-medium">{t('home.overdue')}</span>
          {icons.chevron}
        </Link>
      )}

      {f.points.length === 0 ? (
        <Card className="p-5 text-[15px] leading-relaxed text-muted">{t('home.empty')}</Card>
      ) : (
        months.map((group, gi) => (
          <section key={group.key} className="flex flex-col gap-3" aria-label={monthTitle(group.first, locale, currentYear)}>
            <div className="flex items-baseline justify-between gap-3 px-1 pt-1">
              <h2 className="m-0 text-xl font-bold">{monthTitle(group.first, locale, currentYear)}</h2>
              {gi === 0 && settings.dailyExpenses > 0 && (
                <span className="text-right text-[13px] text-muted">
                  {t('home.dailyIncluded', { amount: money(-settings.dailyExpenses, cur, locale) })}
                </span>
              )}
            </div>
            <Card className="overflow-hidden">
              <ul className="m-0 list-none p-0">
                {group.rows.map((row) =>
                  row.kind === 'lowest' ? (
                    <LowestRow key={`low-${row.date}`} date={row.date} balance={row.balance} settings={settings} />
                  ) : (
                    <DayRow key={row.point.date} point={row.point} settings={settings} onOpen={(r) => setSheet({ mode: 'edit', record: r })} />
                  ),
                )}
              </ul>
            </Card>
          </section>
        ))
      )}

      {f.points.length > 0 && (
        <p className="px-1 text-sm text-muted">
          {t('home.final', { date: shortDate(f.final.date, locale) })}:{' '}
          <b className={levelText[f.final.level]}>{money(f.final.total, cur, locale)}</b>
        </p>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 mx-auto flex max-w-xl justify-end gap-2 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setSheet({ mode: 'new', type: 'expense' })}
          className="pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-accent pr-5.5 pl-4.5 text-base font-semibold text-white shadow-lg shadow-accent/30"
        >
          {icons.plus}
          {t('home.add')}
        </button>
      </div>

      <RecordSheet
        state={sheet}
        onClose={() => setSheet(null)}
        onChange={setSheet}
        records={records}
        settings={settings}
        today={today}
      />
    </main>
  )
}

function DayRow({ point, settings, onOpen }: { point: ForecastPoint; settings: BudgetSettings; onOpen: (r: BudgetRecord) => void }) {
  const { t, locale } = useI18n()
  const items = [...point.incomes, ...point.expenses]
  const tinted = point.endLevel !== 'ok'
  return (
    <li className={`grid grid-cols-[48px_minmax(0,1fr)] gap-3 border-b border-line-soft px-4 py-3.5 last:border-b-0 ${tinted ? 'bg-warn-row' : ''}`}>
      <div className="flex flex-col items-center pt-0.5">
        <span className="text-lg leading-tight font-bold">{dayOfMonth(point.date)}</span>
        <span className="text-xs text-muted">{weekdayShort(point.date, locale)}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-2.5">
        {items.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onOpen(r)}
            className={`flex w-full items-start justify-between gap-3 text-left ${r.completed ? 'opacity-50' : ''}`}
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className={`truncate text-[15px] font-medium ${r.completed ? 'line-through' : ''}`}>{r.title}</span>
              {Boolean(r.seriesId) && <span className="text-xs text-muted">{t('record.monthly')}</span>}
              {!isSingleDay(r) && (
                <span className="self-start rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-ink">
                  {t('record.anyDay', { from: shortDate(r.dateFrom, locale), to: shortDate(r.dateTo, locale) })}
                </span>
              )}
              {r.completed && <span className="text-xs text-muted">{t('record.completed')}</span>}
            </span>
            <span className={`shrink-0 text-[15px] font-semibold ${r.type === 'income' ? 'text-accent' : 'text-ink'}`}>
              {money(signedAmount(r), settings.currency, locale, true)}
            </span>
          </button>
        ))}
        <span className={`self-end text-xs ${point.endLevel === 'ok' ? 'text-muted' : `font-semibold ${levelText[point.endLevel]}`}`}>
          {t('home.after', { amount: money(point.endTotal, settings.currency, locale) })}
        </span>
      </div>
    </li>
  )
}

function LowestRow({ date, balance, settings }: { date: IsoDate; balance: number; settings: BudgetSettings }) {
  const { t, locale } = useI18n()
  return (
    <li className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line-soft bg-warn-row px-4 py-3.5 last:border-b-0">
      <div className="flex flex-col items-center">
        <span className="text-lg leading-tight font-bold">{dayOfMonth(date)}</span>
        <span className="text-xs text-muted">{weekdayShort(date, locale)}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-medium text-warn">{t('home.lowestRow')}</span>
        <span className="text-xs text-muted">{t('home.lowestRowHint')}</span>
      </div>
      <span className="text-[15px] font-semibold text-warn">{money(balance, settings.currency, locale)}</span>
    </li>
  )
}
