import React from 'react'

import { DesignDocumentChat, type DesignDocumentChatMessage } from './design-document-chat'
import { DesignDocumentMarkdownPanel } from './design-document-markdown-panel'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type DesignDocumentWorkspaceProps = {
  chatMessages: DesignDocumentChatMessage[]
  onSendMessage: (message: string) => Promise<void> | void
  chatIsGenerating: boolean
  chatError?: string | null
  chatDisabled?: boolean
  markdownValue: string
  onMarkdownChange: (value: string) => void
  markdownStatus: 'draft' | 'complete'
  lastSavedAt: string | null
  autoSaveState: SaveState
  manualSaveState: SaveState
  finalizeState: SaveState
  onManualSave: () => Promise<void> | void
  onReset: () => Promise<void> | void
  onFinalize: () => Promise<void> | void
  showDocumentPanel: boolean
}

export function DesignDocumentWorkspace({
  chatMessages,
  onSendMessage,
  chatIsGenerating,
  chatError,
  chatDisabled = false,
  markdownValue,
  onMarkdownChange,
  markdownStatus,
  lastSavedAt,
  autoSaveState,
  manualSaveState,
  finalizeState,
  onManualSave,
  onReset,
  onFinalize,
  showDocumentPanel,
}: DesignDocumentWorkspaceProps) {
  const [mobileTab, setMobileTab] = React.useState<'chat' | 'preview' | 'editor'>('chat')
  const isEditorAvailable = showDocumentPanel && markdownStatus !== 'complete'

  React.useEffect(() => {
    if (!showDocumentPanel && mobileTab !== 'chat') {
      setMobileTab('chat')
    }
  }, [showDocumentPanel, mobileTab])

  React.useEffect(() => {
    if (markdownStatus === 'complete' && mobileTab === 'editor') {
      setMobileTab('preview')
    }
  }, [markdownStatus, mobileTab])

  const tabCount = showDocumentPanel ? 3 : 1

  const markdownPanelProps = {
    value: markdownValue,
    onChange: onMarkdownChange,
    status: markdownStatus,
    lastSavedAt,
    autoSaveState,
    manualSaveState,
    finalizeState,
    onManualSave,
    onReset,
    onFinalize,
    disabled: chatDisabled,
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="hidden h-full min-h-[560px] w-full gap-6 md:grid md:grid-cols-2">
        <DesignDocumentChat
          messages={chatMessages}
          onSend={onSendMessage}
          isGenerating={chatIsGenerating}
          error={chatError ?? undefined}
          disabled={chatDisabled}
        />
        {showDocumentPanel ? (
          <DesignDocumentMarkdownPanel {...markdownPanelProps} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-muted/60 bg-card text-sm text-muted-foreground">
            Start the chat to open a shared markdown workspace.
          </div>
        )}
      </div>

      <div className="flex h-full flex-1 flex-col gap-4 md:hidden">
        <div
          className="grid overflow-hidden rounded-xl border border-muted/60 bg-card text-sm font-medium"
          style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}
        >
          <button
            type="button"
            className={getMobileTriggerClass(mobileTab === 'chat')}
            onClick={() => setMobileTab('chat')}
          >
            Chat
          </button>
          {showDocumentPanel ? (
            <>
              <button
                type="button"
                className={getMobileTriggerClass(mobileTab === 'preview')}
                onClick={() => setMobileTab('preview')}
              >
                Preview
              </button>
              <button
                type="button"
                className={getMobileTriggerClass(mobileTab === 'editor', !isEditorAvailable)}
                onClick={() => {
                  if (!isEditorAvailable) {
                    return
                  }
                  setMobileTab('editor')
                }}
                aria-disabled={!isEditorAvailable}
              >
                Editor
              </button>
            </>
          ) : null}
        </div>
        <div className="flex-1">
          {mobileTab === 'chat' || !showDocumentPanel ? (
            <DesignDocumentChat
              messages={chatMessages}
              onSend={onSendMessage}
              isGenerating={chatIsGenerating}
              error={chatError ?? undefined}
              disabled={chatDisabled}
            />
          ) : null}
          {mobileTab === 'preview' && showDocumentPanel ? (
            <DesignDocumentMarkdownPanel
              {...markdownPanelProps}
              hideSwitcher
              activeView="preview"
            />
          ) : null}
          {mobileTab === 'editor' && showDocumentPanel ? (
            <DesignDocumentMarkdownPanel {...markdownPanelProps} hideSwitcher activeView="editor" />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function getMobileTriggerClass(active: boolean, disabled = false) {
  return [
    'border-r border-muted/60 px-3 py-2 text-center transition last:border-r-0',
    active ? 'bg-background text-foreground' : 'bg-muted/40 text-muted-foreground',
    disabled ? 'cursor-not-allowed opacity-60' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
