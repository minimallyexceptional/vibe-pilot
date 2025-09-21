import { Link, Outlet } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { SignedIn, SignedOut, UserButton } from '@/lib/clerk'

export function MarketingLayout() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              TanStack Starter
            </Link>
            <nav className="hidden items-center gap-4 text-sm font-medium text-muted-foreground sm:flex">
              <Link
                to="/"
                className="transition hover:text-foreground"
                activeOptions={{ exact: true }}
                activeProps={{
                  className: 'text-foreground transition hover:text-foreground',
                  'aria-current': 'page',
                }}
              >
                Overview
              </Link>
              <Link
                to="/pricing"
                className="transition hover:text-foreground"
                activeProps={{
                  className: 'text-foreground transition hover:text-foreground',
                  'aria-current': 'page',
                }}
              >
                Pricing
              </Link>
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="transition hover:text-foreground"
                  activeProps={{
                    className: 'text-foreground transition hover:text-foreground',
                    'aria-current': 'page',
                  }}
                >
                  Dashboard
                </Link>
              </SignedIn>
              <SignedOut>
                <>
                  <Link
                    to="/login"
                    className="transition hover:text-foreground"
                    activeProps={{
                      className: 'text-foreground transition hover:text-foreground',
                      'aria-current': 'page',
                    }}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/sign-up"
                    className="transition hover:text-foreground"
                    activeProps={{
                      className: 'text-foreground transition hover:text-foreground',
                      'aria-current': 'page',
                    }}
                  >
                    Sign up
                  </Link>
                </>
              </SignedOut>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              React · Vite
            </Badge>
            <SignedOut>
              <Button className="hidden sm:inline-flex" size="sm" asChild>
                <Link to="/sign-up">Get started</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button className="hidden sm:inline-flex" variant="outline" size="sm" asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </SignedIn>
            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{ elements: { userButtonAvatarBox: 'h-8 w-8' } }}
              />
            </SignedIn>
            <ModeToggle />
          </div>
        </div>
      </header>
      <main className="container pb-20 pt-12">
        <Outlet />
      </main>
      <footer className="border-t bg-background/80">
        <div className="container flex flex-col gap-2 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Built with TanStack Router & Query
          </p>
          <p>
            Need to customize? Start editing{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              src/routes/index.tsx
            </code>
          </p>
        </div>
      </footer>
    </div>
  )
}
