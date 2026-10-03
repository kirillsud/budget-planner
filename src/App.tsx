import { useMemo, type ReactNode } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { useSettings } from './data/queries.ts'
import { useSession } from './data/session.ts'
import { supabaseConfigured } from './data/supabase.ts'
import { LoginPage } from './features/auth/LoginPage.tsx'
import { I18nContext, createTranslator, detectLocale, type Locale } from './i18n.ts'
import { router } from './router.tsx'
import { Spinner } from './components/ui.tsx'

function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: createTranslator(locale) }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function SignedIn() {
  const settings = useSettings()
  const locale = settings.data?.locale ?? detectLocale()
  return (
    <I18nProvider locale={locale}>
      <RouterProvider router={router} />
    </I18nProvider>
  )
}

export function App() {
  const session = useSession()
  const locale = detectLocale()

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
        <LoginPage />
      </I18nProvider>
    )
  }
  return <SignedIn key={session.user.id} />
}
