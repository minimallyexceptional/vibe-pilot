import React from 'react'
import { Link, Navigate, Outlet, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  ListChecks,
  LogIn,
  Menu,
  MoonStar,
  NotebookPen,
  Sparkles,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModeToggle } from '@/components/mode-toggle'
import { SignedIn, SignedOut, UserButton, isClerkConfigured, useUser } from '@/lib/clerk'
import { useProjects } from '@/lib/projects'
import { cn, getInitials } from '@/lib/utils'

const APP_NAME = 'Nightshift'

const sidebarItems = [
  {
    label: 'Vibe Pilot',
    description: 'Spin up an AI copilot for product design and strategy.',
    to: '/dashboard/$projectId/vibe-pilot',
    icon: Bot,
  },
  {
    label: 'Design Doc Workshop',
    description: 'Guide structured prompts into a living design spec.',
    to: '/dashboard/$projectId/design-doc',
    icon: FileText,
  },
  {
    label: 'Vibe Journal',
    description: 'Capture the highlights and hurdles from every session.',
    to: '/dashboard/$projectId/journal',
    icon: NotebookPen,
  },
  {
    label: 'Flow Rituals',
    description: 'Design routines that help your crew enter the zone.',
    to: '/dashboard/$projectId/rituals',
    icon: Sparkles,
  },
] as const

type SidebarAccountUser = {
  name: string
  email: string
  imageUrl?: string | null
}

const placeholderAccountUser: SidebarAccountUser = {
  name: 'Avery Parker',
  email: 'avery.parker@example.com',
  imageUrl: undefined,
}

