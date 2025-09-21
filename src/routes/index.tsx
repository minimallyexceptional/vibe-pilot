import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Layers3, LayoutDashboard, LineChart, Rocket } from 'lucide-react'

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
import { Skeleton } from '@/components/ui/skeleton'

const fetchGreeting = async () => {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return 'Welcome to your TanStack-powered starter!'
}

const features = [
  {
    title: 'Type-safe routing',
    description: 'Co-locate data loaders, code-split routes, and enjoy end-to-end type safety.',
    href: 'https://tanstack.com/router/latest/docs/framework/react/overview',
    icon: LayoutDashboard,
  },
  {
    title: 'Data layer superpowers',
    description:
      'Fetch, cache, and revalidate with confidence using TanStack Query out of the box.',
    href: 'https://tanstack.com/query/latest',
    icon: LineChart,
  },
  {
    title: 'Component driven UI',
    description:
      'Leverage shadcn/ui primitives with Tailwind CSS tokens to move fast and stay polished.',
    href: 'https://ui.shadcn.com',
    icon: Layers3,
  },
]

export function HomeRoute() {
  const { data, isLoading } = useQuery({
    queryKey: ['greeting'],
    queryFn: fetchGreeting,
  })

  return (
    <div className="space-y-12">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/15 via-background to-secondary/30 shadow-xl">
        <CardHeader className="space-y-6 pb-0">
          <Badge variant="outline" className="w-fit border-primary/60 text-primary">
            Starter toolkit
          </Badge>
          <CardTitle className="text-3xl leading-tight md:text-4xl">
            Ship a modern TanStack experience in record time
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground md:text-lg">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-5 w-72" />
              </div>
            ) : (
              data
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pb-8 pt-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href="https://tanstack.com" target="_blank" rel="noreferrer">
                Explore TanStack
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="https://ui.shadcn.com" target="_blank" rel="noreferrer">
                Browse shadcn components
              </a>
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Rocket className="h-4 w-4 text-primary" />
            Ready for rapid iteration with hot reloading and smart caching
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="bg-secondary/70 text-secondary-foreground">
            TypeScript
          </Badge>
          <Badge variant="secondary" className="bg-secondary/70 text-secondary-foreground">
            Tailwind CSS
          </Badge>
          <Badge variant="secondary" className="bg-secondary/70 text-secondary-foreground">
            TanStack Router + Query
          </Badge>
        </CardFooter>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="border-muted/60">
            <CardHeader className="space-y-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </span>
              <div className="space-y-2">
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </div>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button variant="link" className="px-0" asChild>
                <a
                  href={feature.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1"
                >
                  Learn more
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="border-dashed border-muted/70 bg-card/80">
        <CardHeader className="space-y-4">
          <CardTitle className="text-2xl">Make it yours</CardTitle>
          <CardDescription>
            Use the file system router, tanstack query hooks, and shadcn/ui primitives to compose
            polished interfaces. Update the home route to explore live reload and strong typing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Edit{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                src/routes/index.tsx
              </code>{' '}
              and save to see changes instantly.
            </p>
            <p>
              Prefer another page? Create a new route in{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">src/routes</code>{' '}
              and add it to the router tree.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/" className="flex items-center gap-1">
              View route source
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
