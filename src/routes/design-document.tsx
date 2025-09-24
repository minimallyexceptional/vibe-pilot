import React from 'react'
import { useParams } from '@tanstack/react-router'
import { AlertCircle, FileText, Loader2 } from 'lucide-react'

import { DesignDocumentWorkspace } from '@/components/ladel/design-document-workspace'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useProjects } from '@/lib/projects'
import type { VibePilotConfig } from '@/lib/vibe-pilot-ai'
import {
  DesignDocumentService,
  type DesignDocumentServiceState,
} from '@/services/DesignDocument/service'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const emptyServiceState: DesignDocumentServiceState = {
  messages: [],
  document: '',
  status: 'draft',
  isGenerating: false,
  hasUserInteracted: false,
  lastSavedAt: null,
}

export function DashboardDesignDocumentRoute() {
  const { projectId } = useParams({ from: '/dashboard/$projectId/design-document' })
  const { activeProject, saveDesignDocument, clearDesignDocument, logProjectActivity } =
    useProjects()
  const serviceRef = React.useRef<DesignDocumentService | null>(null)
  const serviceProjectRef = React.useRef<string | null>(null)
  const [chatError, setChatError] = React.useState<string | null>(null)
  const [manualSaveState, setManualSaveState] = React.useState<SaveState>('idle')
  const [autoSaveState, setAutoSaveState] = React.useState<SaveState>('idle')
  const [finalizeState, setFinalizeState] = React.useState<SaveState>('idle')
  const lastSavedContentRef = React.useRef(activeProject?.designDocument?.content ?? '')

  React.useEffect(() => {
    lastSavedContentRef.current = activeProject?.designDocument?.content ?? ''
  }, [activeProject?.designDocument?.content])

  const service = React.useMemo(() => {
    if (!projectId) {
      return serviceRef.current
    }

    if (!serviceRef.current || serviceProjectRef.current !== projectId) {
      const projectName = activeProject?.name ?? 'Untitled project'
      const initialDocument = activeProject?.designDocument?.content ?? ''
      const initialStatus = activeProject?.designDocument?.status ?? 'draft'
      const initialSavedAt = activeProject?.designDocument?.lastSavedAt ?? null

      serviceRef.current = new DesignDocumentService({
        projectName,
        initialDocument,
        initialStatus,
        initialSavedAt,
      })
      serviceProjectRef.current = projectId
    }

    return serviceRef.current
  }, [projectId, activeProject])

  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      if (!service) {
        return () => {}
      }

      return service.subscribe(() => onStoreChange())
    },
    [service],
  )

  const serviceState = React.useSyncExternalStore(
    subscribe,
    () => service?.getState() ?? emptyServiceState,
    () => service?.getState() ?? emptyServiceState,
  )

  const config = React.useMemo<VibePilotConfig>(
    () => ({
      mode: 'design',
      projectName: activeProject?.name ?? 'Untitled project',
      audience: 'Cross-functional teammates and partners',
      focusDetails: activeProject?.focus || 'Design document builder session',
      tone: 'friendly and clear',
    }),
    [activeProject?.name, activeProject?.focus],
  )

  const showDocumentPanel =
    serviceState.status === 'complete' ||
    serviceState.document.trim().length > 0 ||
    serviceState.hasUserInteracted

  const handleSendMessage = React.useCallback(
    async (message: string) => {
      setChatError(null)
      try {
        await service?.sendMessage(message)
        logProjectActivity(projectId)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setChatError(error instanceof Error ? error.message : 'Unable to generate a response.')
      }
    },
    [service, logProjectActivity, projectId],
  )

  const handleMarkdownChange = React.useCallback(
    (value: string) => {
      service?.setDocument(value)
    },
    [service],
  )

  const handleManualSave = React.useCallback(async () => {
    if (!projectId || !service) {
      return
    }

    try {
      setManualSaveState('saving')
      const saved = await saveDesignDocument(projectId, {
        content: serviceState.document,
        status: 'draft',
        config,
      })

      if (saved) {
        lastSavedContentRef.current = saved.content
        service.markSaved(saved.lastSavedAt)
        logProjectActivity(projectId)
        setManualSaveState('saved')
        window.setTimeout(() => setManualSaveState('idle'), 2500)
      } else {
        setManualSaveState('idle')
      }
    } catch (error) {
      console.error(error)
      setManualSaveState('error')
      window.setTimeout(() => setManualSaveState('idle'), 2500)
    }
  }, [projectId, saveDesignDocument, service, serviceState.document, config, logProjectActivity])

  const handleFinalize = React.useCallback(async () => {
    if (!projectId || !service || !serviceState.document.trim()) {
      return
    }

    try {
      setFinalizeState('saving')
      const saved = await saveDesignDocument(projectId, {
        content: serviceState.document,
        status: 'complete',
        config,
      })

      if (saved) {
        lastSavedContentRef.current = saved.content
        service.finalize(saved.lastSavedAt)
        logProjectActivity(projectId)
        setFinalizeState('saved')
        window.setTimeout(() => setFinalizeState('idle'), 2500)
      } else {
        setFinalizeState('idle')
      }
    } catch (error) {
      console.error(error)
      setFinalizeState('error')
      window.setTimeout(() => setFinalizeState('idle'), 2500)
    }
  }, [projectId, saveDesignDocument, service, serviceState.document, config, logProjectActivity])

  const handleReset = React.useCallback(() => {
    if (!projectId || !service) {
      return
    }

    clearDesignDocument(projectId)
    service.reset()
    lastSavedContentRef.current = ''
    setAutoSaveState('idle')
    setManualSaveState('idle')
    setFinalizeState('idle')
    setChatError(null)
    logProjectActivity(projectId)
  }, [projectId, clearDesignDocument, service, logProjectActivity])

  React.useEffect(() => {
    if (!projectId || !service || serviceState.status === 'complete') {
      return
    }

    if (lastSavedContentRef.current === serviceState.document) {
      return
    }

    const timeout = window.setTimeout(() => {
      try {
        setAutoSaveState('saving')
        const saved = saveDesignDocument(projectId, {
          content: serviceState.document,
          status: 'draft',
          config,
        })

        if (saved) {
          lastSavedContentRef.current = saved.content
          service.markSaved(saved.lastSavedAt)
          logProjectActivity(projectId)
          setAutoSaveState('saved')
          window.setTimeout(() => setAutoSaveState('idle'), 2000)
        } else {
          setAutoSaveState('idle')
        }
      } catch (error) {
        console.error(error)
        setAutoSaveState('error')
        window.setTimeout(() => setAutoSaveState('idle'), 2500)
      }
    }, 900)

    return () => window.clearTimeout(timeout)
  }, [
    projectId,
    serviceState.document,
    serviceState.status,
    saveDesignDocument,
    service,
    config,
    logProjectActivity,
  ])

  if (!projectId || !activeProject || activeProject.id !== projectId || !service) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label="Loading design document"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[100dvh] flex-1 flex-col overflow-y-auto bg-muted/20">
      <section className="border-b border-muted/60 bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <Badge variant="outline" className="w-fit border-primary/50 text-primary">
            Design toolkit
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Design Document Builder
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            Collaborate with our AI partner to turn quick notes into a polished plan for{' '}
            {activeProject.name}. Share what you know, answer a few guided questions, and watch the
            markdown preview update in real time.
          </p>
          <Card className="border border-muted/60 bg-card">
            <CardContent className="flex flex-col gap-3 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">How it works</p>
                  <p>
                    Chat in plain language. I&apos;ll keep the conversation human and update the
                    document with structured sections, ready to share.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
                <AlertCircle className="h-4 w-4" /> Reset workspace
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="flex flex-1 justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-6xl flex-1 flex-col">
          <DesignDocumentWorkspace
            chatMessages={serviceState.messages}
            onSendMessage={handleSendMessage}
            chatIsGenerating={serviceState.isGenerating}
            chatError={chatError}
            chatDisabled={serviceState.status === 'complete'}
            markdownValue={serviceState.document}
            onMarkdownChange={handleMarkdownChange}
            markdownStatus={serviceState.status}
            lastSavedAt={serviceState.lastSavedAt}
            autoSaveState={autoSaveState}
            manualSaveState={manualSaveState}
            finalizeState={finalizeState}
            onManualSave={handleManualSave}
            onReset={handleReset}
            onFinalize={handleFinalize}
            showDocumentPanel={showDocumentPanel}
          />
        </div>
      </section>
    </div>
  )
}
