import { Outlet, RouterProvider, RootRoute, Route, createRouter } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

import {
  DashboardIndexRoute,
  DashboardJournalRoute,
  DashboardLayout,
  DashboardRitualsRoute,
} from './routes/dashboard'
import { DashboardVibePilotRoute } from './routes/vibe-pilot'
import { AccountManagementRoute } from './routes/account'
import { MarketingLayout } from './routes/marketing-layout'
import { HomeRoute } from './routes/index'
import { LoginRoute } from './routes/login'
import { PricingRoute } from './routes/pricing'
import { SignUpRoute } from './routes/sign-up'

const rootRoute = new RootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})

const marketingRoute = new Route({
  getParentRoute: () => rootRoute,
  id: 'marketing-layout',
  component: MarketingLayout,
})

const homeRoute = new Route({
  getParentRoute: () => marketingRoute,
  path: '/',
  component: HomeRoute,
})

const pricingRoute = new Route({
  getParentRoute: () => marketingRoute,
  path: 'pricing',
  component: PricingRoute,
})

const loginRoute = new Route({
  getParentRoute: () => marketingRoute,
  path: 'login',
  component: LoginRoute,
})

const signUpRoute = new Route({
  getParentRoute: () => marketingRoute,
  path: 'sign-up',
  component: SignUpRoute,
})

const dashboardRoute = new Route({
  getParentRoute: () => rootRoute,
  path: 'dashboard',
  component: DashboardLayout,
})

const dashboardVibePilotRoute = new Route({
  getParentRoute: () => dashboardRoute,
  path: 'vibe-pilot',
  component: DashboardVibePilotRoute,
})

const dashboardIndexRoute = new Route({
  getParentRoute: () => dashboardRoute,
  path: '/',
  component: DashboardIndexRoute,
})

const dashboardJournalRoute = new Route({
  getParentRoute: () => dashboardRoute,
  path: 'journal',
  component: DashboardJournalRoute,
})

const dashboardRitualsRoute = new Route({
  getParentRoute: () => dashboardRoute,
  path: 'rituals',
  component: DashboardRitualsRoute,
})

const dashboardAccountRoute = new Route({
  getParentRoute: () => dashboardRoute,
  path: 'account',
  component: AccountManagementRoute,
})

const routeTree = rootRoute.addChildren([
  marketingRoute.addChildren([homeRoute, pricingRoute, loginRoute, signUpRoute]),
  dashboardRoute.addChildren([
    dashboardVibePilotRoute,
    dashboardIndexRoute,
    dashboardJournalRoute,
    dashboardRitualsRoute,
    dashboardAccountRoute,
  ]),
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
