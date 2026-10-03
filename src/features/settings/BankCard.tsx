import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  bankRedirectUrl,
  startBankConsent,
  useAspsps,
  useBankAction,
  useBankStatus,
  type BankConnection,
  type SaveCredentialsResult,
} from '../../data/bank.ts'
import { useI18n } from '../../i18n.ts'
import { timeAgo } from '../../lib/format.ts'
import { Button, Card, TextField } from '../../components/ui.tsx'

/** Countries offered in the bank picker; Enable Banking covers more, these are the common ones. */
const countries = ['NL', 'DE', 'BE', 'FR', 'ES', 'IT', 'AT', 'IE', 'PT', 'FI', 'SE', 'DK', 'NO', 'PL', 'LT', 'LV', 'EE'] as const

const DAY = 24 * 3600 * 1000

function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

function longDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  )
}

/** Settings card: own Enable Banking keys, then bank consent, then the connected account. */
export function BankCard() {
  const { t } = useI18n()
  const status = useBankStatus()
  const [saved, setSaved] = useState<SaveCredentialsResult | null>(null)
  const redirect = bankRedirectUrl()
  const strip = (u: string) => u.replace(/\/+$/, '')
  const redirectMissing = saved !== null && !saved.redirectUrls.some((u) => strip(u) === strip(redirect))

  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="m-0 text-[17px] font-bold">{t('bank.title')}</h2>
      {status.error ? (
        <p role="alert" className="m-0 text-sm text-crit">
          {t('common.error', { message: status.error.message })}
        </p>
      ) : !status.data ? (
        <p className="m-0 text-sm text-muted">{t('common.loading')}</p>
      ) : !status.data.appId ? (
        <KeysForm onSaved={setSaved} />
      ) : (
        <>
          {saved && (
            <p className="m-0 text-[13px] text-muted">{t('bank.keysSaved', { app: saved.appName ?? status.data.appId })}</p>
          )}
          {redirectMissing && (
            <p role="alert" className="m-0 rounded-xl bg-warn-soft p-2.5 text-[13px] text-warn-ink">
              {t('bank.redirectMissing', { url: redirect })}
            </p>
          )}
          <Connected appId={status.data.appId} connection={status.data.connection} />
        </>
      )}
    </Card>
  )
}

function CopyLine({ value }: { value: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2">
      <code className="min-w-0 grow text-[13px] break-all">{value}</code>
      <button
        type="button"
        className="min-h-9 shrink-0 text-[13px] font-semibold text-accent"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => setCopied(true))
        }}
      >
        {copied ? t('bank.copied') : t('bank.copy')}
      </button>
    </div>
  )
}

