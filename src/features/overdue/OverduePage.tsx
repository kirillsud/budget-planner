import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { todayIso } from '../../domain/dates.ts'
import { forecast } from '../../domain/forecast.ts'
import type { BudgetRecord, BudgetSettings } from '../../domain/records.ts'
import { useDeleteRecord, useRecords, useSaveRecord, useSettings } from '../../data/queries.ts'
import { useI18n } from '../../i18n.ts'
import { money, shortDate } from '../../lib/format.ts'
import { Button, Card, Spinner, icons } from '../../components/ui.tsx'
import { RecordSheet, type SheetState } from '../records/RecordSheet.tsx'

export function OverduePage() {
  const { t } = useI18n()
  const settings = useSettings()
  const records = useRecords()
  if (!settings.data || !records.data) return <Spinner label={t('common.loading')} />
  return <Overdue settings={settings.data} records={records.data} />
}

function Overdue({ settings, records }: { settings: BudgetSettings; records: BudgetRecord[] }) {
  const { t, locale } = useI18n()
  const today = todayIso()
  const save = useSaveRecord()
  const remove = useDeleteRecord()
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const overdue = useMemo(() => forecast({ today, settings, records }).overdue, [today, settings, records])

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-3 pb-10">
      <header className="flex items-center gap-2">
        <Link to="/" aria-label={t('common.back')} className="-ml-2.5 flex size-11 items-center justify-center text-ink">
          {icons.back}
        </Link>
        <h1 className="m-0 text-[22px] font-bold">{t('overdue.title')}</h1>
      </header>
      <p className="m-0 px-1 text-sm leading-relaxed text-muted">{t('overdue.subtitle')}</p>

      {overdue.length === 0 ? (
        <Card className="p-5 text-[15px] text-muted">{t('overdue.empty')}</Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="m-0 list-none p-0">
            {overdue.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 border-b border-line-soft p-4 last:border-b-0">
                <div className="flex justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-medium">{r.title}</span>
                    <span className="text-xs text-muted">{t('overdue.until', { date: shortDate(r.dateTo, locale) })}</span>
                  </div>
                  <span className={`shrink-0 text-[15px] font-semibold ${r.type === 'income' ? 'text-accent' : ''}`}>
                    {money(r.type === 'income' ? r.amount : -r.amount, settings.currency, locale, true)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="soft"
                    className="px-2 text-sm"
                    disabled={save.isPending}
                    onClick={() => save.mutate({ ...r, completed: true })}
                  >
                    {r.type === 'income' ? t('overdue.received') : t('overdue.paid')}
                  </Button>
                  <Button className="px-2 text-sm" onClick={() => setSheet({ mode: 'edit', record: r })}>
                    {t('overdue.move')}
                  </Button>
                  <Button
                    className="px-2 text-sm"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(t('record.deleteConfirm', { title: r.title }))) remove.mutate(r.id)
                    }}
                  >
                    {t('overdue.cancel')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
