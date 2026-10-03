import { useState, type FormEvent } from 'react'
import { supabase } from '../../data/supabase.ts'
import { useI18n } from '../../i18n.ts'
import { Button, TextField } from '../../components/ui.tsx'

const googleEnabled = import.meta.env.VITE_ENABLE_GOOGLE === 'true'

export function LoginPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const redirectTo = window.location.origin

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } })
    if (error) {
      setError(t('login.error', { message: error.message }))
      setStatus('idle')
    } else {
      setStatus('sent')
    }
  }

  async function google() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) setError(t('login.error', { message: error.message }))
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-10">
      <div className="flex flex-col gap-3">
        <img src="/icon.svg" alt="" width={56} height={56} className="rounded-2xl" />
        <h1 className="text-3xl font-bold tracking-tight">{t('login.title')}</h1>
        <p className="text-base leading-relaxed text-muted">{t('login.subtitle')}</p>
      </div>

      {status === 'sent' ? (
        <p role="status" className="rounded-2xl bg-accent-soft p-4 text-[15px] text-accent-ink">
          {t('login.sent', { email })}
        </p>
      ) : (
        <form onSubmit={sendLink} className="flex flex-col gap-3">
          <TextField
            label={t('login.email')}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={status === 'sending' || !email}>
            {t('login.send')}
          </Button>
          {googleEnabled && (
            <>
              <span className="text-center text-sm text-muted">{t('login.or')}</span>
              <Button onClick={google}>{t('login.google')}</Button>
            </>
          )}
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-crit-soft p-4 text-[15px] text-crit-ink">
          {error}
        </p>
      )}
    </main>
  )
}
