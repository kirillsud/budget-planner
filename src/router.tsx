import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { HomePage } from './features/home/HomePage.tsx'
import { OverduePage } from './features/overdue/OverduePage.tsx'
import { SettingsPage } from './features/settings/SettingsPage.tsx'

const rootRoute = createRootRoute({ component: () => <Outlet /> })

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
const overdueRoute = createRoute({ getParentRoute: () => rootRoute, path: '/overdue', component: OverduePage })
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsPage })

const routeTree = rootRoute.addChildren([homeRoute, overdueRoute, settingsRoute])

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
