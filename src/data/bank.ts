import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { queryKeys } from './queries.ts'
import { supabase } from './supabase.ts'

/**
 * Bank balance through Enable Banking, "bring your own key": every user registers their own
 * Enable Banking application and pastes its id + private key here once. The key goes straight to
 * the `bank` edge function (stored in Vault) and is never read back by the browser.
 */

export const bankKeys = { status: ['bank'] as const }

/** Where the bank sends the user back after consent. Must be listed in the Enable Banking app. */
export function bankRedirectUrl(): string {
  return `${window.location.origin}/bank/callback`
}

export type ConnectionStatus = 'pending' | 'choose_account' | 'active' | 'expired' | 'revoked' | 'error'

export interface BankAccountChoice {
  uid: string
  name: string | null
  ibanTail: string | null
  currency: string | null
}

export interface BankConnection {
  id: number
  status: ConnectionStatus
  aspspName: string
  accounts: BankAccountChoice[]
  accountName: string | null
  accountIbanTail: string | null
  currency: string | null
  validUntil: string | null
  lastBalanceAt: string | null
  lastError: string | null
}

export interface BankStatus {
  /** Enable Banking application id; null when the user has not added keys. */
  appId: string | null
  /** The latest connection that is not revoked or abandoned. */
  connection: BankConnection | null
}

export class BankError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export async function callBank<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('bank', { body: { action, ...payload } })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string; code?: string } | null
      throw new BankError(body?.code ?? 'http', body?.error ?? error.message)
    }
    throw new BankError('network', error.message)
  }
  return data as T
}

export function useBankStatus(enabled = true) {
  return useQuery({
    queryKey: bankKeys.status,
    enabled,
    queryFn: async (): Promise<BankStatus> => {
      const [creds, conns] = await Promise.all([
        supabase.from('bank_credentials').select('app_id').maybeSingle(),
        supabase
          .from('bank_connections')
          .select('*')
          .in('status', ['choose_account', 'active', 'expired', 'error'])
          .order('id', { ascending: false })
          .limit(1),
      ])
      if (creds.error) throw creds.error
      if (conns.error) throw conns.error
      const row = conns.data[0]
      return {
        appId: creds.data?.app_id ?? null,
        connection: row
          ? {
              id: row.id,
              status: row.status as ConnectionStatus,
              aspspName: row.aspsp_name,
              accounts: Array.isArray(row.accounts) ? (row.accounts as unknown as BankAccountChoice[]) : [],
              accountName: row.account_name,
              accountIbanTail: row.account_iban_tail,
              currency: row.currency?.trim() ?? null,
              validUntil: row.valid_until,
              lastBalanceAt: row.last_balance_at,
              lastError: row.last_error,
            }
          : null,
      }
    },
  })
}

/** Runs a bank action, then reloads the bank status and the settings (the balance may have changed). */
export function useBankAction<P extends Record<string, unknown>, R = unknown>(action: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: P) => callBank<R>(action, payload),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: bankKeys.status })
      void qc.invalidateQueries({ queryKey: queryKeys.settings })
      void qc.invalidateQueries({ queryKey: queryKeys.snapshots })
    },
  })
}

export interface SaveCredentialsResult {
  ok: true
  appName: string | null
  redirectUrls: string[]
  environment: string | null
}

export interface Aspsp {
  name: string
  country: string
  logo: string | null
}

export function useAspsps(country: string, enabled: boolean) {
  return useQuery({
    queryKey: ['bank-aspsps', country],
    enabled,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => (await callBank<{ aspsps: Aspsp[] }>('aspsps', { country })).aspsps,
  })
}

/** Starts the bank consent and leaves the app for the bank's page. */
export async function startBankConsent(aspspName: string, country: string): Promise<void> {
  const { url } = await callBank<{ url: string }>('start', { aspspName, country, redirectUrl: bankRedirectUrl() })
  window.location.assign(url)
}

export type RefreshResult =
  | { status: 'none' }
  | { status: 'fresh' | 'updated' | 'error'; balance: number | null; error?: string | null }

/**
 * Asks the server for a new balance when the app opens. The function throttles itself
 * (one bank read per 10 minutes), so calling it on every start is cheap.
 */
export async function refreshBankBalance(force = false): Promise<RefreshResult> {
  return callBank<RefreshResult>('refresh', { force })
}

let lastAutoRefresh = 0

/**
 * When the balance comes from the bank, ask for a fresh one each time the home screen opens
 * (at most every 10 minutes from this tab; the server throttles too) and reload what changed.
 */
export function useBankAutoRefresh(enabled: boolean) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!enabled || Date.now() - lastAutoRefresh < 10 * 60 * 1000) return
    lastAutoRefresh = Date.now()
    refreshBankBalance()
      .then((r) => {
        if (r.status === 'updated' || r.status === 'error') {
          void qc.invalidateQueries({ queryKey: queryKeys.settings })
          void qc.invalidateQueries({ queryKey: queryKeys.snapshots })
          void qc.invalidateQueries({ queryKey: bankKeys.status })
        }
      })
      .catch(() => {
        // offline or keys removed: the header still shows when the balance was last updated
      })
  }, [enabled, qc])
}
