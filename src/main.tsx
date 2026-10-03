import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App.tsx'
import { queryClient } from './data/queryClient.ts'
import './index.css'

// A new deploy replaces the service worker and reloads the page instead of serving the old cached build.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
