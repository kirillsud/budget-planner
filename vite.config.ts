import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        // /help/* are static pages (privacy, terms), not app routes
        navigateFallbackDenylist: [/^\/help\//],
      },
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Планировщик бюджета',
        short_name: 'Бюджет',
        description: 'Прогноз баланса по дням: доходы, расходы и запас до зарплаты',
        lang: 'ru',
        theme_color: '#0E6B5A',
        background_color: '#F5F6F2',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
