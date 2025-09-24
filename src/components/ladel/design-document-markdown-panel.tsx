import React from 'react'
import { Check, FileText, Loader2, RotateCcw, Save, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { DesignDocumentPreview } from './design-document-preview'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type DesignDocumentMarkdownPanelProps = {
  value: string
  onChange: (value: string) => void
  status: 'draft' | 'complete'
  lastSavedAt: string | null
  autoSaveState: SaveState
  manualSaveState: SaveState
  finalizeState: SaveState
  onManualSave: () => Promise<void> | void
  onReset: () => Promise<void> | void
  onFinalize: () => Promise<void> | void
  disabled?: boolean
  activeView?: 'preview' | 'editor'
  onViewChange?: (view: 'preview' | 'editor') => void
  hideSwitcher?: boolean
}

export function DesignDocumentMarkdownPanel({
  value,
  onChange,
  status,
  lastSavedAt,
  autoSaveState,
  manualSaveState,
  finalizeState,
  onManualSave,
  onReset,
  onFinalize,
  disabled = false,
  activeView,
  onViewChange,
  hideSwitcher = false,
}: DesignDocumentMarkdownPanelProps) {
  const [internalView, setInternalView] = React.useState<'preview' | 'editor'>('preview')
  const currentView = activeView ?? internalView

  const setView = React.useCallback(
    (view: 'preview' | 'editor') => {
      if (onViewChange) {
        onViewChange(view)
      } else {
        setInternalView(view)
      }
    },
    [onViewChange],
  )

  React.useEffect(() => {
    if (status === 'complete') {
      setView('preview')
    }
  }, [status, setView])

  const saveLabel = React.useMemo(() => {
    if (autoSaveState === 'saving') {
      return 'Saving draft…'
    }

    if (autoSaveState === 'error') {
      return 'Auto-save failed. Use manual save to retry.'
    }

    if (autoSaveState === 'saved' && lastSavedAt) {
      return `Saved ${formatRelativeTime(lastSavedAt)}`
    }

    if (lastSavedAt) {
      return `Last saved ${formatRelativeTime(lastSavedAt)}`
    }

    return 'Draft not saved yet'
  }, [autoSaveState, lastSavedAt])

  return (
    <div className="flex h-full flex-col rounded-xl border border-muted/60 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Design document</p>
            <p className="text-xs text-muted-foreground">
              Live preview synced with every AI update.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {autoSaveState === 'saving' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {saveLabel}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 py-3">
        {hideSwitcher ? null : (
          <div className="inline-flex rounded-lg border border-muted/70 bg-muted/30 p-1 text-xs font-medium">
            <button
              type="button"
              className={cn(
                'flex-1 rounded-md px-3 py-1 transition data-[active=true]:bg-background data-[active=true]:text-foreground',
                currentView === 'preview' ? 'data-[active=true]' : 'text-muted-foreground',
              )}
              data-active={currentView === 'preview'}
              onClick={() => setView('preview')}
            >
              Preview
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 rounded-md px-3 py-1 transition data-[active=true]:bg-background data-[active=true]:text-foreground',
                status === 'complete' ? 'cursor-not-allowed text-muted-foreground opacity-60' : '',
                currentView === 'editor' ? 'data-[active=true]' : 'text-muted-foreground',
              )}
              onClick={() => {
                if (status === 'complete') {
                  return
                }
                setView('editor')
              }}
              aria-disabled={status === 'complete'}
            >
              Editor
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden rounded-lg border border-muted/70 bg-background">
          <div className="h-full overflow-y-auto p-4">
            {currentView === 'preview' || status === 'complete' ? (
              <DesignDocumentPreview source={value} />
            ) : (
              <Textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                className="min-h-[420px] w-full resize-y border-none p-0 text-sm focus-visible:ring-0"
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-muted/50 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Status: {status === 'complete' ? 'Finalized' : 'Draft in progress'}</span>
          {status === 'complete' ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Locked for teammates
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {status === 'complete' ? (
            <Button variant="outline" size="sm" onClick={() => onReset()} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Delete &amp; start over
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReset()}
                className="gap-1 text-muted-foreground"
                disabled={disabled}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManualSave()}
                disabled={disabled}
                className="gap-1"
              >
                {manualSaveState === 'saving' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Manual save
              </Button>
              <Button
                size="sm"
                onClick={() => onFinalize()}
                disabled={disabled || finalizeState === 'saving' || !value.trim()}
                className="gap-1"
              >
                {finalizeState === 'saving' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Finalize document
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp)
  const now = Date.now()
  const diff = Math.max(0, now - date.getTime())

  if (diff < 60 * 1000) {
    return 'just now'
  }

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.round(diff / (60 * 1000))
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.round(diff / (60 * 60 * 1000))
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
