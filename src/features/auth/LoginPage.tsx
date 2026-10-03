import { useState, type FormEvent } from 'react'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../data/demo.ts'
import { supabase } from '../../data/supabase.ts'
import { useI18n, type Locale } from '../../i18n.ts'
import { Button, TextField } from '../../components/ui.tsx'

const googleEnabled = import.meta.env.VITE_ENABLE_GOOGLE === 'true'

const languages: { value: Locale; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]

export function LoginPage({ onLocaleChange }: { onLocaleChange: (locale: Locale) => void }) {
  const { t, locale } = useI18n()
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'link' | 'password'>('link')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'demo'>('idle')

  async function signInWithPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setStatus('sending')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setError(t('login.error', { message: error.message }))
      setStatus('idle')
    }
  }
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

  async function openDemo() {
    setError(null)
    setStatus('demo')
    const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
    if (error) {
      setError(t('login.error', { message: error.message }))
      setStatus('idle')
    }
  }

  async function google() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) setError(t('login.error', { message: error.message }))
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-10">
      <div role="radiogroup" aria-label={t('settings.language')} className="flex gap-1 self-end rounded-full bg-line-soft p-1">
        {languages.map((l) => (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={locale === l.value}
            lang={l.value}
            onClick={() => onLocaleChange(l.value)}
            className={`min-h-9 rounded-full px-3 text-sm transition ${
              locale === l.value ? 'bg-card font-semibold text-ink shadow-sm' : 'font-medium text-muted'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
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
        <form onSubmit={mode === 'link' ? sendLink : signInWithPassword} className="flex flex-col gap-3">
          <TextField
            label={t('login.email')}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode === 'password' && (
            <TextField
              label={t('login.password')}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <Button type="submit" variant="primary" disabled={status === 'sending' || !email || (mode === 'password' && !password)}>
            {mode === 'link' ? t('login.send') : t('login.signIn')}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === 'link' ? 'password' : 'link')}
            className="min-h-11 text-sm font-medium text-accent"
          >
            {mode === 'link' ? t('login.usePassword') : t('login.useLink')}
          </button>
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

      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
        <span className="text-[15px] font-medium">{t('login.demoTitle')}</span>
        <span className="text-sm leading-relaxed text-muted">{t('login.demoHint')}</span>
        <Button variant="soft" onClick={openDemo} disabled={status === 'demo'}>
          {t('login.demo')}
        </Button>
      </div>
    </main>
  )
}
