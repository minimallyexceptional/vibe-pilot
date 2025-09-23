import React from 'react'

export type Project = {
  id: string
  name: string
  summary: string
  focus: string
  status: string
  createdAt: string
  updatedAt: string
  lastOpenedAt: string
}

export type CreateProjectInput = {
  name: string
  summary?: string
  focus: string
}

type ProjectsContextValue = {
  projects: Project[]
  activeProjectId: string | null
  activeProject: Project | null
  createProject: (input: CreateProjectInput) => Project
  selectProject: (projectId: string) => Project | null
  logProjectActivity: (projectId: string) => void
}

const PROJECTS_STORAGE_KEY = 'nightshift.projects'
const ACTIVE_PROJECT_STORAGE_KEY = 'nightshift.activeProjectId'

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function sortProjects(projects: Project[]) {
  return [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

function safeLoadProjects(): Project[] {
  if (typeof window === 'undefined') {
    return defaultProjects
  }

  try {
    const stored = window.localStorage.getItem(PROJECTS_STORAGE_KEY)

    if (!stored) {
      return defaultProjects
    }

    const parsed: unknown = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      return defaultProjects
    }

    const projects: Project[] = []

    for (const item of parsed) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof (item as Project).id !== 'string' ||
        typeof (item as Project).name !== 'string'
      ) {
        return defaultProjects
      }

      const project = item as Partial<Project>

      if (
        typeof project.summary !== 'string' ||
        typeof project.focus !== 'string' ||
        typeof project.status !== 'string' ||
        typeof project.createdAt !== 'string' ||
        typeof project.updatedAt !== 'string' ||
        typeof project.lastOpenedAt !== 'string'
      ) {
        return defaultProjects
      }

      projects.push(project as Project)
    }

    return sortProjects(projects)
  } catch {
    return defaultProjects
  }
}

function safeLoadActiveProjectId(projects: Project[]): string | null {
  if (typeof window === 'undefined') {
    return projects[0]?.id ?? null
  }

  try {
    const stored = window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY)

    if (!stored) {
      return projects[0]?.id ?? null
    }

    const parsed: unknown = JSON.parse(stored)

    if (typeof parsed !== 'string') {
      return projects[0]?.id ?? null
    }

    return projects.some((project) => project.id === parsed) ? parsed : (projects[0]?.id ?? null)
  } catch {
    return projects[0]?.id ?? null
  }
}

const defaultProjects: Project[] = [
  {
    id: 'lunar-interfaces',
    name: 'Lunar Interfaces',
    summary: 'Crafting the portal for creators shaping cosmic UI systems and nightly rituals.',
    focus: 'Prototype the onboarding flow that helps new crews set their vibe rituals.',
    status: 'Discovery sprint',
    createdAt: '2024-03-18T09:00:00.000Z',
    updatedAt: '2024-04-06T14:30:00.000Z',
    lastOpenedAt: '2024-04-06T14:30:00.000Z',
  },
  {
    id: 'atlas-sessions',
    name: 'Atlas Sessions',
    summary: 'A shared vibe journal helping remote facilitators sync across timezones.',
    focus: 'Ship the weekly recap loop with highlights pulled from every host.',
    status: 'In-flight',
    createdAt: '2024-02-26T16:00:00.000Z',
    updatedAt: '2024-04-03T18:15:00.000Z',
    lastOpenedAt: '2024-04-04T08:45:00.000Z',
  },
  {
    id: 'aurora-synthesis',
    name: 'Aurora Synthesis',
    summary: 'Synth intelligence that surfaces stand-out insights from night research logs.',
    focus: 'Design the digest view that makes it effortless to share the signal.',
    status: 'Concept lab',
    createdAt: '2024-03-05T11:30:00.000Z',
    updatedAt: '2024-03-29T10:15:00.000Z',
    lastOpenedAt: '2024-03-29T10:15:00.000Z',
  },
]

const ProjectsContext = React.createContext<ProjectsContextValue | undefined>(undefined)

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const initialStateRef = React.useRef<{
    projects: Project[]
    activeProjectId: string | null
  } | null>(null)

  if (initialStateRef.current === null) {
    const projects = safeLoadProjects()
    initialStateRef.current = {
      projects,
      activeProjectId: safeLoadActiveProjectId(projects),
    }
  }

  const [projects, setProjects] = React.useState<Project[]>(() => initialStateRef.current!.projects)
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(
    () => initialStateRef.current!.activeProjectId,
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
    } catch {
      // Ignore storage errors.
    }
  }, [projects])

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      if (activeProjectId) {
        window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(activeProjectId))
      } else {
        window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY)
      }
    } catch {
      // Ignore storage errors.
    }
  }, [activeProjectId])

  const projectsRef = React.useRef(projects)

  React.useEffect(() => {
    projectsRef.current = projects
  }, [projects])

  const createProject = React.useCallback((input: CreateProjectInput) => {
    const now = new Date().toISOString()
    const project: Project = {
      id: createId('project'),
      name: input.name.trim(),
      summary: input.summary?.trim() || 'Fresh Nightshift idea warming up for its first sprint.',
      focus: input.focus.trim(),
      status: 'Kickoff ready',
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    }

    setProjects((previous) => sortProjects([project, ...previous]))
    setActiveProjectId(project.id)

    return project
  }, [])

  const selectProject = React.useCallback((projectId: string) => {
    const project = projectsRef.current.find((item) => item.id === projectId) ?? null

    if (!project) {
      return null
    }

    setActiveProjectId(projectId)
    const timestamp = new Date().toISOString()

    setProjects((previous) =>
      previous.map((item) => (item.id === projectId ? { ...item, lastOpenedAt: timestamp } : item)),
    )

    return { ...project, lastOpenedAt: timestamp }
  }, [])

  const logProjectActivity = React.useCallback((projectId: string) => {
    const timestamp = new Date().toISOString()

    setProjects((previous) => {
      let didUpdate = false

      const next = previous.map((item) => {
        if (item.id === projectId) {
          didUpdate = true
          return { ...item, updatedAt: timestamp }
        }

        return item
      })

      if (!didUpdate) {
        return previous
      }

      return sortProjects(next)
    })
  }, [])

  const activeProject = React.useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  )

  const value = React.useMemo<ProjectsContextValue>(
    () => ({
      projects,
      activeProjectId,
      activeProject,
      createProject,
      selectProject,
      logProjectActivity,
    }),
    [projects, activeProjectId, activeProject, createProject, selectProject, logProjectActivity],
  )

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects() {
  const context = React.useContext(ProjectsContext)

  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider')
  }

  return context
}
