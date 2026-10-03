import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BudgetRecord, BudgetSettings, NewBudgetRecord } from '../domain/records.ts'
import type { Database } from './database.types.ts'
import { supabase } from './supabase.ts'

type RecordRow = Database['public']['Tables']['budget_records']['Row']
type SettingsRow = Database['public']['Tables']['settings']['Row']

export const queryKeys = {
  settings: ['settings'] as const,
  records: ['records'] as const,
}

function toRecord(row: RecordRow): BudgetRecord {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    amount: row.amount,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    completed: row.completed,
    seriesId: row.series_id,
  }
}

function toSettings(row: SettingsRow): BudgetSettings {
  return {
    balance: row.balance,
    balanceUpdatedAt: row.balance_updated_at,
    balanceSource: row.balance_source === 'bank' ? 'bank' : 'manual',
    dailyExpenses: row.daily_expenses,
    warningBalance: row.warning_balance,
    criticalBalance: row.critical_balance,
    scaleMonths: row.scale_months,
    currency: row.currency.trim(),
    locale: row.locale === 'en' ? 'en' : 'ru',
  }
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Not signed in')
  return data.user.id
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: async (): Promise<BudgetSettings> => {
      const { data, error } = await supabase.from('settings').select('*').maybeSingle()
      if (error) throw error
      if (data) return toSettings(data)
      // The signup trigger normally creates the row; create it if it is missing.
      const userId = await currentUserId()
      const inserted = await supabase.from('settings').insert({ user_id: userId }).select('*').single()
      if (inserted.error) throw inserted.error
      return toSettings(inserted.data)
    },
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Omit<BudgetSettings, 'balanceUpdatedAt' | 'balanceSource'>>) => {
      const userId = await currentUserId()
      const row: Database['public']['Tables']['settings']['Update'] = {}
      if (patch.balance !== undefined) row.balance = patch.balance
      if (patch.dailyExpenses !== undefined) row.daily_expenses = patch.dailyExpenses
      if (patch.warningBalance !== undefined) row.warning_balance = patch.warningBalance
      if (patch.criticalBalance !== undefined) row.critical_balance = patch.criticalBalance
      if (patch.scaleMonths !== undefined) row.scale_months = patch.scaleMonths
      if (patch.currency !== undefined) row.currency = patch.currency
      if (patch.locale !== undefined) row.locale = patch.locale
      const { data, error } = await supabase.from('settings').update(row).eq('user_id', userId).select('*').single()
      if (error) throw error
      return toSettings(data)
    },
    onSuccess: (settings) => qc.setQueryData(queryKeys.settings, settings),
  })
}

/** All not-deleted records: the forecast filters by window and overdue itself. */
export function useRecords() {
  return useQuery({
    queryKey: queryKeys.records,
    queryFn: async (): Promise<BudgetRecord[]> => {
      const { data, error } = await supabase
        .from('budget_records')
        .select('*')
        .is('deleted_at', null)
        .order('date_from', { ascending: true })
        .order('id', { ascending: true })
      if (error) throw error
      return data.map(toRecord)
    },
  })
}

export function useSaveRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: NewBudgetRecord): Promise<BudgetRecord> => {
      const values = {
        type: record.type,
        title: record.title.trim(),
        amount: record.amount,
        date_from: record.dateFrom,
        date_to: record.dateTo,
        completed: record.completed,
      }
      const query = record.id
        ? supabase.from('budget_records').update(values).eq('id', record.id).select('*').single()
        : supabase.from('budget_records').insert(values).select('*').single()
      const { data, error } = await query
      if (error) throw error
      return toRecord(data)
    },
    onSuccess: (saved) => {
      qc.setQueryData<BudgetRecord[]>(queryKeys.records, (old) => {
        if (!old) return [saved]
        const exists = old.some((r) => r.id === saved.id)
        const next = exists ? old.map((r) => (r.id === saved.id ? saved : r)) : [...old, saved]
        return next.sort((a, b) => (a.dateFrom < b.dateFrom ? -1 : a.dateFrom > b.dateFrom ? 1 : a.id - b.id))
      })
    },
  })
}

export function useDeleteRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('budget_records')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<BudgetRecord[]>(queryKeys.records, (old) => old?.filter((r) => r.id !== id))
    },
  })
}

/** Turns a saved record into the first month of a monthly series; the database fills about a year ahead. */
export function useRepeatMonthly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recordId: number) => {
      const { error } = await supabase.rpc('repeat_monthly', { p_record_id: recordId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.records }),
  })
}

/** Saves the record and applies the same values to every later month of its series that is not done yet. */
export function useUpdateSeriesFrom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: BudgetRecord) => {
      const { error } = await supabase.rpc('update_series_from', {
        p_record_id: record.id,
        p_type: record.type,
        p_title: record.title.trim(),
        p_amount: record.amount,
        p_date_from: record.dateFrom,
        p_date_to: record.dateTo,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.records }),
  })
}

/** Stops the series: this month and later ones that are not done yet are removed. */
export function useStopSeriesFrom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recordId: number) => {
      const { error } = await supabase.rpc('stop_series_from', { p_record_id: recordId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.records }),
  })
}
