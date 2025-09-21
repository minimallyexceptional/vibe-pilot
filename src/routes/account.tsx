import React from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, CheckCircle2, CreditCard, Loader2, UploadCloud } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { pricingPlans } from '@/lib/pricing-data'
import { useUser } from '@/lib/clerk'
import { cn, getInitials } from '@/lib/utils'
import { getStripe } from '@/lib/stripe'

const stripePriceIdByPlan: Record<string, string | undefined> = {
  Starter: import.meta.env.VITE_STRIPE_PRICE_ID_STARTER,
  Growth: import.meta.env.VITE_STRIPE_PRICE_ID_GROWTH,
  Scale: import.meta.env.VITE_STRIPE_PRICE_ID_SCALE,
}

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const stripeSuccessUrl = import.meta.env.VITE_STRIPE_SUCCESS_URL
const stripeCancelUrl = import.meta.env.VITE_STRIPE_CANCEL_URL

export function AccountManagementRoute() {
  const { user } = useUser()

  const accountUser = React.useMemo(
    () => ({
      name:
        user?.fullName ||
        [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
        'Avery Parker',
      email: user?.primaryEmailAddress?.emailAddress || 'avery.parker@example.com',
      imageUrl: user?.imageUrl,
    }),
    [user],
  )

  const [selectedPlan, setSelectedPlan] = React.useState<string>(() => {
    const highlightedPlan = pricingPlans.find((plan) => plan.highlighted)
    return highlightedPlan?.name ?? pricingPlans[0]?.name ?? 'Starter'
  })

  const activePlan = React.useMemo(
    () => pricingPlans.find((plan) => plan.name === selectedPlan) ?? pricingPlans[0],
    [selectedPlan],
  )

  const selectedPlanPriceId = stripePriceIdByPlan[activePlan.name]
  const [isRedirecting, setIsRedirecting] = React.useState(false)
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setCheckoutError(null)
    setIsRedirecting(false)
  }, [selectedPlanPriceId])

  const handleCheckout = React.useCallback(async () => {
    if (!selectedPlanPriceId) {
      setCheckoutError('This plan is not available for online checkout yet.')
      return
    }

    const stripe = await getStripe()

    if (!stripe) {
      setCheckoutError(
        'Stripe is not fully configured. Please contact support to upgrade your plan.',
      )
      return
    }

    setCheckoutError(null)
    setIsRedirecting(true)

    const origin = window.location.origin
    const successUrl = stripeSuccessUrl ?? `${origin}/account?status=subscription-success`
    const cancelUrl = stripeCancelUrl ?? `${origin}/account?status=subscription-cancelled`

    const { error } = await stripe.redirectToCheckout({
      lineItems: [
        {
          price: selectedPlanPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      successUrl,
      cancelUrl,
    })

    if (error) {
      setCheckoutError(error.message ?? 'We were unable to start checkout. Please try again.')
      setIsRedirecting(false)
    }
  }, [selectedPlanPriceId])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Account management
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Update your personal profile, manage subscriptions, and fine-tune workspace preferences
          from a single place.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Card className="border-muted/70">
          <CardHeader className="space-y-1">
            <CardTitle>Profile & avatar</CardTitle>
            <CardDescription>
              Keep your photo, display name, and contact details up to date so teammates recognize
              you instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-16 w-16">
                <AvatarImage src={accountUser.imageUrl} alt={accountUser.name} />
                <AvatarFallback className="text-base font-medium">
                  {getInitials(accountUser.name) || 'AP'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{accountUser.name}</p>
                <p className="text-sm text-muted-foreground">{accountUser.email}</p>
                <p className="text-xs text-muted-foreground">
                  Your photo appears in dashboards, notifications, and shared reports.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="avatar-upload" className="text-sm font-medium text-foreground">
                  Update avatar
                </Label>
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-muted/70 p-4 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UploadCloud className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Upload a new image</p>
                      <p className="text-xs">
                        PNG or JPG at 400×400px or higher is recommended for the best clarity.
                      </p>
                    </div>
                  </div>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="cursor-pointer text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name" className="text-sm font-medium text-foreground">
                    Display name
                  </Label>
                  <Input
                    id="display-name"
                    defaultValue={accountUser.name}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="text-sm font-medium text-foreground">
                    Contact email
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    defaultValue={accountUser.email}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-3">
            <Button variant="outline">Discard changes</Button>
            <Button>Save profile</Button>
          </CardFooter>
        </Card>

        <Card className="border-muted/70 bg-card/70">
          <CardHeader className="space-y-1">
            <CardTitle>Billing overview</CardTitle>
            <CardDescription>
              Review your subscription status and get quick access to invoices and receipts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3 rounded-lg border border-muted/50 bg-background/70 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Current plan</p>
                <p>
                  You are viewing the{' '}
                  <span className="font-medium text-foreground">{activePlan.name}</span> plan.
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                <span>
                  Next billing date:{' '}
                  <span className="font-medium text-foreground">June 1, 2025</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                <span>Payment method: Company corporate card ending in 2846</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/pricing" className="flex items-center justify-center gap-2">
                Compare plans
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/70">
        <CardHeader className="space-y-1">
          <CardTitle>Subscription plan</CardTitle>
          <CardDescription>
            Choose the plan that aligns with your team today. You can switch tiers whenever your
            needs evolve.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {pricingPlans.map((plan) => {
            const isActive = plan.name === activePlan.name

            return (
              <div
                key={plan.name}
                className={cn(
                  'flex h-full flex-col gap-4 rounded-xl border bg-card/80 p-4 text-sm shadow-sm transition',
                  isActive
                    ? 'border-primary shadow-primary/20 ring-1 ring-primary/30'
                    : 'border-muted/60',
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-foreground">{plan.name}</p>
                    {plan.highlighted ? (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-semibold text-foreground">{plan.price}</p>
                  <p className="text-xs text-muted-foreground">{plan.priceSuffix}</p>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {plan.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  className="mt-auto"
                  onClick={() => setSelectedPlan(plan.name)}
                >
                  {isActive ? 'Selected plan' : 'Choose this plan'}
                </Button>
              </div>
            )
          })}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t border-muted/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              {selectedPlanPriceId
                ? 'We partner with Stripe to securely manage your subscription billing.'
                : activePlan.name === 'Starter'
                  ? 'The Starter plan is free—no billing is required.'
                  : 'Select a paid plan that supports checkout to update your subscription.'}
            </p>
            {checkoutError ? (
              <p className="text-sm font-medium text-destructive">{checkoutError}</p>
            ) : null}
            {!stripePublishableKey && selectedPlanPriceId ? (
              <p className="text-sm font-medium text-destructive">
                Missing Stripe publishable key. Add it to your environment configuration to enable
                checkout.
              </p>
            ) : null}
          </div>
          {selectedPlanPriceId ? (
            <Button
              className="w-full sm:w-auto"
              disabled={isRedirecting || !stripePublishableKey}
              onClick={handleCheckout}
            >
              {isRedirecting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Redirecting to Stripe
                </span>
              ) : (
                `Subscribe to ${activePlan.name}`
              )}
            </Button>
          ) : (
            <Button className="w-full sm:w-auto" variant="outline" disabled>
              {activePlan.name === 'Starter' ? 'Starter plan is free' : 'Checkout unavailable'}
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card className="border-muted/70">
        <CardHeader className="space-y-1">
          <CardTitle>Workspace preferences</CardTitle>
          <CardDescription>
            Control how teammates collaborate and when you receive updates from the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-sm font-medium text-foreground">
              Workspace name
            </Label>
            <Input
              id="workspace-name"
              defaultValue="Northwind Platform"
              placeholder="Workspace name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-sm font-medium text-foreground">
              Default time zone
            </Label>
            <Input id="timezone" defaultValue="UTC" placeholder="Timezone" />
          </div>
          <fieldset className="space-y-3 rounded-lg border border-muted/60 p-4">
            <legend className="text-sm font-semibold text-foreground">Notifications</legend>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-muted/70"
              />
              <span>Send me a summary of deployment activity every Monday.</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-muted/70"
              />
              <span>Alert the workspace when preview branches fail checks.</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-muted/70" />
              <span>Share usage insights that help improve the platform experience.</span>
            </label>
          </fieldset>
          <fieldset className="space-y-3 rounded-lg border border-muted/60 p-4">
            <legend className="text-sm font-semibold text-foreground">Security</legend>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-muted/70"
              />
              <span>Require two-factor authentication for all workspace members.</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-muted/70" />
              <span>Lock sign-ins after 5 failed attempts within 15 minutes.</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-muted/70"
              />
              <span>Send an email when API tokens are generated or revoked.</span>
            </label>
          </fieldset>
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-3">
          <Button variant="outline">Revert preferences</Button>
          <Button>Save updates</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
