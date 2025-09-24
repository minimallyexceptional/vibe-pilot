import React from 'react'
import { compile, run } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import * as runtime from 'react/jsx-runtime'

import { cn } from '@/lib/utils'

type DesignDocumentPreviewProps = {
  source: string
  className?: string
}

export function DesignDocumentPreview({ source, className }: DesignDocumentPreviewProps) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function renderMarkdown() {
      if (!source.trim()) {
        function PreviewPlaceholder() {
          return (
            <p className="text-sm text-muted-foreground">
              Start chatting or editing to see the live preview.
            </p>
          )
        }

        PreviewPlaceholder.displayName = 'PreviewPlaceholder'
        setComponent(() => PreviewPlaceholder)
        setError(null)
        return
      }

      try {
        const compiled = await compile(source, {
          remarkPlugins: [remarkGfm],
          outputFormat: 'function-body',
        })

        const module = await run(compiled, {
          ...runtime,
          useMDXComponents: () => ({}),
        })

        if (!cancelled) {
          const PreviewComponent = (module as { default: React.ComponentType }).default
          PreviewComponent.displayName =
            PreviewComponent.displayName || 'DesignDocumentPreviewContent'
          setComponent(() => PreviewComponent)
          setError(null)
        }
      } catch (renderError) {
        if (cancelled) {
          return
        }

        const message =
          renderError instanceof Error
            ? renderError.message
            : 'Unable to render the markdown preview.'
        setError(message)
        setComponent(null)
      }
    }

    void renderMarkdown()

    return () => {
      cancelled = true
    }
  }, [source])

  if (error) {
    return (
      <div
        className={cn(
          'rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive',
          className,
        )}
      >
        Preview error: {error}
      </div>
    )
  }

  if (!Component) {
    return (
      <div
        className={cn(
          'rounded-lg border border-muted/60 bg-background/70 p-4 text-sm text-muted-foreground',
          className,
        )}
      >
        Building preview…
      </div>
    )
  }

  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
      <Component />
    </div>
  )
}
