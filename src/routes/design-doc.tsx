import React from 'react'
import { useParams } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import {
  Bold,
  Bot,
  Code,
  FileText,
  Heading2,
  Italic,
  Link2,
  List,
  Loader2,
  MessageSquare,
  SendHorizonal,
  Sparkles,
} from 'lucide-react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import { Highlight, themes, type Language, type RenderProps } from 'prism-react-renderer'
import type { Element as HastElement, RootContent } from 'hast'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProjects } from '@/lib/projects'
import {
  appendSectionContent,
  createDesignDocPlan,
  createDesignDocTemplate,
  createIntroMessage,
  mockDesignDocExchange,
  type DesignDocPlan,
  type DesignDocSectionKey,
  type MarkdownAst,
} from '@/lib/design-doc-assistant'
import { cn } from '@/lib/utils'

const markdownProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype)

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

type AnswersMap = Partial<Record<DesignDocSectionKey, string>>

type ToolbarCommand = 'bold' | 'italic' | 'link' | 'code' | 'heading' | 'bullet'

type DesignDocContextValue = {
  plan: DesignDocPlan
  document: string
  updateDocument: (value: string) => void
  messages: ChatMessage[]
  submitAnswer: (answer: string) => Promise<void>
  isProcessing: boolean
  isComplete: boolean
  activeStepIndex: number
  totalSteps: number
  lastSavedAt: Date | null
  error: string | null
  contextDetails: {
    projectName: string
    projectSummary?: string
    projectFocus?: string
  }
}

const DesignDocContext = React.createContext<DesignDocContextValue | null>(null)

