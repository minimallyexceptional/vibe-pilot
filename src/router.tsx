import { Outlet, RouterProvider, RootRoute, Route, createRouter } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

import {
  DashboardIndexRoute,
  DashboardJournalRoute,
  DashboardLayout,
  DashboardRitualsRoute,
} from './routes/dashboard'
import { DashboardVibePilotRoute } from './routes/vibe-pilot'
import { DashboardDesignDocRoute } from './routes/design-doc'
import { AccountManagementRoute } from './routes/account'
import { MarketingLayout } from './routes/marketing-layout'
import { HomeRoute } from './routes/index'
import { LoginRoute } from './routes/login'
import { PricingRoute } from './routes/pricing'
import { SignUpRoute } from './routes/sign-up'
import { ProjectsRoute } from './routes/projects'

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
  component: () => <Outlet />,
})

const dashboardProjectsRoute = new Route({
  getParentRoute: () => dashboardRoute,
  path: '/',
  component: ProjectsRoute,
})

const dashboardProjectLayoutRoute = new Route({
  getParentRoute: () => dashboardRoute,
  path: '$projectId',
  component: DashboardLayout,
})

const dashboardProjectIndexRoute = new Route({
  getParentRoute: () => dashboardProjectLayoutRoute,
  path: '/',
  component: DashboardIndexRoute,
})

const dashboardProjectVibePilotRoute = new Route({
  getParentRoute: () => dashboardProjectLayoutRoute,
  path: 'vibe-pilot',
  component: DashboardVibePilotRoute,
})

const dashboardProjectDesignDocRoute = new Route({
  getParentRoute: () => dashboardProjectLayoutRoute,
  path: 'design-doc',
  component: DashboardDesignDocRoute,
})

const dashboardProjectJournalRoute = new Route({
  getParentRoute: () => dashboardProjectLayoutRoute,
  path: 'journal',
  component: DashboardJournalRoute,
})

const dashboardProjectRitualsRoute = new Route({
  getParentRoute: () => dashboardProjectLayoutRoute,
  path: 'rituals',
  component: DashboardRitualsRoute,
})

const dashboardProjectAccountRoute = new Route({
  getParentRoute: () => dashboardProjectLayoutRoute,
  path: 'account',
  component: AccountManagementRoute,
})

const routeTree = rootRoute.addChildren([
  marketingRoute.addChildren([homeRoute, pricingRoute, loginRoute, signUpRoute]),
  dashboardRoute.addChildren([
    dashboardProjectsRoute,
    dashboardProjectLayoutRoute.addChildren([
      dashboardProjectIndexRoute,
      dashboardProjectVibePilotRoute,
      dashboardProjectDesignDocRoute,
      dashboardProjectJournalRoute,
      dashboardProjectRitualsRoute,
      dashboardProjectAccountRoute,
    ]),
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
