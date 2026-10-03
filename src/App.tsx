import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { useSettings } from './data/queries.ts'
import { useSession } from './data/session.ts'
import { supabase, supabaseConfigured } from './data/supabase.ts'
import { isDemoEmail } from './data/demo.ts'
import { LoginPage } from './features/auth/LoginPage.tsx'
import { I18nContext, createTranslator, detectLocale, rememberLocale, useI18n, type Locale } from './i18n.ts'
import { router } from './router.tsx'
import { Spinner } from './components/ui.tsx'

function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: createTranslator(locale) }), [locale])
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function DemoBanner() {
  const { t } = useI18n()
  return (
    <div className="sticky top-0 z-10 bg-ink text-paper">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-2 text-[13px]">
        <span>{t('demo.banner')}</span>
        <button type="button" onClick={() => supabase.auth.signOut()} className="min-h-9 shrink-0 font-semibold underline">
          {t('demo.exit')}
        </button>
      </div>
    </div>
  )
}

function SignedIn({ demo }: { demo: boolean }) {
  const settings = useSettings()
  const locale = settings.data?.locale ?? detectLocale()
  return (
    <I18nProvider locale={locale}>
      {demo && <DemoBanner />}
      <RouterProvider router={router} />
    </I18nProvider>
  )
}

export function App() {
  const session = useSession()
  const [locale, setLocale] = useState<Locale>(detectLocale)
  const changeLocale = (next: Locale) => {
    rememberLocale(next)
    setLocale(next)
  }

  if (!supabaseConfigured) {
    return (
      <main className="mx-auto max-w-md p-6 text-[15px] leading-relaxed">
        Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.
      </main>
    )
  }
  if (session === undefined) {
    return (
      <I18nProvider locale={locale}>
        <Spinner label={createTranslator(locale)('common.loading')} />
      </I18nProvider>
    )
  }
  if (session === null) {
    return (
      <I18nProvider locale={locale}>
        <LoginPage onLocaleChange={changeLocale} />
      </I18nProvider>
    )
  }
  return <SignedIn key={session.user.id} demo={isDemoEmail(session.user.email)} />
}
