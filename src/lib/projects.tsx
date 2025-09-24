import React from 'react'

import type { VibePilotConfig } from './vibe-pilot-ai'

export type Project = {
  id: string
  name: string
  summary: string
  focus: string
  status: string
  createdAt: string
  updatedAt: string
  lastOpenedAt: string
  designDocument: ProjectDesignDocument | null
}

export type CreateProjectInput = {
  name: string
  summary?: string
  focus: string
}

export type ProjectDesignDocumentStatus = 'draft' | 'complete'

export type ProjectDesignDocument = {
  content: string
  status: ProjectDesignDocumentStatus
  lastSavedAt: string
  config: VibePilotConfig
}

export type SaveDesignDocumentInput = {
  content: string
  status?: ProjectDesignDocumentStatus
  config: VibePilotConfig
}

type ProjectsContextValue = {
  projects: Project[]
  activeProjectId: string | null
  activeProject: Project | null
  createProject: (input: CreateProjectInput) => Project
  selectProject: (projectId: string) => Project | null
  logProjectActivity: (projectId: string) => void
  saveDesignDocument: (
    projectId: string,
    input: SaveDesignDocumentInput,
  ) => ProjectDesignDocument | null
  clearDesignDocument: (projectId: string) => void
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

      const project = item as Partial<Project> & {
        designDocument?: unknown
      }

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

      let designDocument: ProjectDesignDocument | null = null

      if (project.designDocument && typeof project.designDocument === 'object') {
        const candidate = project.designDocument as Partial<ProjectDesignDocument> & {
          config?: Partial<VibePilotConfig>
        }

        const status = candidate.status

        const configCandidate: Partial<VibePilotConfig> = candidate.config ?? {}
        const modeCandidate =
          configCandidate.mode === 'design' || configCandidate.mode === 'collaboration'
            ? configCandidate.mode
            : 'design'

        if (
          typeof candidate.content === 'string' &&
          (status === 'draft' || status === 'complete') &&
          typeof candidate.lastSavedAt === 'string' &&
          typeof configCandidate.projectName === 'string' &&
          typeof configCandidate.audience === 'string' &&
          typeof configCandidate.focusDetails === 'string' &&
          typeof configCandidate.tone === 'string'
        ) {
          designDocument = {
            content: candidate.content,
            status,
            lastSavedAt: candidate.lastSavedAt,
            config: {
              mode: modeCandidate,
              projectName: configCandidate.projectName,
              audience: configCandidate.audience,
              focusDetails: configCandidate.focusDetails,
              tone: configCandidate.tone,
            },
          }
        }
      }

      const id = project.id as string
      const name = project.name as string
      const summary = project.summary as string
      const focus = project.focus as string
      const status = project.status as string
      const createdAt = project.createdAt as string
      const updatedAt = project.updatedAt as string
      const lastOpenedAt = project.lastOpenedAt as string

      projects.push({
        id,
        name,
        summary,
        focus,
        status,
        createdAt,
        updatedAt,
        lastOpenedAt,
        designDocument,
      })
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
    designDocument: null,
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
    designDocument: null,
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
    designDocument: null,
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
      designDocument: null,
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

  const saveDesignDocument = React.useCallback(
    (projectId: string, input: SaveDesignDocumentInput) => {
      const timestamp = new Date().toISOString()
      let savedDocument: ProjectDesignDocument | null = null

      setProjects((previous) => {
        let didUpdate = false

        const next = previous.map((project) => {
          if (project.id !== projectId) {
            return project
          }

          didUpdate = true

          const status = input.status ?? project.designDocument?.status ?? 'draft'
          const config: VibePilotConfig = {
            ...input.config,
            mode:
              input.config.mode === 'design' || input.config.mode === 'collaboration'
                ? input.config.mode
                : 'design',
            projectName: input.config.projectName.trim() || project.name,
            audience: input.config.audience,
            focusDetails: input.config.focusDetails,
            tone: input.config.tone,
          }

          const designDocument: ProjectDesignDocument = {
            content: input.content,
            status,
            lastSavedAt: timestamp,
            config,
          }

          savedDocument = designDocument

          return {
            ...project,
            designDocument,
            updatedAt: timestamp,
          }
        })

        if (!didUpdate) {
          return previous
        }

        return sortProjects(next)
      })

      return savedDocument
    },
    [],
  )

  const clearDesignDocument = React.useCallback((projectId: string) => {
    const timestamp = new Date().toISOString()

    setProjects((previous) => {
      let didUpdate = false

      const next = previous.map((project) => {
        if (project.id !== projectId) {
          return project
        }

        if (!project.designDocument) {
          return project
        }

        didUpdate = true

        return {
          ...project,
          designDocument: null,
          updatedAt: timestamp,
        }
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
      saveDesignDocument,
      clearDesignDocument,
    }),
    [
      projects,
      activeProjectId,
      activeProject,
      createProject,
      selectProject,
      logProjectActivity,
      saveDesignDocument,
      clearDesignDocument,
    ],
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
