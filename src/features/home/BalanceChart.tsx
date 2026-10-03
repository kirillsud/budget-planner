import type { DailyBalance } from '../../domain/forecast.ts'
import type { Cents } from '../../domain/money.ts'
import type { IsoDate } from '../../domain/dates.ts'
import { useI18n } from '../../i18n.ts'
import { shortDate } from '../../lib/format.ts'

const W = 320
const H = 120

/** Area chart of the end-of-day balance with the warning and critical bands. */
export function BalanceChart({
  series,
  warning,
  critical,
  lowestDate,
  label,
}: {
  series: DailyBalance[]
  warning: Cents
  critical: Cents
  lowestDate: IsoDate | null
  label: string
}) {
  const { t, locale } = useI18n()
  if (series.length < 2) return null

  const values = series.map((d) => d.balance)
  let lo = Math.min(...values, critical, 0)
  let hi = Math.max(...values, warning)
  const pad = (hi - lo) * 0.08 || 1
  lo -= pad
  hi += pad

  const x = (i: number) => (i * W) / (series.length - 1)
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H
  const points = series.map((d, i) => `${x(i).toFixed(1)},${y(d.balance).toFixed(1)}`).join(' ')
  const lowestIndex = lowestDate ? series.findIndex((d) => d.date === lowestDate) : -1
  const yWarn = y(warning)
  const yCrit = y(critical)
  const last = series[series.length - 1]

  return (
    <figure className="m-0">
      <svg viewBox={`0 -6 ${W} ${H + 30}`} className="h-auto w-full" role="img" aria-label={label}>
        {warning > critical && <rect x="0" y={yWarn} width={W} height={Math.max(0, yCrit - yWarn)} fill="var(--warn-soft)" />}
        <rect x="0" y={yCrit} width={W} height={Math.max(0, H - yCrit)} fill="var(--crit-soft)" />
        <line x1="0" x2={W} y1={yWarn} y2={yWarn} stroke="var(--warn)" strokeDasharray="3 3" strokeWidth="1" />
        <line x1="0" x2={W} y1={yCrit} y2={yCrit} stroke="var(--crit)" strokeDasharray="3 3" strokeWidth="1" />
        <polygon points={`${points} ${W},${H} 0,${H}`} fill="var(--accent)" fillOpacity="0.1" />
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx={x(0)} cy={y(series[0].balance)} r="4" fill="var(--accent)" />
        {lowestIndex >= 0 && (
          <circle cx={x(lowestIndex)} cy={y(series[lowestIndex].balance)} r="4.5" fill="var(--warn)" stroke="var(--card)" strokeWidth="2" />
        )}
        <text x="0" y={H + 20} fontSize="11" fill="var(--muted)">
          {t('home.today')}
        </text>
        {lowestIndex > 0 && lowestIndex < series.length - 1 && (
          <text x={x(lowestIndex)} y={H + 20} fontSize="11" fill="var(--muted)" textAnchor="middle">
            {shortDate(series[lowestIndex].date, locale)}
          </text>
        )}
        <text x={W} y={H + 20} fontSize="11" fill="var(--muted)" textAnchor="end">
          {shortDate(last.date, locale)}
        </text>
      </svg>
    </figure>
  )
}