function SidebarAccountMenu({
  isCollapsed,
  user,
  projectId,
  onNavigate,
}: {
  isCollapsed: boolean
  user: SidebarAccountUser
  projectId: string
  onNavigate?: () => void
}) {
  const initials = React.useMemo(() => getInitials(user.name) || 'AP', [user.name])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open account menu"
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-muted/70 hover:bg-muted/50',
            isCollapsed && 'justify-center px-0',
          )}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.imageUrl ?? undefined} alt={user.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className={cn('min-w-0 flex-1', isCollapsed && 'sr-only')}>
            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <ChevronsUpDown
            className={cn('h-4 w-4 text-muted-foreground', isCollapsed && 'sr-only')}
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-64">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild onSelect={() => onNavigate?.()}>
          <Link
            to="/dashboard/$projectId/account"
            params={{ projectId }}
            className="flex w-full items-center justify-between gap-2"
          >
            <span className="text-sm font-medium">Account management</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SidebarSignedOutPrompt({ isCollapsed }: { isCollapsed: boolean }) {
  if (isCollapsed) {
    return (
      <Button size="icon" variant="outline" className="w-full" asChild>
        <Link to="/login" aria-label="Sign in to access account settings">
          <LogIn className="h-4 w-4" />
        </Link>
      </Button>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-muted/70 bg-background/60 p-4 text-xs text-muted-foreground">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Sign in for journal tools</p>
        <p>Capture session reflections, ritual templates, and vibe analytics once you log in.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link to="/login">Sign in</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/sign-up">Create account</Link>
        </Button>
      </div>
    </div>
  )
}

const moodOptions = [
  { value: 'energized', label: 'Energized' },
  { value: 'curious', label: 'Curious' },
  { value: 'calm', label: 'Calm' },
  { value: 'tired', label: 'Tired but determined' },
] as const

type MoodValue = (typeof moodOptions)[number]['value']

type JournalEntry = {
  id: number
  sessionName: string
  date: string
  mood: MoodValue
  highlight: string
  challenge: string
  soundtrack?: string
  nextFocus?: string
}

const moodLabelMap = moodOptions.reduce(
  (acc, option) => {
    acc[option.value] = option.label
    return acc
  },
  {} as Record<MoodValue, string>,
)

const initialJournalEntries: JournalEntry[] = [
  {
    id: 1,
    sessionName: 'Shader playground — galaxy prototype',
    date: 'April 6, 2024',
    mood: 'energized',
    highlight:
      'Layered simplex noise to get the swirl just right and saved presets for future visuals.',
    challenge: 'Frame drops appear when bloom is enabled. Need to profile WebGL calls.',
    soundtrack: 'Lofi Stargaze playlist',
    nextFocus: 'Profile the render loop and try batching draw calls.',
  },
  {
    id: 2,
    sessionName: 'Nightly retro UI polish',
    date: 'April 3, 2024',
    mood: 'curious',
    highlight: 'Refined the command palette transitions and documented keyboard rituals.',
    challenge: 'Spent extra time debugging theme tokens across dark/light blends.',
    soundtrack: 'Analog Synth Drift — 90 BPM',
    nextFocus: 'Extract shared tokens and schedule a pairing session for theme QA.',
  },
]

function createInitialJournalEntries(): JournalEntry[] {
  return initialJournalEntries.map((entry) => ({ ...entry }))
}

export function DashboardLayout() {
  const { projectId } = useParams({ from: '/dashboard/$projectId' })
  const { projects, activeProject, selectProject } = useProjects()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const authEnabled = isClerkConfigured
  const { user } = useUser()

  React.useEffect(() => {
    if (projectId) {
      selectProject(projectId)
    }
  }, [projectId, selectProject])

  const project = React.useMemo(() => {
    if (!projectId) {
      return null
    }

    if (activeProject && activeProject.id === projectId) {
      return activeProject
    }

    return projects.find((item) => item.id === projectId) ?? null
  }, [activeProject, projects, projectId])

  const sidebarAccountUser = React.useMemo<SidebarAccountUser>(() => {
    if (user) {
      const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(' ')
      const name = user.fullName || fallbackName || placeholderAccountUser.name
      const primaryEmail = user.primaryEmailAddress
      const email =
        primaryEmail && typeof primaryEmail.emailAddress === 'string'
          ? primaryEmail.emailAddress
          : placeholderAccountUser.email

      return {
        name,
        email,
        imageUrl: user.imageUrl ?? placeholderAccountUser.imageUrl,
      }
    }

    return placeholderAccountUser
  }, [user])

  const baseNavItemClass = React.useMemo(
    () =>
      cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted',
        isCollapsed ? 'justify-center px-2' : 'justify-start',
      ),
    [isCollapsed],
  )

  const activeNavItemClass = React.useMemo(
    () => cn(baseNavItemClass, 'bg-primary/10 text-primary hover:bg-primary/10'),
    [baseNavItemClass],
  )

  if (!project) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-10 bg-background/60 backdrop-blur-sm transition-opacity md:hidden',
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setIsMobileOpen(false)}
      />
      <div className="flex h-screen min-h-[100dvh] bg-background">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-20 flex h-full w-64 min-h-0 flex-col border-r bg-card transition-[transform,width] duration-300 md:static md:translate-x-0',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            isCollapsed && 'md:w-20',
          )}
        >
          <div className="flex h-16 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MoonStar className="h-4 w-4" />
              </span>
              <span
                className={cn('text-base font-semibold text-foreground', isCollapsed && 'sr-only')}
              >
                {APP_NAME}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
            {sidebarItems.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  params={{ projectId: project.id }}
                  className={baseNavItemClass}
                  onClick={() => setIsMobileOpen(false)}
                  activeOptions={{ exact: true }}
                  activeProps={{
                    className: activeNavItemClass,
                    'aria-current': 'page',
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span className={cn('whitespace-nowrap', isCollapsed && 'sr-only')}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>
          <div className="border-t px-4 py-4">
            {authEnabled ? (
              <>
                <SignedIn>
                  <SidebarAccountMenu
                    isCollapsed={isCollapsed}
                    user={sidebarAccountUser}
                    projectId={project.id}
                    onNavigate={() => setIsMobileOpen(false)}
                  />
                </SignedIn>
                <SignedOut>
                  <SidebarSignedOutPrompt isCollapsed={isCollapsed} />
                </SignedOut>
              </>
            ) : (
              <SidebarAccountMenu
                isCollapsed={isCollapsed}
                user={sidebarAccountUser}
                projectId={project.id}
                onNavigate={() => setIsMobileOpen(false)}
              />
            )}
          </div>
        </aside>
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden md:pl-0">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileOpen((prev) => !prev)}
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="gap-1 px-2 text-xs font-medium md:px-3 md:text-sm"
              >
                <Link to="/dashboard" className="inline-flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Projects
                </Link>
              </Button>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-foreground sm:text-lg">
                    {project.name}
                  </p>
                  <Badge variant="secondary" className="bg-secondary/80 text-secondary-foreground">
                    {project.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                    <Sparkles className="h-3 w-3" />
                    {project.focus}
                  </span>
                  <span className="hidden min-w-0 truncate sm:inline">{project.summary}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <SignedIn>
                <UserButton
                  appearance={{ elements: { userButtonAvatarBox: 'h-9 w-9' } }}
                  afterSignOutUrl="/"
                />
              </SignedIn>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {authEnabled ? (
              <>
                <SignedIn>
                  <Outlet />
                </SignedIn>
                <SignedOut>
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <NotebookPen className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-foreground">
                        Sign in to open {project.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Authenticate to access this project&apos;s journal entries, rituals, and
                        copilots.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button asChild>
                        <Link to="/login">Log in</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link to="/sign-up">Create an account</Link>
                      </Button>
                    </div>
                  </div>
                </SignedOut>
              </>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </>
  )
}

export function DashboardJournalRoute() {
  const { projectId } = useParams({ from: '/dashboard/$projectId/journal' })
  const [entriesByProject, setEntriesByProject] = React.useState<Record<string, JournalEntry[]>>(
    () => ({
      [projectId]: createInitialJournalEntries(),
    }),
  )
  const [sessionFocus, setSessionFocus] = React.useState('')
  const [mood, setMood] = React.useState<MoodValue>(moodOptions[0].value)
  const [highlight, setHighlight] = React.useState('')
  const [challenge, setChallenge] = React.useState('')
  const [soundtrack, setSoundtrack] = React.useState('')
  const [nextFocus, setNextFocus] = React.useState('')

  React.useEffect(() => {
    setEntriesByProject((prev) => {
      if (prev[projectId]) {
        return prev
      }

      return {
        ...prev,
        [projectId]: [],
      }
    })

    setSessionFocus('')
    setMood(moodOptions[0].value)
    setHighlight('')
    setChallenge('')
    setSoundtrack('')
    setNextFocus('')
  }, [projectId])

  const entries = React.useMemo(
    () => entriesByProject[projectId] ?? [],
    [entriesByProject, projectId],
  )

  const { activeProject, logProjectActivity } = useProjects()
  const projectName = activeProject?.name ?? 'this project'
  const projectSummary = activeProject?.summary ?? null
  const sessionPlaceholder = activeProject?.focus
    ? `e.g. ${activeProject.focus}`
    : 'e.g. Refactor the synth sequencer'

  const isFormValid = sessionFocus.trim() && highlight.trim() && challenge.trim()

  const latestEntry = entries[0]

  const topMoodLabel = React.useMemo(() => {
    if (!entries.length) {
      return '—'
    }

    const counts: Record<string, number> = {}

    for (const entry of entries) {
      counts[entry.mood] = (counts[entry.mood] ?? 0) + 1
    }

    const topMoodKey = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]

    if (!topMoodKey) {
      return '—'
    }

    return moodLabelMap[topMoodKey as MoodValue] ?? topMoodKey
  }, [entries])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isFormValid) {
      return
    }

    const formattedDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date())

    const newEntry: JournalEntry = {
      id: Date.now(),
      sessionName: sessionFocus.trim(),
      date: formattedDate,
      mood,
      highlight: highlight.trim(),
      challenge: challenge.trim(),
      soundtrack: soundtrack.trim() || undefined,
      nextFocus: nextFocus.trim() || undefined,
    }

    setEntriesByProject((prev) => {
      const currentEntries = prev[projectId] ?? []

      return {
        ...prev,
        [projectId]: [newEntry, ...currentEntries],
      }
    })
    logProjectActivity(projectId)
    setSessionFocus('')
    setMood(moodOptions[0].value)
    setHighlight('')
    setChallenge('')
    setSoundtrack('')
    setNextFocus('')
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Nightshift journal for {projectName}
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Capture highlights, hurdles, and next moves so {projectName} keeps its momentum.
          {projectSummary ? <> {projectSummary}</> : null}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="border-muted/70">
          <CardHeader className="space-y-3">
            <CardTitle>Log a new session</CardTitle>
            <CardDescription>
              Capture the focus, mood, and takeaways while the vibe is fresh—each entry keeps
              {` ${projectName} aligned.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="session-focus">Session focus</Label>
                <Input
                  id="session-focus"
                  placeholder={sessionPlaceholder}
                  value={sessionFocus}
                  onChange={(event) => setSessionFocus(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="session-mood">How did you feel?</Label>
                <select
                  id="session-mood"
                  value={mood}
                  onChange={(event) => setMood(event.target.value as MoodValue)}
                  className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {moodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="session-highlight">What felt great?</Label>
                <textarea
                  id="session-highlight"
                  value={highlight}
                  onChange={(event) => setHighlight(event.target.value)}
                  placeholder="Document the flow moments, breakthroughs, or helpful rituals."
                  className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="session-challenge">What felt off?</Label>
                <textarea
                  id="session-challenge"
                  value={challenge}
                  onChange={(event) => setChallenge(event.target.value)}
                  placeholder="Call out blockers, distractions, or things to tweak next time."
                  className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="session-soundtrack">Soundtrack (optional)</Label>
                  <Input
                    id="session-soundtrack"
                    placeholder="Playlist, artist, or ambience"
                    value={soundtrack}
                    onChange={(event) => setSoundtrack(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="session-next">Next Nightshift focus (optional)</Label>
                  <Input
                    id="session-next"
                    placeholder="What will you explore tomorrow?"
                    value={nextFocus}
                    onChange={(event) => setNextFocus(event.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!isFormValid}>
                Save session
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-muted/70 bg-card/80">
          <CardHeader className="space-y-3">
            <CardTitle>Tonight&apos;s vibe</CardTitle>
            <CardDescription>
              Review recent entries to decide how you want to feel before the next commit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-muted-foreground">
            {latestEntry ? (
              <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{latestEntry.sessionName}</p>
                    <p className="text-xs text-muted-foreground">Logged {latestEntry.date}</p>
                  </div>
                  <Badge variant="outline">{moodLabelMap[latestEntry.mood]}</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Highlight
                  </p>
                  <p>{latestEntry.highlight}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Next focus
                  </p>
                  <p>{latestEntry.nextFocus ?? 'Set a gentle intention for your next session.'}</p>
                </div>
              </div>
            ) : (
              <p>No journal entries yet. Log your first Nightshift to see insights here.</p>
            )}
            <div className="grid gap-3 rounded-lg border border-muted/60 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Mood most logged
                </p>
                <p className="text-sm font-medium text-foreground">{topMoodLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Entries saved
                </p>
                <p className="text-sm font-medium text-foreground">{entries.length}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Recent soundtracks
                </p>
                <p className="text-sm font-medium text-foreground">
                  {entries
                    .map((entry) => entry.soundtrack)
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(' · ') || 'Add a soundtrack to remember the vibe.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Recent Nightshifts</h2>
        {entries.length ? (
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="border-muted/70">
                <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{entry.sessionName}</CardTitle>
                    <CardDescription>{entry.date}</CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className="w-fit bg-secondary/70 text-secondary-foreground"
                  >
                    {moodLabelMap[entry.mood]}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">What felt great</p>
                    <p>{entry.highlight}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">What felt off</p>
                    <p>{entry.challenge}</p>
                  </div>
                  {entry.soundtrack ? (
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Soundtrack</p>
                      <p>{entry.soundtrack}</p>
                    </div>
                  ) : null}
                  {entry.nextFocus ? (
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Next Nightshift focus</p>
                      <p>{entry.nextFocus}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-muted/70">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              <NotebookPen className="h-6 w-6 text-primary" />
              <p>No entries yet. Log your first Nightshift to build momentum.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export function DashboardRitualsRoute() {
  const { activeProject } = useProjects()
  const projectName = activeProject?.name ?? 'your project'

  const rituals = [
    {
      title: 'Arrival ritual',
      description: 'Ease into your Nightshift with a short transition that primes focus.',
      steps: [
        'Dim the lights and silence notifications for 90 minutes.',
        'Scan yesterday’s highlight to reconnect with momentum.',
        'Queue a calming playlist and set a 25-minute timer.',
      ],
    },
    {
      title: 'Mid-session reset',
      description: 'When the vibe dips, take five to breathe, move, and recalibrate.',
      steps: [
        'Stand, stretch, and take three deep breaths away from your desk.',
        'Write one line in the journal about what you need right now.',
        'Swap to a fresh track or ambience that matches your desired energy.',
      ],
    },
    {
      title: 'Cool-down ritual',
      description: 'Close the loop so you can rest knowing the next session is set.',
      steps: [
        'Summarize wins + hurdles in the journal entry while it’s fresh.',
        'Leave a breadcrumb for tomorrow’s first task.',
        'Celebrate with a short note of gratitude or shout-out to your crew.',
      ],
    },
  ]

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Flow rituals for {projectName}
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Borrow these prompts to shape routines that keep this project grounded, energized, and
          ready for every Nightshift.
        </p>
      </div>
      <Card className="border-muted/70 bg-card/80">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Ritual foundations
          </CardTitle>
          <CardDescription>
            Pair any ritual with your vibe journal entries so {projectName} can see which practices
            support its best flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Try cycling through these routines over a week and note in the journal which ones boost
            energy, calm nerves, or invite curiosity. Adjust steps until the ritual feels like
            second nature.
          </p>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {rituals.map((ritual) => (
          <Card key={ritual.title} className="border-muted/70">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="h-5 w-5 text-primary" />
                {ritual.title}
              </CardTitle>
              <CardDescription>{ritual.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-3 text-sm text-muted-foreground">
                {ritual.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-primary/10 text-center text-xs font-semibold leading-6 text-primary">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function DashboardIndexRoute() {
  const { projectId } = useParams({ from: '/dashboard/$projectId' })

  return <Navigate to="/dashboard/$projectId/journal" params={{ projectId }} replace />
}
