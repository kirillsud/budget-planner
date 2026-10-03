import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { todayIso } from '../../domain/dates.ts'
import { realityCheck, suggestDailyExpenses } from '../../domain/reality.ts'
import type { BudgetSettings } from '../../domain/records.ts'
import { useBalanceSnapshots, useRecords } from '../../data/queries.ts'
import { useI18n } from '../../i18n.ts'
import { money, shortDate } from '../../lib/format.ts'
import { Button, Card } from '../../components/ui.tsx'

/**
 * "Forecast vs reality": how much really left the account per day beyond the records, from the balance
 * history, next to the daily spending in settings, with a one-tap update when they differ.
 */
export function RealityCard({ settings, onAccept }: { settings: BudgetSettings; onAccept: (perDay: number) => void }) {
  const { t, locale } = useI18n()
  const snapshots = useBalanceSnapshots()
  const records = useRecords()
  const today = todayIso()

  const check = useMemo(
    () => (snapshots.data && records.data ? realityCheck({ today, snapshots: snapshots.data, records: records.data }) : null),
    [today, snapshots.data, records.data],
  )
  if (!check) return null

  const cur = settings.currency
  const m = (cents: number) => money(cents, cur, locale)
  const suggestion = suggestDailyExpenses(check, settings.dailyExpenses)

  return (
    <Card className="flex flex-col gap-3 p-4 text-[15px] leading-snug">
      <h2 className="m-0 text-[17px] font-bold">{t('reality.title')}</h2>

      {check.status === 'collecting' ? (
        <p className="m-0 text-muted">{t('reality.collecting', { days: check.days, need: check.needDays })}</p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[13px] text-muted">{t('reality.actual')}</span>
              <span className="text-[24px] font-bold tracking-tight">
                {check.perDay > 0 ? t('reality.perDay', { amount: m(check.perDay) }) : '—'}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[13px] text-muted">{t('reality.planned')}</span>
              <span className="text-[17px] font-semibold">{t('reality.perDay', { amount: m(settings.dailyExpenses) })}</span>
            </div>
          </div>

          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-muted">
            <li>
              {t('reality.window', {
                from: shortDate(check.from, locale),
                to: shortDate(check.to, locale),
                days: check.days,
              })}
            </li>
            <li>{t('reality.balances', { start: m(check.startBalance), end: m(check.endBalance) })}</li>
            <li>{t('reality.recorded', { incomes: m(check.incomes), expenses: m(check.expenses) })}</li>
            <li className="font-medium text-ink">
              {check.unplanned >= 0
                ? t('reality.unplanned', { amount: m(check.unplanned) })
                : t('reality.surplus', { amount: m(-check.unplanned) })}
            </li>
          </ul>

          {check.pendingPast > 0 && (
            <Link to="/overdue" className="rounded-xl bg-warn-soft p-2.5 text-[13px] text-warn-ink no-underline">
              {t('reality.pending', { n: check.pendingPast })}
            </Link>
          )}
          {check.days < 14 && check.pendingPast === 0 && (
            <p className="m-0 text-[13px] text-muted">{t('reality.early', { days: 14 - check.days })}</p>
          )}

          {suggestion !== null && (
            <Button variant="soft" onClick={() => onAccept(suggestion)}>
              {t('reality.accept', { amount: m(suggestion) })}
            </Button>
          )}
        </>
      )}
      <p className="m-0 text-[13px] text-muted">{t('reality.hint')}</p>
    </Card>
  )
}
