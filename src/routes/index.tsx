import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, MoonStar, NotebookPen, Sparkles, Activity } from 'lucide-react'

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
  return 'Welcome to Nightshift, your vibe coding companion for mindful late-night builds.'
}

const features = [
  {
    title: 'Guided session journaling',
    description: 'Capture the soundtrack, the spark, and the blockers from every Nightshift.',
    href: '/sign-up',
    icon: NotebookPen,
  },
  {
    title: 'Mood & energy trends',
    description:
      'Spot how your energy evolves through the week to schedule sessions intentionally.',
    href: '/pricing',
    icon: Activity,
  },
  {
    title: 'Flow ritual library',
    description:
      'Save warm-ups, resets, and cool-downs so your future self can reenter the zone fast.',
    href: '/dashboard',
    icon: Sparkles,
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
            Nightshift
          </Badge>
          <CardTitle className="text-3xl leading-tight md:text-4xl">
            Build your vibe coding ritual, one Nightshift at a time
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
              <Link to="/sign-up">Start your journal</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/pricing">View pricing</Link>
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MoonStar className="h-4 w-4 text-primary" />
            Designed for calm, intentional, after-dark coding sessions
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="bg-secondary/70 text-secondary-foreground">
            Session reflections
          </Badge>
          <Badge variant="secondary" className="bg-secondary/70 text-secondary-foreground">
            Mood tracking
          </Badge>
          <Badge variant="secondary" className="bg-secondary/70 text-secondary-foreground">
            Flow rituals
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
                <Link to={feature.href} className="flex items-center gap-1">
                  Explore
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="border-dashed border-muted/70 bg-card/80">
        <CardHeader className="space-y-4">
          <CardTitle className="text-2xl">Bring intention to your next session</CardTitle>
          <CardDescription>
            Nightshift captures the details that keep your vibe high—set a focus, log the playlist,
            and note what to adjust before your next coding deep dive.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Edit{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                src/routes/index.tsx
              </code>{' '}
              to tailor the story to your product.
            </p>
            <p>
              Ready to log a session? Head to the dashboard journal and start capturing your next
              Nightshift.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/dashboard" className="flex items-center gap-1">
              Peek at the journal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
