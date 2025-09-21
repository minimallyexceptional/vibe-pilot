import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, LifeBuoy, ShieldCheck, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { pricingPlans } from '@/lib/pricing-data'
import { cn } from '@/lib/utils'

const guarantees = [
  {
    title: '30-day satisfaction guarantee',
    description:
      'Try any paid plan for a full month. If it does not fit, we will refund your most recent payment—no questions asked.',
    icon: ShieldCheck,
  },
  {
    title: 'Always available help',
    description:
      'Our global support engineers respond around the clock to keep your deployment pipeline healthy and performant.',
    icon: LifeBuoy,
  },
]

export function PricingRoute() {
  return (
    <div className="space-y-12">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <Badge variant="outline" className="border-primary/50 text-primary">
          Pricing
        </Badge>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Flexible plans that scale with your team
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Move from idea to production with predictable pricing. Every plan uses the same fast
            infrastructure so you can build and ship without trade-offs.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          Cancel or change plans at any time—no hidden fees.
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {pricingPlans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              'relative flex h-full flex-col border-muted/70 bg-card/90 shadow-sm backdrop-blur',
              plan.highlighted &&
                'border-primary shadow-lg shadow-primary/20 ring-1 ring-primary/30 md:-translate-y-2 md:scale-[1.02] md:shadow-xl',
            )}
          >
            {plan.highlighted ? (
              <div className="absolute -top-3 left-1/2 w-fit -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground shadow">Most popular</Badge>
              </div>
            ) : null}

            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-semibold sm:text-5xl">{plan.price}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {plan.priceSuffix}
                  </span>
                </div>
                {plan.highlighted ? (
                  <Badge variant="secondary" className="bg-secondary/70 text-secondary-foreground">
                    Save 20%
                  </Badge>
                ) : null}
              </div>
              <div className="h-px bg-muted/70" />
              <ul className="space-y-3 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-left">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={plan.buttonVariant ?? 'default'} asChild>
                {plan.external ? (
                  <a href={plan.href}>
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                ) : (
                  <Link to={plan.href}>
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Card className="border-dashed border-muted/70 bg-card/80">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">All plans include</CardTitle>
              <CardDescription>
                Deploy instantly, collaborate with your team, and stay confident with built-in
                observability across every tier.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/login" className="flex items-center gap-1">
                View dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              'Unlimited previews and instant rollbacks',
              'Role-based access control out of the box',
              'Performance analytics with retention cohorts',
              'Global edge network with smart caching',
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span>{benefit}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-muted/70 bg-card/80">
          <CardHeader className="space-y-4">
            <CardTitle className="text-xl">We are on your side</CardTitle>
            <CardDescription>
              Whether you are just getting started or migrating an enterprise workload, we partner
              with your team from day one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {guarantees.map((guarantee) => (
              <div key={guarantee.title} className="flex gap-3 text-sm text-muted-foreground">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <guarantee.icon className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{guarantee.title}</p>
                  <p>{guarantee.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="secondary" asChild>
              <Link to="/sign-up">Chat with our team</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  )
}

export default PricingRoute
