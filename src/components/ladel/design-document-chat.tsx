import React from 'react'
import { Loader2, SendHorizonal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type DesignDocumentChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type DesignDocumentChatProps = {
  messages: DesignDocumentChatMessage[]
  onSend: (message: string) => Promise<void> | void
  isGenerating: boolean
  disabled?: boolean
  error?: string | null
  placeholder?: string
}

export function DesignDocumentChat({
  messages,
  onSend,
  isGenerating,
  disabled = false,
  error,
  placeholder = 'Describe what you are trying to plan. Share goals, audience, or open questions.',
}: DesignDocumentChatProps) {
  const [value, setValue] = React.useState('')
  const [localError, setLocalError] = React.useState<string | null>(null)
  const listRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const list = listRef.current

    if (!list) {
      return
    }

    list.scrollTo({ top: list.scrollHeight })
  }, [messages])

  const attemptSend = async () => {
    const trimmed = value.trim()

    if (!trimmed || disabled || isGenerating) {
      if (!trimmed) {
        setLocalError('Add a quick note so I can help refine it.')
      }
      return
    }

    try {
      setLocalError(null)
      await onSend(trimmed)
      setValue('')
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'Something went wrong. Please try again.'
      setLocalError(message)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await attemptSend()
  }

  const activeError = error ?? localError

  return (
    <div className="flex h-full flex-col rounded-xl border border-muted/60 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-muted/50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">AI partner</p>
          <p className="text-xs text-muted-foreground">
            I&apos;ll keep the tone simple and translate our chat into a polished doc.
          </p>
        </div>
        {isGenerating ? (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking
          </div>
        ) : null}
      </div>
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-lg border px-3 py-2 text-sm shadow-sm transition',
                message.role === 'user'
                  ? 'rounded-br-none bg-primary text-primary-foreground border-primary/70'
                  : 'rounded-bl-none border-muted bg-background text-foreground',
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Tell me about the idea and I&apos;ll start a focused document for your team.
          </div>
        ) : null}
      </div>
      <div className="border-t border-muted/50 px-4 py-3">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            rows={4}
            disabled={disabled || isGenerating}
            className="resize-none text-sm"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void attemptSend()
              }
            }}
          />
          {activeError ? (
            <p className="text-xs font-medium text-destructive">{activeError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Press Enter to send, Shift + Enter for a new line.
            </p>
          )}
          <div className="flex items-center justify-end">
            <Button type="submit" size="sm" disabled={disabled || isGenerating} className="gap-1">
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendHorizonal className="h-3.5 w-3.5" />
              )}
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