function useDesignDocWorkspace() {
  const context = React.useContext(DesignDocContext)

  if (!context) {
    throw new Error('useDesignDocWorkspace must be used within DesignDocProvider')
  }

  return context
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function createMarkdownAst(markdown: string): MarkdownAst | null {
  try {
    const file = markdownProcessor.processSync(markdown)
    const result = (file.result ?? file.value) as MarkdownAst | string | undefined

    if (result && typeof result !== 'string') {
      return result
    }

    return null
  } catch (error) {
    console.error('Failed to parse markdown preview', error)
    return null
  }
}

function getTextFromChildren(children: RootContent[]): string {
  return children
    .map((child) => {
      if (child.type === 'text') {
        return child.value
      }

      if ('children' in child) {
        return getTextFromChildren(child.children as RootContent[])
      }

      return ''
    })
    .join('')
}

function normalizeClassName(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(' ')
  }

  if (typeof value === 'string') {
    return value
  }

  return undefined
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const safeLanguage = (language || 'tsx') as Language

  return (
    <Highlight theme={themes.oneDark} code={code} language={safeLanguage}>
      {({ className, style, tokens, getLineProps, getTokenProps }: RenderProps) => (
        <pre
          className={cn(
            'rounded-lg border border-muted bg-muted/60 p-4 text-xs sm:text-sm',
            className,
          )}
          style={style}
        >
          {tokens.map((line, lineIndex) => (
            <div key={lineIndex} {...getLineProps({ line, key: lineIndex })}>
              {line.map((token, tokenIndex) => (
                <span key={tokenIndex} {...getTokenProps({ token, key: tokenIndex })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}

function renderMarkdownNode(node: RootContent, index: number, parentTag?: string): React.ReactNode {
  if (node.type === 'text') {
    return node.value
  }

  if (node.type === 'element') {
    const element = node as HastElement

    if (element.tagName === 'pre') {
      const codeChild = element.children.find(
        (child): child is HastElement => child.type === 'element' && child.tagName === 'code',
      )
      const code = codeChild ? getTextFromChildren(codeChild.children as RootContent[]) : ''
      const className = normalizeClassName(codeChild?.properties?.className)
      const language = className?.split(' ').find((item) => item.startsWith('language-'))
      const languageName = language ? language.replace('language-', '') : 'tsx'

      return <CodeBlock key={index} code={code} language={languageName} />
    }

    const children = element.children?.map((child, childIndex) =>
      renderMarkdownNode(child as RootContent, childIndex, element.tagName),
    )

    const baseClassMap: Record<string, string> = {
      h1: 'text-3xl font-semibold tracking-tight',
      h2: 'mt-8 text-2xl font-semibold tracking-tight',
      h3: 'mt-6 text-xl font-semibold',
      p: 'leading-relaxed',
      ul: 'ml-5 list-disc space-y-1',
      ol: 'ml-5 list-decimal space-y-1',
      li: 'leading-relaxed',
      blockquote: 'border-l-4 border-primary/40 pl-4 italic',
      hr: 'my-6 border-border',
      table: 'w-full table-auto border-collapse text-sm',
      thead: 'bg-muted/60',
      th: 'border border-muted px-3 py-2 text-left font-semibold',
      td: 'border border-muted px-3 py-2 align-top',
      code:
        parentTag === 'pre' ? '' : 'rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs sm:text-sm',
      a: 'text-primary underline underline-offset-4 hover:text-primary/80',
    }

    const elementClassName = baseClassMap[element.tagName] ?? undefined

    const props: Record<string, unknown> = {}
    const properties = element.properties ?? {}
    const existingClassName = normalizeClassName(properties.className)

    if (element.tagName === 'a') {
      props.target = '_blank'
      props.rel = 'noreferrer'
    }

    props.key = index
    props.className = cn(existingClassName, elementClassName)

    if (element.tagName === 'table') {
      return (
        <div key={index} className="relative overflow-x-auto rounded-lg border">
          <table
            className={cn(
              'w-full min-w-[560px] table-auto border-collapse text-sm',
              existingClassName,
            )}
          >
            {children}
          </table>
        </div>
      )
    }

    if (element.tagName === 'code' && parentTag !== 'pre') {
      const textValue = getTextFromChildren(element.children as RootContent[])
      return (
        <code key={index} className={props.className as string}>
          {textValue}
        </code>
      )
    }

    if (element.tagName === 'hr') {
      return <hr key={index} className={elementClassName} />
    }

    return React.createElement(element.tagName, props, children)
  }

  return null
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const ast = React.useMemo(() => createMarkdownAst(markdown), [markdown])

  if (!ast) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Markdown preview unavailable.
      </div>
    )
  }

  return (
    <div className="markdown-preview flex-1 space-y-4 overflow-y-auto rounded-lg border bg-background/80 p-4 text-sm leading-relaxed text-foreground">
      {ast.children.map((child, index) => (
        <React.Fragment key={index}>{renderMarkdownNode(child, index)}</React.Fragment>
      ))}
    </div>
  )
}

function formatWithCommand(
  command: ToolbarCommand,
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; selection: { start: number; end: number } } | null {
  const before = value.slice(0, selectionStart)
  const after = value.slice(selectionEnd)
  const selected = value.slice(selectionStart, selectionEnd)

  switch (command) {
    case 'bold': {
      const placeholder = selected || 'bold text'
      const formatted = '**' + placeholder + '**'
      const start = selectionStart + 2
      return {
        value: before + formatted + after,
        selection: { start, end: start + placeholder.length },
      }
    }
    case 'italic': {
      const placeholder = selected || 'italic text'
      const formatted = '*' + placeholder + '*'
      const start = selectionStart + 1
      return {
        value: before + formatted + after,
        selection: { start, end: start + placeholder.length },
      }
    }
    case 'code': {
      const placeholder = selected || 'code'
      const formatted = '`' + placeholder + '`'
      const start = selectionStart + 1
      return {
        value: before + formatted + after,
        selection: { start, end: start + placeholder.length },
      }
    }
    case 'link': {
      const placeholder = selected || 'link text'
      const url = 'https://'
      const formatted = '[' + placeholder + '](' + url + ')'
      const start = selectionStart + placeholder.length + 3
      return {
        value: before + formatted + after,
        selection: { start, end: start + url.length },
      }
    }
    case 'heading': {
      const currentLineStart = value.lastIndexOf('\n', selectionStart - 1)
      const insertionPoint = currentLineStart === -1 ? 0 : currentLineStart + 1
      const rest = value.slice(insertionPoint)
      const lineEndIndex = rest.indexOf('\n')
      const nextLineOffset = lineEndIndex === -1 ? value.length : insertionPoint + lineEndIndex
      const line = value.slice(insertionPoint, nextLineOffset).replace(/^#+\s*/, '')
      const formattedLine = '## ' + line
      const newValue = value.slice(0, insertionPoint) + formattedLine + value.slice(nextLineOffset)
      const cursor = insertionPoint + 3
      return { value: newValue, selection: { start: cursor, end: cursor + line.length } }
    }
    case 'bullet': {
      const snippet = selected || 'New item'
      const lines = snippet.split('\n')
      const formattedLines = lines
        .map((line) => {
          const trimmed = line.trim()
          return trimmed ? '- ' + trimmed.replace(/^[-*]\s*/, '') : '- '
        })
        .join('\n')
      const start = selectionStart
      return {
        value: before + formattedLines + after,
        selection: { start, end: start + formattedLines.length },
      }
    }
    default:
      return null
  }
}

function DesignDocProvider({
  projectId,
  context,
  children,
}: {
  projectId: string
  context: { projectName: string; projectSummary?: string; projectFocus?: string }
  children: React.ReactNode
}) {
  const plan = React.useMemo(() => createDesignDocPlan(context), [context])
  const storageKey = React.useMemo(() => `design-doc:${projectId}`, [projectId])
  const [document, setDocument] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        return stored
      }
    }

    return createDesignDocTemplate(plan, context)
  })
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [])
  const [answers, setAnswers] = React.useState<AnswersMap>({})
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0)
  const [isComplete, setIsComplete] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null)

  const introMessage = React.useMemo(() => createIntroMessage(context), [context])

  React.useEffect(() => {
    const firstQuestion = plan[0]?.question({ index: 0, answers: {}, context })
    const intro: ChatMessage[] = [
      { id: createId('assistant'), role: 'assistant', content: introMessage },
    ]

    if (firstQuestion) {
      intro.push({ id: createId('assistant'), role: 'assistant', content: firstQuestion })
    }

    setMessages(intro)
    setCurrentStepIndex(0)
    setAnswers({})
    setIsComplete(false)
    setError(null)
  }, [plan, introMessage, context])

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(storageKey, document)
    setLastSavedAt(new Date())
  }, [document, storageKey])

  const mutation = useMutation({
    mutationFn: ({
      answer,
      stepIndex,
      updatedAnswers,
    }: {
      answer: string
      stepIndex: number
      updatedAnswers: AnswersMap
    }) =>
      mockDesignDocExchange({
        plan,
        stepIndex,
        answer,
        answers: updatedAnswers,
        context,
      }),
  })

  const handleDocumentChange = React.useCallback((value: string) => {
    setDocument(value)
  }, [])

  const submitAnswer = React.useCallback(
    async (input: string) => {
      const trimmed = input.trim()

      if (!trimmed) {
        return
      }

      const step = plan[currentStepIndex]

      if (!step || mutation.isPending) {
        return
      }

      setError(null)

      const userMessage: ChatMessage = {
        id: createId('user'),
        role: 'user',
        content: trimmed,
      }

      setMessages((prev) => [...prev, userMessage])

      const updatedAnswers = { ...answers, [step.key]: trimmed }
      setAnswers(updatedAnswers)

      const addition = step.formatContent({ answer: trimmed, answers: updatedAnswers, context })
      setDocument((prev) => appendSectionContent(prev, plan, step.key, addition))

      try {
        const result = await mutation.mutateAsync({
          answer: trimmed,
          stepIndex: currentStepIndex,
          updatedAnswers,
        })

        const nextMessages: ChatMessage[] = []

        if (result.acknowledgement.trim().length > 0) {
          nextMessages.push({
            id: createId('assistant'),
            role: 'assistant',
            content: result.acknowledgement,
          })
        }

        if (result.nextQuestion && result.nextQuestion.text.trim().length > 0) {
          nextMessages.push({
            id: createId('assistant'),
            role: 'assistant',
            content: result.nextQuestion.text,
          })
        }

        if (result.completion?.trim()) {
          nextMessages.push({
            id: createId('assistant'),
            role: 'assistant',
            content: result.completion.trim(),
          })
        }

        if (nextMessages.length > 0) {
          setMessages((prev) => [...prev, ...nextMessages])
        }

        if (result.nextQuestion) {
          setCurrentStepIndex((prev) => Math.min(prev + 1, plan.length - 1))
        } else {
          setIsComplete(true)
        }
      } catch (err) {
        console.error(err)
        setError('We hit a snag drafting the next prompt. Try again in a moment.')
      }
    },
    [plan, currentStepIndex, mutation, answers, context],
  )

  const contextValue = React.useMemo<DesignDocContextValue>(
    () => ({
      plan,
      document,
      updateDocument: handleDocumentChange,
      messages,
      submitAnswer,
      isProcessing: mutation.isPending,
      isComplete,
      activeStepIndex: currentStepIndex,
      totalSteps: plan.length,
      lastSavedAt,
      error,
      contextDetails: context,
    }),
    [
      plan,
      document,
      handleDocumentChange,
      messages,
      submitAnswer,
      mutation.isPending,
      isComplete,
      currentStepIndex,
      lastSavedAt,
      error,
      context,
    ],
  )

  return <DesignDocContext.Provider value={contextValue}>{children}</DesignDocContext.Provider>
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[90%] rounded-lg px-3 py-2 text-sm shadow-sm transition',
          isAssistant
            ? 'border border-muted bg-card text-foreground'
            : 'bg-primary text-primary-foreground',
        )}
      >
        {message.content.split(/\n{2,}/).map((segment, index) => (
          <p key={index} className={cn('whitespace-pre-line', index > 0 && 'mt-2')}>
            {segment}
          </p>
        ))}
      </div>
    </div>
  )
}

