import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { bankKeys, callBank } from '../../data/bank.ts'
import { queryKeys } from '../../data/queries.ts'
import { useI18n } from '../../i18n.ts'
import { Card, Spinner } from '../../components/ui.tsx'

type CallbackResult = { status: 'active'; error: string | null } | { status: 'choose_account' }

/** The authorization code is single-use: never send it twice (StrictMode, re-renders). */
const handled = new Map<string, Promise<CallbackResult>>()

function finish(code: string, state: string): Promise<CallbackResult> {
  let p = handled.get(state)
  if (!p) {
    p = callBank<CallbackResult>('callback', { code, state })
    handled.set(state, p)
  }
  return p
}

/** The bank sends the user back here (?code&state, or ?error&error_description) after consent. */
export function BankCallbackPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [params] = useState(() => new URLSearchParams(window.location.search))
  const code = params.get('code')
  const state = params.get('state')
  const denied = params.get('error')
  const [error, setError] = useState<string | null>(
    denied ? t('bank.callbackDenied', { message: params.get('error_description') ?? denied }) : null,
  )

  useEffect(() => {
    if (denied || !code || !state) return
    let alive = true
    finish(code, state)
      .then(async (r) => {
        await Promise.all([
          qc.invalidateQueries({ queryKey: bankKeys.status }),
          qc.invalidateQueries({ queryKey: queryKeys.settings }),
        ])
        if (!alive) return
        // several accounts: the choice is in the bank card in settings
        void navigate({ to: r.status === 'active' && !r.error ? '/' : '/settings', replace: true })
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [code, state, denied, navigate, qc])

  const missing = !denied && (!code || !state)

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-5">
      <h1 className="m-0 text-[22px] font-bold">{t('bank.callbackTitle')}</h1>
      {error || missing ? (
        <Card className="flex flex-col gap-3 p-4">
          <p role="alert" className="m-0 text-[15px] text-crit">
            {error ?? t('common.error', { message: 'no code' })}
          </p>
          <Link to="/settings" className="font-semibold text-accent no-underline">
            {t('bank.toSettings')}
          </Link>
        </Card>
      ) : (
        <Spinner label={t('bank.callbackWorking')} />
      )}
    </main>
  )
}
