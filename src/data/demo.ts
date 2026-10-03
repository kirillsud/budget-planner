/**
 * Public demo account. The credentials are intentionally public: anyone can open the demo
 * from the login page. Data is reset every night by private.reset_demo() (pg_cron, 03:00 UTC),
 * see supabase/migrations/20261003160000_demo_account.sql.
 */
export const DEMO_EMAIL = 'demo@example.com'
export const DEMO_PASSWORD = 'budget-demo'

export function isDemoEmail(email: string | undefined | null): boolean {
  return email?.toLowerCase() === DEMO_EMAIL
}
