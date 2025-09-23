import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Clock, FolderKanban, PlusCircle, Sparkles } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProjects } from '@/lib/projects'
import { cn } from '@/lib/utils'

function formatDate(dateInput: string) {
  const timestamp = Date.parse(dateInput)

  if (Number.isNaN(timestamp)) {
    return '—'
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(timestamp)
}

function formatRelativeTime(dateInput: string) {
  const timestamp = Date.parse(dateInput)

  if (Number.isNaN(timestamp)) {
    return 'just now'
  }

  const diff = Date.now() - timestamp

  if (diff <= 0) {
    return 'just now'
  }

  const minutes = Math.floor(diff / (60 * 1000))

  if (minutes < 1) {
    return 'just now'
  }

  if (minutes === 1) {
    return '1 minute ago'
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours === 1) {
    return '1 hour ago'
  }

  if (hours < 24) {
    return `${hours} hours ago`
  }

  const days = Math.floor(hours / 24)

  if (days === 1) {
    return '1 day ago'
  }

  if (days < 7) {
    return `${days} days ago`
  }

  return formatDate(dateInput)
}

export function ProjectsRoute() {
  const navigate = useNavigate()
  const { projects, activeProjectId, createProject, selectProject } = useProjects()
  const [name, setName] = React.useState('')
  const [summary, setSummary] = React.useState('')
  const [focus, setFocus] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const sortedProjects = projects
  const projectCountLabel = `${projects.length} project${projects.length === 1 ? '' : 's'}`

  const resetForm = () => {
    setName('')
    setSummary('')
    setFocus('')
  }

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()
    const trimmedFocus = focus.trim()

    if (!trimmedName || !trimmedFocus || isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      const project = createProject({
        name: trimmedName,
        summary,
        focus: trimmedFocus,
      })

      resetForm()
      await navigate({ to: '/dashboard/$projectId/journal', params: { projectId: project.id } })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenProject = async (projectId: string) => {
    const project = selectProject(projectId)

    if (!project) {
      return
    }

    await navigate({ to: '/dashboard/$projectId/journal', params: { projectId: projectId } })
  }

  const isFormValid = name.trim().length > 0 && focus.trim().length > 0

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 text-center md:items-start md:text-left">
        <Badge variant="outline" className="border-primary/60 text-primary">
          Nightshift projects
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Choose a project to enter Nightshift mode
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Each project keeps its own journal, rituals, and AI copilots so your focus stays precise.
        </p>
      </div>

      <Card className="mx-auto w-full max-w-4xl border-muted/70">
        <CardHeader className="space-y-3">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <PlusCircle className="h-4 w-4 text-primary" />
            Start a fresh project
          </div>
          <CardTitle className="text-2xl">Spin up a new Nightshift space</CardTitle>
          <CardDescription>
            Give your idea a name, set the immediate focus, and we&apos;ll prep a dedicated
            dashboard for deep work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleCreateProject}>
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                placeholder="e.g. Nebula ritual planner"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-focus">Current focus</Label>
              <Input
                id="project-focus"
                placeholder="e.g. Plan the onboarding ceremony for new collaborators"
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-summary">Vibe summary (optional)</Label>
              <textarea
                id="project-summary"
                placeholder="Share the intent, audience, or rituals you want to explore."
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Projects help you capture journals, rituals, and AI prompts for each initiative.
              </p>
              <Button type="submit" disabled={!isFormValid || isSubmitting}>
                Launch project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Your projects</h2>
            <p className="text-sm text-muted-foreground">
              Select a project to open its dedicated Nightshift dashboard.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit bg-secondary/80 text-secondary-foreground">
            {projectCountLabel}
          </Badge>
        </div>

        {sortedProjects.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedProjects.map((project) => {
              const isActive = project.id === activeProjectId

              return (
                <Card
                  key={project.id}
                  className={cn(
                    'border-muted/70 transition hover:border-primary/50 hover:shadow-sm',
                    isActive && 'border-primary/60 bg-primary/5 shadow-sm',
                  )}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-xl text-foreground">{project.name}</CardTitle>
                        <CardDescription>{project.summary}</CardDescription>
                      </div>
                      <Badge variant="outline" className="shrink-0 border-primary/40 text-primary">
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      {project.focus}
                    </div>
                    <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <div className="inline-flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>Updated {formatDate(project.updatedAt)}</span>
                      </div>
                      <span className="inline-flex items-center gap-2">
                        <FolderKanban className="h-3.5 w-3.5 text-primary" />
                        Last opened {formatRelativeTime(project.lastOpenedAt)}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {isActive ? 'Active now' : 'Keep momentum in this workspace'}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleOpenProject(project.id)}
                    >
                      Enter project
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="border-dashed border-muted/70">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              <FolderKanban className="h-6 w-6 text-primary" />
              <p>
                You don&apos;t have any projects yet. Spin up a new one to unlock your dashboards.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
