import React from 'react'
import { compile, run } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import * as runtime from 'react/jsx-runtime'
import type { Plugin } from 'unified'
import { SKIP, visit } from 'unist-util-visit'
import type { Root, Content, Code, InlineCode, Text } from 'mdast'
import type {
  MdxFlowExpression,
  MdxJsxFlowElement,
  MdxJsxTextElement,
  MdxTextExpression,
} from 'mdast-util-mdx'
import type { Parent } from 'unist'

import { cn } from '@/lib/utils'

type DesignDocumentPreviewProps = {
  source: string
  className?: string
}

type MutableParent = Parent & { children: Content[] }

function replaceNode(parent: MutableParent, index: number, replacement: Content | null): void {
  if (replacement) {
    parent.children.splice(index, 1, replacement)
  } else {
    parent.children.splice(index, 1)
  }
}

const stripUnsafeMdx: Plugin<[], Root> = () => (tree) => {
  visit(tree, (node, index, parent) => {
    if (!parent || typeof index !== 'number') {
      return
    }

    const mutableParent = parent as MutableParent

    switch (node.type) {
      case 'mdxjsEsm': {
        replaceNode(mutableParent, index, null)
        return [SKIP, index]
      }
      case 'mdxFlowExpression': {
        const flowExpression = node as MdxFlowExpression
        const codeNode: Code = {
          type: 'code',
          lang: 'mdx',
          value: `{${flowExpression.value}}`,
        }
        replaceNode(mutableParent, index, codeNode)
        return [SKIP, index]
      }
      case 'mdxTextExpression': {
        const textExpression = node as MdxTextExpression
        const inlineExpression: InlineCode = {
          type: 'inlineCode',
          value: `{${textExpression.value}}`,
        }
        replaceNode(mutableParent, index, inlineExpression)
        return [SKIP, index]
      }
      case 'mdxJsxFlowElement':
      case 'mdxJsxTextElement': {
        const jsxNode = node as MdxJsxFlowElement | MdxJsxTextElement
        const placeholder: Text = {
          type: 'text',
          value: jsxNode.name ? `<${jsxNode.name} />` : '<mdx-element />',
        }
        replaceNode(mutableParent, index, placeholder)
        return [SKIP, index]
      }
      case 'html': {
        const htmlNode = node as unknown as { value: string }
        const safeHtml: Text = {
          type: 'text',
          value: htmlNode.value,
        }
        replaceNode(mutableParent, index, safeHtml)
        return [SKIP, index]
      }
      default:
        return
    }
  })
}

const safeComponents = {
  a: ({ href, ...props }: React.ComponentProps<'a'>) => {
    if (!href || !isSafeHref(href)) {
      return <span {...props} />
    }

    const isHashLink = href.startsWith('#')
    return (
      <a
        href={href}
        {...props}
        rel={isHashLink ? undefined : 'noreferrer noopener'}
        target={isHashLink ? undefined : '_blank'}
      />
    )
  },
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href, 'https://example.com')
    if (url.origin === 'https://example.com') {
      return true
    }

    return SAFE_PROTOCOLS.has(url.protocol)
  } catch {
    return false
  }
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
          remarkPlugins: [remarkGfm, stripUnsafeMdx],
          outputFormat: 'function-body',
        })

        const module = await run(compiled, {
          ...runtime,
          useMDXComponents: () => safeComponents,
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
