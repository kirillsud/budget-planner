import { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase.ts'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
})

/**
 * Cached settings and records belong to one user. Drop the whole cache on sign-out and whenever a
 * different user signs in, so the next user never sees the previous user's data. The listener is
 * registered once here, outside React, so it runs before the screens re-render with the new session.
 */
let cacheOwner: string | null | undefined
supabase.auth.onAuthStateChange((_event, session) => {
  const userId = session?.user.id ?? null
  if (cacheOwner !== undefined && userId !== cacheOwner) queryClient.clear()
  cacheOwner = userId
})