function KeysForm({ onSaved }: { onSaved: (result: SaveCredentialsResult) => void }) {
  const { t } = useI18n()
  const save = useBankAction<{ appId: string; privateKey: string }, SaveCredentialsResult>('save-credentials')
  const [appId, setAppId] = useState('')
  const [key, setKey] = useState('')
  const redirect = bankRedirectUrl()

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setKey((await file.text()).trim())
    e.target.value = ''
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate({ appId: appId.trim(), privateKey: key.trim() }, { onSuccess: onSaved })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 text-[15px] leading-snug">
      <p className="m-0 text-muted">{t('bank.intro')}</p>
      <ol className="m-0 flex flex-col gap-2 pl-5">
        <li>{t('bank.step1')}</li>
        <li className="flex flex-col gap-2">
          {t('bank.step2')}
          <CopyLine value={redirect} />
        </li>
        <li>{t('bank.step3')}</li>
        <li>{t('bank.step4')}</li>
      </ol>
      <TextField
        label={t('bank.appId')}
        value={appId}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setAppId(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bank-key" className="text-[13px] text-muted">
          {t('bank.key')}
        </label>
        <textarea
          id="bank-key"
          value={key}
          rows={4}
          spellCheck={false}
          autoComplete="off"
          placeholder="-----BEGIN PRIVATE KEY-----"
          onChange={(e) => setKey(e.target.value)}
          className="rounded-xl border border-line bg-card px-3.5 py-2.5 font-mono text-xs text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <label className="self-start text-[13px] font-semibold text-accent">
          <input type="file" accept=".pem,.key,.txt" className="sr-only" onChange={onFile} />
          {t('bank.keyFile')}
        </label>
      </div>
      {save.error && (
        <p role="alert" className="m-0 text-sm text-crit">
          {t('common.error', { message: save.error.message })}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={save.isPending || !appId.trim() || !key.includes('PRIVATE KEY')}>
        {save.isPending ? t('bank.checking') : t('bank.saveKeys')}
      </Button>
    </form>
  )
}

function Connected({ appId, connection }: { appId: string; connection: BankConnection | null }) {
  const { t, locale } = useI18n()
  const refresh = useBankAction<{ force: boolean }>('refresh')
  const disconnect = useBankAction<{ connectionId: number }>('disconnect')
  const clear = useBankAction<Record<string, never>>('clear-credentials')
  const choose = useBankAction<{ connectionId: number; accountUid: string }>('choose-account')
  const [picking, setPicking] = useState(false)

  const active = connection?.status === 'active'
  const expiresAt = connection?.validUntil ? new Date(connection.validUntil).getTime() : null
  const expired = connection?.status === 'expired' || (expiresAt !== null && expiresAt < Date.now())
  const expiresSoon = active && !expired && expiresAt !== null && expiresAt - Date.now() < 7 * DAY
  const busy = refresh.isPending || disconnect.isPending || clear.isPending || choose.isPending
  const error = refresh.error ?? disconnect.error ?? clear.error ?? choose.error

  return (
    <div className="flex flex-col gap-3 text-[15px] leading-snug">
      <p className="m-0 text-[13px] text-muted">{t('bank.keysInfo', { app: `${appId.slice(0, 8)}…` })}</p>

      {connection?.status === 'choose_account' && (
        <div className="flex flex-col gap-2">
          <p className="m-0 font-medium">{t('bank.chooseAccount')}</p>
          {connection.accounts.map((a) => (
            <Button
              key={a.uid}
              disabled={busy}
              onClick={() => choose.mutate({ connectionId: connection.id, accountUid: a.uid })}
              className="justify-between"
            >
              <span className="truncate">{a.name ?? connection.aspspName}</span>
              <span className="text-muted">
                {a.ibanTail ? `··${a.ibanTail}` : ''} {a.currency ?? ''}
              </span>
            </Button>
          ))}
        </div>
      )}

      {connection && connection.status !== 'choose_account' && (
        <div className="flex flex-col gap-1">
          <span className="font-semibold">
            {t('bank.connected', {
              bank: connection.aspspName,
              account: t('bank.account', {
                name: connection.accountName ?? connection.currency ?? '',
                tail: connection.accountIbanTail ?? '',
              }),
            })}
          </span>
          <span className="text-[13px] text-muted">
            {connection.lastBalanceAt ? t('bank.lastUpdate', { ago: timeAgo(connection.lastBalanceAt, t) }) : t('bank.neverUpdated')}
          </span>
          {active && connection.validUntil && !expiresSoon && (
            <span className="text-[13px] text-muted">{t('bank.validUntil', { date: longDate(connection.validUntil, locale) })}</span>
          )}
          {expiresSoon && connection.validUntil && (
            <p className="m-0 rounded-xl bg-warn-soft p-2.5 text-[13px] text-warn-ink">
              {t('bank.expiresSoon', { date: longDate(connection.validUntil, locale) })}
            </p>
          )}
          {expired && <p className="m-0 rounded-xl bg-warn-soft p-2.5 text-[13px] text-warn-ink">{t('bank.expired')}</p>}
          {connection.lastError && !expired && (
            <span className="text-[13px] text-crit">{t('bank.lastError', { message: connection.lastError })}</span>
          )}
          {active && !expired && <span className="text-[13px] text-muted">{t('bank.autoHint')}</span>}
        </div>
      )}

      {error && (
        <p role="alert" className="m-0 text-sm text-crit">
          {t('common.error', { message: error.message })}
        </p>
      )}

      {active && !expired && (
        <Button disabled={busy} onClick={() => refresh.mutate({ force: true })}>
          {t('bank.refresh')}
        </Button>
      )}

      {picking || !connection || !active || expired || expiresSoon ? (
        <BankPicker reconnect={Boolean(connection)} />
      ) : (
        <Button variant="ghost" onClick={() => setPicking(true)}>
          {t('bank.reconnect')}
        </Button>
      )}

      {connection && connection.status !== 'expired' && (
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            if (window.confirm(t('bank.disconnectConfirm'))) disconnect.mutate({ connectionId: connection.id })
          }}
        >
          {t('bank.disconnect')}
        </Button>
      )}
      <Button
        variant="ghost"
        disabled={busy}
        className="text-crit"
        onClick={() => {
          if (window.confirm(t('bank.removeKeysConfirm'))) clear.mutate({})
        }}
      >
        {t('bank.removeKeys')}
      </Button>
    </div>
  )
}

function BankPicker({ reconnect }: { reconnect: boolean }) {
  const { t, locale } = useI18n()
  const [country, setCountry] = useState('NL')
  const [bank, setBank] = useState('')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const aspsps = useAspsps(country, true)

  async function start() {
    setError(null)
    setStarting(true)
    try {
      await startBankConsent(bank, country)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStarting(false)
    }
  }

  const select = 'h-12 rounded-xl border border-line bg-card px-3 text-base text-ink'
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bank-country" className="text-[13px] text-muted">
          {t('bank.country')}
        </label>
        <select
          id="bank-country"
          className={select}
          value={country}
          onChange={(e) => {
            setCountry(e.target.value)
            setBank('')
          }}
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryName(c, locale)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bank-aspsp" className="text-[13px] text-muted">
          {t('bank.bank')}
        </label>
        <select
          id="bank-aspsp"
          className={select}
          value={bank}
          disabled={!aspsps.data}
          onChange={(e) => setBank(e.target.value)}
        >
          <option value="">{aspsps.isLoading ? t('common.loading') : t('bank.chooseBank')}</option>
          {aspsps.data?.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {(error || aspsps.error) && (
        <p role="alert" className="m-0 text-sm text-crit">
          {t('common.error', { message: error ?? aspsps.error?.message ?? '' })}
        </p>
      )}
      <Button variant="primary" disabled={!bank || starting} onClick={start}>
        {starting ? t('bank.redirecting') : reconnect ? t('bank.reconnect') : t('bank.connect')}
      </Button>
    </div>
  )
}