function DesignDocChatPanel({ className }: { className?: string }) {
  const {
    messages,
    submitAnswer,
    isProcessing,
    isComplete,
    plan,
    activeStepIndex,
    totalSteps,
    error,
  } = useDesignDocWorkspace()
  const [inputValue, setInputValue] = React.useState('')
  const endRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing])

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!inputValue.trim()) {
        return
      }

      await submitAnswer(inputValue)
      setInputValue('')
    },
    [inputValue, submitAnswer],
  )

  const currentStep =
    plan[isComplete ? Math.min(activeStepIndex, plan.length - 1) : activeStepIndex]

  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Conversation workspace</CardTitle>
            <CardDescription>
              Guided prompts curate the design brief and feed the document.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/40 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {isProcessing ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg border border-muted bg-card px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking through the next prompt…
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>
              Step {Math.min(activeStepIndex + 1, totalSteps)} of {totalSteps}
            </span>
            {isComplete && (
              <span className="text-emerald-600 dark:text-emerald-400">Initial pass complete</span>
            )}
          </label>
          <textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={
              currentStep
                ? `Share details for “${currentStep.heading}”…`
                : 'Document anything else you want to capture.'
            }
            className="h-32 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={isProcessing}
          />
          <div className="flex items-center justify-between gap-3">
            {error ? <span className="text-xs text-destructive">{error}</span> : <span />}
            <Button
              type="submit"
              size="sm"
              disabled={!inputValue.trim() || isProcessing}
              className="inline-flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <SendHorizonal className="h-4 w-4" />
                  Send answer
                </>
              )}
            </Button>
          </div>
        </form>
        {isComplete ? (
          <p className="text-xs text-muted-foreground">
            All guided questions are answered. Continue editing the document or add more notes here
            anytime.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function MarkdownToolbar({ onCommand }: { onCommand: (command: ToolbarCommand) => void }) {
  const items: Array<{
    command: ToolbarCommand
    label: string
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  }> = [
    { command: 'bold', label: 'Bold', icon: Bold },
    { command: 'italic', label: 'Italic', icon: Italic },
    { command: 'code', label: 'Inline code', icon: Code },
    { command: 'link', label: 'Insert link', icon: Link2 },
    { command: 'heading', label: 'Heading level 2', icon: Heading2 },
    { command: 'bullet', label: 'Bulleted list', icon: List },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
      {items.map((item) => (
        <Button
          key={item.command}
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => onCommand(item.command)}
          aria-label={item.label}
        >
          <item.icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
}

function DesignDocDocumentPanel({
  className,
  layout = 'split',
}: {
  className?: string
  layout?: 'split' | 'stack'
}) {
  const { document, updateDocument, lastSavedAt } = useDesignDocWorkspace()
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const pendingSelectionRef = React.useRef<{ start: number; end: number } | null>(null)

  const handleCommand = React.useCallback(
    (command: ToolbarCommand) => {
      const textarea = textareaRef.current

      if (!textarea) {
        return
      }

      const result = formatWithCommand(
        command,
        document,
        textarea.selectionStart,
        textarea.selectionEnd,
      )

      if (!result) {
        return
      }

      pendingSelectionRef.current = result.selection
      updateDocument(result.value)
    },
    [document, updateDocument],
  )

  React.useEffect(() => {
    if (pendingSelectionRef.current && textareaRef.current) {
      const { start, end } = pendingSelectionRef.current
      requestAnimationFrame(() => {
        if (!textareaRef.current) {
          return
        }

        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(start, end)
        pendingSelectionRef.current = null
      })
    }
  }, [document])

  const savedLabel = React.useMemo(() => {
    if (!lastSavedAt) {
      return 'Just now'
    }

    return lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [lastSavedAt])

  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Design document</CardTitle>
            <CardDescription>
              Edit the markdown blueprint while the chat fills in structure.
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Autosaves locally to this browser.</span>
          <span>Saved {savedLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
        <MarkdownToolbar onCommand={handleCommand} />
        <div
          className={cn(
            'flex flex-1 flex-col gap-4',
            layout === 'split' ? 'md:grid md:grid-cols-2 md:gap-4' : '',
          )}
        >
          <div className="flex min-h-[260px] flex-col">
            <textarea
              ref={textareaRef}
              value={document}
              onChange={(event) => updateDocument(event.target.value)}
              className="h-full min-h-[260px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Start outlining your architecture, flows, and decisions…"
            />
          </div>
          <div className={cn('flex min-h-[260px] flex-col', layout === 'split' ? 'md:mt-0' : '')}>
            <MarkdownPreview markdown={document} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MobileTabs() {
  const [activeTab, setActiveTab] = React.useState<'chat' | 'doc'>('chat')

  return (
    <div className="space-y-3 md:hidden">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={activeTab === 'chat' ? 'default' : 'outline'}
          className="flex items-center justify-center gap-2"
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
        <Button
          type="button"
          variant={activeTab === 'doc' ? 'default' : 'outline'}
          className="flex items-center justify-center gap-2"
          onClick={() => setActiveTab('doc')}
        >
          <FileText className="h-4 w-4" />
          Document
        </Button>
      </div>
      <div className="space-y-4">
        {activeTab === 'chat' ? (
          <DesignDocChatPanel className="min-h-[420px]" />
        ) : (
          <DesignDocDocumentPanel className="min-h-[420px]" layout="stack" />
        )}
      </div>
    </div>
  )
}

function DesignDocWorkspace() {
  return (
    <div className="flex min-h-[600px] flex-1 flex-col gap-4 pb-4">
      <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <DesignDocChatPanel className="min-h-[560px]" />
        <DesignDocDocumentPanel className="min-h-[560px]" />
      </div>
      <MobileTabs />
    </div>
  )
}

export function DashboardDesignDocRoute() {
  const { projectId } = useParams({ from: '/dashboard/$projectId/design-doc' })
  const { activeProject } = useProjects()

  const context = React.useMemo(
    () => ({
      projectName: activeProject?.name ?? 'Untitled project',
      projectSummary: activeProject?.summary ?? '',
      projectFocus: activeProject?.focus ?? '',
    }),
    [activeProject?.name, activeProject?.summary, activeProject?.focus],
  )

  const providerKey = projectId ?? 'demo'

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 px-4 py-6 md:px-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Guided design doc builder
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Design Doc Workshop</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Co-create a detailed design document with structured prompts and a live markdown editor.
          Capture product vision, technical considerations, and launch plans without losing your
          train of thought.
        </p>
      </div>
      <DesignDocProvider projectId={providerKey} context={context} key={providerKey}>
        <DesignDocWorkspace />
      </DesignDocProvider>
    </div>
  )
}
