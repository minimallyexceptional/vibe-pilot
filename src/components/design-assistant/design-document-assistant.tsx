import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type JSX,
} from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowRight,
  BookOpenCheck,
  Bold,
  Code,
  Heading,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  MessageCircle,
  RefreshCw,
  SendHorizontal,
  Split,
  Table as TableIcon,
  TextQuote,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'design-document-assistant-state-v1'

type ActiveTab = 'chat' | 'document'

type PromptStep = {
  id: string
  sectionTitle: string
  questionTemplate: string
  placeholder?: string
  context?: Record<string, { stepId: string; fallback: string }>
  docDescription?: string
  output?: 'paragraph' | 'list' | 'roadmap' | 'risks'
}

type ConversationTurn = {
  stepId: string
  question: string
  answer: string
  sectionTitle: string
}

type DesignAssistantContextValue = {
  conversation: ConversationTurn[]
  promptCount: number
  currentStep: PromptStep | null
  currentQuestion: string | null
  currentPlaceholder?: string
  submitAnswer: (answer: string) => Promise<void>
  isSubmitting: boolean
  document: string
  setDocument: (value: string) => void
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  reset: () => void
  isHydrated: boolean
}

const PROMPT_FLOW: PromptStep[] = [
  {
    id: 'vision',
    sectionTitle: 'Product Vision',
    questionTemplate: 'What is the elevator pitch for your project idea?',
    placeholder:
      'Share the concept, the customer pain it solves, and why the timing is right.' +
      ' Consider including the project name if you have one.',
    docDescription:
      '_Capture the north star narrative so the team can align on what we are building and why now._',
    output: 'paragraph',
  },
  {
    id: 'users',
    sectionTitle: 'Target Audience',
    questionTemplate: 'Who are the primary users or customers for {{projectName}}?',
    placeholder:
      'List your core personas, industries, or segments. Mention their goals or frustrations.',
    context: {
      projectName: { stepId: 'vision', fallback: 'this project' },
    },
    docDescription:
      '_Document the audience so research, design, and GTM decisions stay grounded in real people._',
    output: 'list',
  },
  {
    id: 'value',
    sectionTitle: 'Value Proposition',
    questionTemplate:
      'What unique value does {{projectName}} deliver compared to existing alternatives?',
    placeholder:
      'Highlight differentiators, moments of delight, or measurable outcomes that matter most.',
    context: {
      projectName: { stepId: 'vision', fallback: 'this project' },
    },
    docDescription:
      '_Spell out why teams should invest in this over other initiatives and what success looks like._',
    output: 'paragraph',
  },
  {
    id: 'tech',
    sectionTitle: 'Tech Stack & Integrations',
    questionTemplate: 'What technologies or platforms will power the first release?',
    placeholder:
      'Include front-end frameworks, backend services, infra tooling, and any critical integrations.',
    docDescription:
      '_Keep this high-level but specific enough that engineering, data, and security stakeholders can react._',
    output: 'list',
  },
  {
    id: 'architecture',
    sectionTitle: 'System Architecture Highlights',
    questionTemplate:
      'Walk me through the key architectural decisions or data flow for {{projectName}}.',
    placeholder:
      'Outline domains, services, data stores, and how information travels across the system.',
    context: {
      projectName: { stepId: 'vision', fallback: 'the project' },
    },
    docDescription:
      '_Capture the structural bets, integration boundaries, and any areas that need design spikes._',
    output: 'paragraph',
  },
  {
    id: 'roadmap',
    sectionTitle: 'Milestones & Roadmap',
    questionTemplate:
      'Outline the major milestones we need to hit to ship the first compelling release of {{projectName}}.',
    placeholder:
      'Example: MVP ready | 2 weeks, Private beta | 4 weeks, Public launch | 8 weeks, Post-launch instrumentation.',
    context: {
      projectName: { stepId: 'vision', fallback: 'the project' },
    },
    docDescription:
      '_Translate ambition into phased outcomes with rough timelines so resourcing conversations are grounded._',
    output: 'roadmap',
  },
  {
    id: 'risks',
    sectionTitle: 'Risks & Open Questions',
    questionTemplate: 'What are the biggest risks, assumptions, or unknowns we should track?',
    placeholder:
      'Think about technical blockers, user adoption hurdles, compliance, or success metrics that need validation.',
    docDescription:
      '_Call out the dragons early so we can assign owners, pilots, or experiments to learn fast._',
    output: 'risks',
  },
]

const BASE_DOCUMENT = `# Product Design Document\n\n> Generated with the Design Document Assistant. Use the markdown editor to refine the plan as you collaborate.\n`

const DesignAssistantContext = createContext<DesignAssistantContextValue | undefined>(undefined)

function useDesignAssistant() {
  const context = useContext(DesignAssistantContext)

  if (!context) {
    throw new Error('useDesignAssistant must be used within DesignAssistantProvider')
  }

  return context
}

function buildAnswersMap(conversation: ConversationTurn[]) {
  return conversation.reduce<Record<string, string>>((acc, turn) => {
    acc[turn.stepId] = turn.answer
    return acc
  }, {})
}

function defaultSnapshot() {
  return buildSnapshotSection({})
}

function buildDocumentFromConversation(conversation: ConversationTurn[]) {
  const answers = buildAnswersMap(conversation)
  let next = upsertSection(BASE_DOCUMENT, 'Project Snapshot', buildSnapshotSection(answers), {
    position: 'top',
  })

  for (const turn of conversation) {
    const step = PROMPT_FLOW.find((item) => item.id === turn.stepId)

    if (!step) continue

    const formatted = formatAnswer(step, turn.answer)
    next = upsertSection(next, step.sectionTitle, formatted, {
      description: step.docDescription,
    })
  }

  return next
}

function DesignAssistantProvider({ children }: { children: ReactNode }) {
  const [conversation, setConversation] = useState<ConversationTurn[]>([])
  const [document, setDocument] = useState<string>(() =>
    upsertSection(BASE_DOCUMENT, 'Project Snapshot', defaultSnapshot(), {
      position: 'top',
    }),
  )
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat')
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const storedRaw = window.localStorage.getItem(STORAGE_KEY)

      if (!storedRaw) {
        setIsHydrated(true)
        return
      }

      const parsed = JSON.parse(storedRaw) as {
        conversation?: ConversationTurn[]
        document?: string
        activeTab?: ActiveTab
      } | null

      if (parsed) {
        if (Array.isArray(parsed.conversation)) {
          setConversation(parsed.conversation)
        }

        if (typeof parsed.document === 'string' && parsed.document.trim().length) {
          setDocument(parsed.document)
        } else if (Array.isArray(parsed.conversation)) {
          setDocument(buildDocumentFromConversation(parsed.conversation))
        }

        if (parsed.activeTab === 'chat' || parsed.activeTab === 'document') {
          setActiveTab(parsed.activeTab)
        }
      }
    } catch (error) {
      console.warn('Failed to restore design assistant state', error)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return

    const payload = JSON.stringify({
      conversation,
      document,
      activeTab,
    })

    window.localStorage.setItem(STORAGE_KEY, payload)
  }, [conversation, document, activeTab, isHydrated])

  const answers = useMemo(() => buildAnswersMap(conversation), [conversation])
  const currentStep = useMemo(() => PROMPT_FLOW[conversation.length] ?? null, [conversation])

  const currentQuestion = useMemo(() => {
    if (!currentStep) return null
    return resolveTemplate(currentStep.questionTemplate, currentStep.context, answers)
  }, [answers, currentStep])

  const promptCount = PROMPT_FLOW.length

  const reset = useCallback(() => {
    setConversation([])
    setDocument(
      upsertSection(BASE_DOCUMENT, 'Project Snapshot', defaultSnapshot(), {
        position: 'top',
      }),
    )
    setActiveTab('chat')
  }, [])

  const mutation = useMutation({
    mutationFn: async ({ answer, question }: { answer: string; question: string }) => {
      if (!currentStep) {
        return null
      }

      const trimmedAnswer = answer.trim()

      await new Promise((resolve) => setTimeout(resolve, 420))

      const nextConversationEntry: ConversationTurn = {
        stepId: currentStep.id,
        question,
        answer: trimmedAnswer,
        sectionTitle: currentStep.sectionTitle,
      }

      const nextConversation = [...conversation, nextConversationEntry]
      const nextAnswers = { ...answers, [currentStep.id]: trimmedAnswer }

      let updatedDocument = document

      updatedDocument = upsertSection(
        updatedDocument,
        'Project Snapshot',
        buildSnapshotSection(nextAnswers),
        { position: 'top' },
      )

      const sectionContent = formatAnswer(currentStep, trimmedAnswer)
      updatedDocument = upsertSection(updatedDocument, currentStep.sectionTitle, sectionContent, {
        description: currentStep.docDescription,
      })

      return {
        conversation: nextConversation,
        document: updatedDocument,
      }
    },
    onSuccess: (result) => {
      if (!result) return

      setConversation(result.conversation)
      setDocument(result.document)
      setActiveTab('document')
    },
  })

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!currentStep || !currentQuestion) return

      await mutation.mutateAsync({ answer, question: currentQuestion })
    },
    [currentQuestion, currentStep, mutation],
  )

  const value = useMemo<DesignAssistantContextValue>(
    () => ({
      conversation,
      promptCount,
      currentStep,
      currentQuestion,
      currentPlaceholder: currentStep?.placeholder,
      submitAnswer,
      isSubmitting: mutation.isPending,
      document,
      setDocument,
      activeTab,
      setActiveTab,
      reset,
      isHydrated,
    }),
    [
      conversation,
      promptCount,
      currentStep,
      currentQuestion,
      submitAnswer,
      mutation.isPending,
      document,
      activeTab,
      reset,
      isHydrated,
    ],
  )

  return <DesignAssistantContext.Provider value={value}>{children}</DesignAssistantContext.Provider>
}

export function DesignDocumentAssistant() {
  return (
    <DesignAssistantProvider>
      <DesignAssistantShell />
    </DesignAssistantProvider>
  )
}

function DesignAssistantShell() {
  const { activeTab } = useDesignAssistant()

  return (
    <div className="flex h-full min-h-[640px] w-full flex-col gap-6 md:min-h-[720px]">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Split className="h-4 w-4" />
          Guided design plan generator
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
          Product Design Document Assistant
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Pair an interview-style chat with a live-synced markdown workspace. Answer the
          assistant&apos;s prompts and watch your project brief take shape instantly on the right.
        </p>
      </header>

      <div className="md:hidden">
        <MobileTabNavigation />
      </div>

      <div className="hidden gap-6 md:grid md:grid-cols-2">
        <CardSurface>
          <ChatPanel />
        </CardSurface>
        <CardSurface>
          <DocumentPanel />
        </CardSurface>
      </div>

      <div className="md:hidden">
        <div hidden={activeTab !== 'chat'}>
          <CardSurface>
            <ChatPanel />
          </CardSurface>
        </div>
        <div hidden={activeTab !== 'document'}>
          <CardSurface>
            <DocumentPanel />
          </CardSurface>
        </div>
      </div>
    </div>
  )
}

function MobileTabNavigation() {
  const { activeTab, setActiveTab, conversation, promptCount } = useDesignAssistant()

  return (
    <div className="rounded-xl border border-border bg-card p-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span>
          {conversation.length}/{promptCount}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
            activeTab === 'chat'
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
          )}
          onClick={() => setActiveTab('chat')}
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </button>
        <button
          type="button"
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
            activeTab === 'document'
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
          )}
          onClick={() => setActiveTab('document')}
        >
          <BookOpenCheck className="h-4 w-4" />
          Document
        </button>
      </div>
    </div>
  )
}

function CardSurface({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-sm">
      {children}
    </div>
  )
}

function ChatPanel() {
  const {
    conversation,
    promptCount,
    currentQuestion,
    currentPlaceholder,
    submitAnswer,
    isSubmitting,
    reset,
  } = useDesignAssistant()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [conversation, isSubmitting])

  const progress = (conversation.length / promptCount) * 100

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()

      if (!draft.trim() || !currentQuestion) return

      await submitAnswer(draft)
      setDraft('')
    },
    [draft, submitAnswer, currentQuestion],
  )

  const isComplete = !currentQuestion

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Discovery chat</h2>
          <p className="text-sm text-muted-foreground">
            Answer structured prompts and we&apos;ll fold them into the design doc automatically.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} disabled={!conversation.length}>
          <RefreshCw className="mr-2 h-4 w-4" /> Reset
        </Button>
      </div>

      <div className="px-6 pt-4">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>Progress</span>
          <span>
            {conversation.length}/{promptCount} sections
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-4">
        {conversation.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            <MessageCircle className="mb-3 h-6 w-6" />
            Kick things off by answering the first prompt below. Your notes instantly populate the
            design document.
          </div>
        ) : (
          conversation.map((turn, index) => (
            <div
              key={`${turn.stepId}-${index}`}
              className="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Assistant prompt
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {turn.question}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Your answer
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {turn.answer || '—'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border bg-muted/40 px-6 py-4">
        {isComplete ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-foreground">
            <div className="flex items-center gap-2 font-medium">
              <BookOpenCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
              You&apos;ve answered every prompt!
            </div>
            <p className="text-muted-foreground">
              Review or edit the document, or reset the flow to explore a fresh angle.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm font-medium text-foreground">Next question</label>
            <div className="rounded-xl border border-border bg-background p-3 shadow-sm">
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {currentQuestion}
              </p>
            </div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={currentPlaceholder}
              className="h-32 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                We&apos;ll automatically update the relevant section of the design document after
                you submit.
              </p>
              <Button type="submit" disabled={isSubmitting || !draft.trim()}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <SendHorizontal className="h-4 w-4" />
                    Submit answer
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function DocumentPanel() {
  const { document, setDocument, isHydrated } = useDesignAssistant()
  const [localValue, setLocalValue] = useState(document)

  useEffect(() => {
    if (document !== localValue) {
      setLocalValue(document)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document])

  const handleChange = useCallback(
    (value: string) => {
      setLocalValue(value)
      setDocument(value)
    },
    [setDocument],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Design document</h2>
          <p className="text-sm text-muted-foreground">
            Edit, reorder, and expand the plan. Changes persist locally as you type.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          Auto-saved
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-6 py-4">
        <DesignMarkdownEditor value={localValue} onChange={handleChange} disabled={!isHydrated} />
      </div>
    </div>
  )
}

type DesignMarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'heading'
  | 'ordered-list'
  | 'unordered-list'
  | 'link'
  | 'code-block'
  | 'inline-code'
  | 'blockquote'
  | 'table'

function DesignMarkdownEditor({ value, onChange, disabled }: DesignMarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const applyFormatting = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current

      if (!textarea || disabled) return

      const { selectionStart, selectionEnd, value: current } = textarea
      const selected = current.slice(selectionStart, selectionEnd)
      let nextValue = current
      let selectionReplacement = ''
      let cursorStart = selectionStart
      let cursorEnd = selectionEnd

      const insert = (text: string) => {
        nextValue = current.slice(0, selectionStart) + text + current.slice(selectionEnd)
        cursorStart = selectionStart
        cursorEnd = selectionStart + text.length
      }

      switch (action) {
        case 'bold': {
          const content = selected || 'strong insight'
          selectionReplacement = `**${content}**`
          insert(selectionReplacement)
          cursorStart += 2
          cursorEnd = cursorStart + content.length
          break
        }
        case 'italic': {
          const content = selected || 'emphasis'
          selectionReplacement = `*${content}*`
          insert(selectionReplacement)
          cursorStart += 1
          cursorEnd = cursorStart + content.length
          break
        }
        case 'heading': {
          const content = selected || 'Section title'
          selectionReplacement = `\n## ${content}\n`
          insert(selectionReplacement)
          cursorStart = selectionStart + 4
          cursorEnd = cursorStart + content.length
          break
        }
        case 'ordered-list': {
          const content = selected || 'First item\nSecond item'
          const items = content
            .split(/\n+/)
            .map((line, index) => `${index + 1}. ${line.trim() || `Item ${index + 1}`}`)
          selectionReplacement = items.join('\n')
          insert(selectionReplacement)
          cursorEnd = cursorStart + selectionReplacement.length
          break
        }
        case 'unordered-list': {
          const content = selected || 'Key idea\nSupporting detail'
          const items = content.split(/\n+/).map((line) => `- ${line.trim() || 'List item'}`)
          selectionReplacement = items.join('\n')
          insert(selectionReplacement)
          cursorEnd = cursorStart + selectionReplacement.length
          break
        }
        case 'link': {
          const content = selected || 'Read more'
          selectionReplacement = `[${content}](https://)`
          insert(selectionReplacement)
          cursorStart += 1
          cursorEnd = cursorStart + content.length
          break
        }
        case 'code-block': {
          const content = selected || 'const example = true;'
          const fenced = ['```ts', content, '```'].join('\n')
          selectionReplacement = `\n\n${fenced}\n`
          insert(selectionReplacement)
          cursorStart = selectionStart + 6
          cursorEnd = cursorStart + content.length
          break
        }
        case 'inline-code': {
          const content = selected || 'inline'
          selectionReplacement = `\`${content}\``
          insert(selectionReplacement)
          cursorStart += 1
          cursorEnd = cursorStart + content.length
          break
        }
        case 'blockquote': {
          const content = selected || 'Call out a guiding principle or user quote.'
          const lines = content.split(/\n+/).map((line) => `> ${line.trim()}`)
          selectionReplacement = lines.join('\n')
          insert(selectionReplacement)
          cursorEnd = cursorStart + selectionReplacement.length
          break
        }
        case 'table': {
          const content =
            selected ||
            '| Stage | Owner | Notes |\n| :-- | :-- | :-- |\n| Discovery | Product | Outline research questions |'
          selectionReplacement = content
          insert(selectionReplacement)
          cursorEnd = cursorStart + selectionReplacement.length
          break
        }
        default:
          break
      }

      if (nextValue !== current) {
        onChange(nextValue)

        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(cursorStart, cursorEnd)
        })
      }
    },
    [disabled, onChange],
  )

  const rendered = useMemo(() => renderMarkdown(value), [value])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/80 p-2 shadow-sm">
        <ToolbarButton icon={Bold} label="Bold" onClick={() => applyFormatting('bold')} />
        <ToolbarButton icon={Italic} label="Italic" onClick={() => applyFormatting('italic')} />
        <ToolbarButton icon={Heading} label="Heading" onClick={() => applyFormatting('heading')} />
        <ToolbarButton
          icon={ListOrdered}
          label="Numbered list"
          onClick={() => applyFormatting('ordered-list')}
        />
        <ToolbarButton
          icon={List}
          label="Bullet list"
          onClick={() => applyFormatting('unordered-list')}
        />
        <ToolbarButton icon={LinkIcon} label="Link" onClick={() => applyFormatting('link')} />
        <ToolbarButton
          icon={Code}
          label="Code block"
          onClick={() => applyFormatting('code-block')}
        />
        <ToolbarButton
          icon={Split}
          label="Inline code"
          onClick={() => applyFormatting('inline-code')}
        />
        <ToolbarButton
          icon={TextQuote}
          label="Blockquote"
          onClick={() => applyFormatting('blockquote')}
        />
        <ToolbarButton icon={TableIcon} label="Table" onClick={() => applyFormatting('table')} />
      </div>

      <div className="grid flex-1 gap-4 md:grid-cols-2">
        <div className="flex h-full flex-col">
          <label className="mb-2 text-sm font-medium text-muted-foreground">Markdown source</label>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="h-full min-h-[200px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm leading-relaxed text-foreground shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          />
        </div>
        <div className="flex h-full flex-col">
          <label className="mb-2 text-sm font-medium text-muted-foreground">Live preview</label>
          <div className="markdown-preview h-full min-h-[200px] w-full overflow-y-auto rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground shadow-inner">
            {rendered}
          </div>
        </div>
      </div>
    </div>
  )
}

type ToolbarButtonProps = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}

function ToolbarButton({ icon: IconComponent, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg border border-transparent bg-muted px-2 py-1 text-xs font-medium text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
    >
      <IconComponent className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}

type BlockNode =
  | { type: 'heading'; level: number; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; language?: string; content: string }
  | { type: 'blockquote'; content: string }
  | { type: 'table'; header: string[]; align: Array<'left' | 'center' | 'right'>; rows: string[][] }
  | { type: 'hr' }

function renderMarkdown(markdown: string): ReactNode {
  const blocks = parseMarkdown(markdown)

  if (!blocks.length) {
    return (
      <p className="text-sm text-muted-foreground">Start adding notes to build out the plan.</p>
    )
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading': {
            const HeadingTag = `h${Math.min(block.level, 6)}` as keyof JSX.IntrinsicElements
            const headingClass =
              block.level === 1
                ? 'scroll-m-20 text-2xl font-semibold tracking-tight'
                : block.level === 2
                  ? 'scroll-m-20 text-xl font-semibold tracking-tight'
                  : 'scroll-m-20 text-lg font-semibold tracking-tight'

            return (
              <HeadingTag key={`heading-${index}`} className={headingClass}>
                {renderInline(block.content)}
              </HeadingTag>
            )
          }
          case 'paragraph': {
            return (
              <p key={`paragraph-${index}`} className="leading-7 text-foreground">
                {renderInline(block.content)}
              </p>
            )
          }
          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul'
            return (
              <ListTag
                key={`list-${index}`}
                className={cn(
                  'ml-5 space-y-1 text-foreground',
                  block.ordered ? 'list-decimal' : 'list-disc',
                )}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`list-${index}-${itemIndex}`} className="leading-7">
                    {renderInline(item)}
                  </li>
                ))}
              </ListTag>
            )
          }
          case 'code': {
            return (
              <pre
                key={`code-${index}`}
                className="overflow-x-auto rounded-xl bg-muted px-4 py-3 text-sm text-foreground"
              >
                <code className="block whitespace-pre text-sm text-foreground">
                  {highlightCode(block.content, block.language)}
                </code>
              </pre>
            )
          }
          case 'blockquote': {
            return (
              <blockquote
                key={`quote-${index}`}
                className="border-l-4 border-primary/50 bg-primary/5 px-4 py-2 text-sm italic text-foreground"
              >
                {renderInline(block.content)}
              </blockquote>
            )
          }
          case 'table': {
            return (
              <div key={`table-${index}`} className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted">
                      {block.header.map((cell, cellIndex) => (
                        <th
                          key={`head-${index}-${cellIndex}`}
                          className={cn(
                            'border border-border px-3 py-2 text-left font-medium text-foreground',
                            block.align[cellIndex] === 'center'
                              ? 'text-center'
                              : block.align[cellIndex] === 'right'
                                ? 'text-right'
                                : 'text-left',
                          )}
                        >
                          {renderInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr
                        key={`row-${index}-${rowIndex}`}
                        className="odd:bg-background even:bg-muted/40"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={`cell-${index}-${rowIndex}-${cellIndex}`}
                            className={cn(
                              'border border-border px-3 py-2 text-sm text-foreground',
                              block.align[cellIndex] === 'center'
                                ? 'text-center'
                                : block.align[cellIndex] === 'right'
                                  ? 'text-right'
                                  : 'text-left',
                            )}
                          >
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          case 'hr': {
            return <hr key={`hr-${index}`} className="border-border" />
          }
          default:
            return null
        }
      })}
    </div>
  )
}

function parseMarkdown(markdown: string): BlockNode[] {
  const normalized = markdown.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const blocks: BlockNode[] = []
  let index = 0

  const isTableLine = (line: string) => /\|/.test(line)

  const isListLine = (line: string) => /^(\s*)(?:[-*+]\s+|\d+\.\s+)/.test(line)

  const isHeadingLine = (line: string) => /^#{1,6}\s/.test(line)

  const isBlockquote = (line: string) => /^>\s?/.test(line)

  const isCodeFence = (line: string) => /^```/.test(line.trim())

  const isHr = (line: string) => /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)

  const collectParagraph = () => {
    const paragraphLines: string[] = []

    while (index < lines.length) {
      const current = lines[index]

      if (!current.trim()) break
      if (isHeadingLine(current) || isListLine(current) || isBlockquote(current)) break
      if (isCodeFence(current) || isTableLine(current) || isHr(current)) break

      paragraphLines.push(current)
      index += 1
    }

    const content = paragraphLines.join(' ').trim()

    if (content) {
      blocks.push({ type: 'paragraph', content })
    }
  }

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    if (isHeadingLine(line)) {
      const level = line.match(/^#{1,6}/)?.[0].length ?? 1
      const content = line.replace(/^#{1,6}\s*/, '').trim()
      blocks.push({ type: 'heading', level, content })
      index += 1
      continue
    }

    if (isCodeFence(line)) {
      const language = line.replace(/^```/, '').trim() || undefined
      index += 1
      const codeLines: string[] = []

      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index])
        index += 1
      }

      if (index < lines.length && /^```/.test(lines[index].trim())) {
        index += 1
      }

      blocks.push({ type: 'code', language, content: codeLines.join('\n') })
      continue
    }

    if (isHr(line)) {
      blocks.push({ type: 'hr' })
      index += 1
      continue
    }

    if (isBlockquote(line)) {
      const quoteLines: string[] = []

      while (index < lines.length && isBlockquote(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }

      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') })
      continue
    }

    if (isListLine(line)) {
      const items: string[] = []
      const ordered = /^\s*\d+\.\s/.test(line)

      while (index < lines.length && isListLine(lines[index])) {
        const current = lines[index]
        const sanitized = current.replace(/^(\s*)(?:[-*+]|\d+\.)\s+/, '')
        items.push(sanitized)
        index += 1
      }

      blocks.push({ type: 'list', ordered, items })
      continue
    }

    if (isTableLine(line)) {
      const headerLine = line
      const alignLine = lines[index + 1]

      if (alignLine && /\|/.test(alignLine) && /-{3,}/.test(alignLine)) {
        const header = splitTableRow(headerLine)
        const align = parseAlignmentRow(alignLine, header.length)
        index += 2
        const rows: string[][] = []

        while (index < lines.length && /\|/.test(lines[index])) {
          const rowLine = lines[index]
          if (!rowLine.trim()) break
          rows.push(splitTableRow(rowLine))
          index += 1
        }

        blocks.push({ type: 'table', header, align, rows })
        continue
      }
    }

    collectParagraph()
  }

  return blocks
}

function splitTableRow(row: string) {
  const trimmed = row.trim().replace(/^\||\|$/g, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function parseAlignmentRow(row: string, cellCount: number): Array<'left' | 'center' | 'right'> {
  const trimmed = row.trim().replace(/^\||\|$/g, '')
  const cells = trimmed.split('|').map((cell) => cell.trim())
  const alignments: Array<'left' | 'center' | 'right'> = []

  for (let index = 0; index < cellCount; index += 1) {
    const cell = cells[index] ?? ''
    if (/^:-+:$/.test(cell)) alignments.push('center')
    else if (/^-+:$/.test(cell)) alignments.push('right')
    else alignments.push('left')
  }

  return alignments
}

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g

function renderInline(text: string): ReactNode[] {
  INLINE_PATTERN.lastIndex = 0
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]

    if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${match.index}-bold`} className="font-semibold">
          {renderInline(token.slice(2, -2))}
        </strong>,
      )
    } else if (token.startsWith('*')) {
      nodes.push(
        <em key={`${match.index}-italic`} className="italic">
          {renderInline(token.slice(1, -1))}
        </em>,
      )
    } else if (token.startsWith('~~')) {
      nodes.push(
        <span key={`${match.index}-strike`} className="line-through">
          {renderInline(token.slice(2, -2))}
        </span>,
      )
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`${match.index}-code`}
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
        >
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('[')) {
      const [label, href] = extractLinkParts(token)
      nodes.push(
        <a
          key={`${match.index}-link`}
          href={href}
          className="font-medium text-primary underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {label}
        </a>,
      )
    }

    lastIndex = (match.index ?? 0) + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function extractLinkParts(token: string): [string, string] {
  const match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)

  if (!match) {
    return [token, '#']
  }

  return [match[1], match[2]]
}

function highlightCode(code: string, language?: string): ReactNode {
  if (!language) {
    return <>{code}</>
  }

  if (language === 'json') {
    try {
      const parsed = JSON.parse(code)
      return <span>{JSON.stringify(parsed, null, 2)}</span>
    } catch {
      return <>{code}</>
    }
  }

  if (['js', 'javascript', 'ts', 'typescript'].includes(language)) {
    const keywordPattern =
      /\b(const|let|var|function|return|if|else|class|interface|type|extends|implements|new|async|await|throw|try|catch|finally|switch|case|break|continue|import|from|export|default)\b/g
    const stringPattern = /(['"])((?:\\.|(?!\1).)*)\1/g
    const tokens: ReactNode[] = []
    let lastIndex = 0

    const highlightStrings = (input: string) => {
      stringPattern.lastIndex = 0
      const pieces: ReactNode[] = []
      let cursor = 0
      let match: RegExpExecArray | null

      while ((match = stringPattern.exec(input)) !== null) {
        if (match.index > cursor) {
          pieces.push(input.slice(cursor, match.index))
        }
        pieces.push(
          <span key={`string-${match.index}`} className="text-amber-500">
            {match[0]}
          </span>,
        )
        cursor = match.index + match[0].length
      }

      if (cursor < input.length) {
        pieces.push(input.slice(cursor))
      }

      return pieces
    }

    let match: RegExpExecArray | null

    while ((match = keywordPattern.exec(code)) !== null) {
      if (match.index > lastIndex) {
        const segment = code.slice(lastIndex, match.index)
        tokens.push(...highlightStrings(segment))
      }

      tokens.push(
        <span key={`keyword-${match.index}`} className="text-sky-500">
          {match[0]}
        </span>,
      )

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < code.length) {
      const segment = code.slice(lastIndex)
      tokens.push(...highlightStrings(segment))
    }

    return <>{tokens}</>
  }

  return <>{code}</>
}

function resolveTemplate(
  template: string,
  context: PromptStep['context'],
  answers: Record<string, string>,
) {
  if (!context) return template

  return template.replace(/{{(.*?)}}/g, (match, rawKey: string) => {
    const key = rawKey.trim()
    const mapping = context[key]

    if (!mapping) return match

    const value = answers[mapping.stepId]

    if (!value) return mapping.fallback

    const firstLine = value.split('\n')[0]?.trim() ?? mapping.fallback

    return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine
  })
}

function formatAnswer(step: PromptStep, answer: string): string {
  const trimmed = answer.trim()

  if (!trimmed) {
    return '_Pending more detail._'
  }

  switch (step.output) {
    case 'list':
      return convertToMarkdownList(trimmed)
    case 'roadmap':
      return buildRoadmapTable(trimmed)
    case 'risks':
      return convertToMarkdownList(trimmed, { emphasiseRisk: true })
    default:
      return trimmed
  }
}

function convertToMarkdownList(input: string, options?: { emphasiseRisk?: boolean }) {
  const segments = input
    .split(/\n+|,/) // allow comma separated or newline separated
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (!segments.length) {
    return '_Pending more detail._'
  }

  return segments
    .map((segment) => {
      const content = options?.emphasiseRisk ? segment.replace(/^(\w+)/, '**$1**') : segment
      return `- ${content}`
    })
    .join('\n')
}

function buildRoadmapTable(input: string) {
  const rows = input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes('|')) {
        const parts = line.split('|').map((part) => part.trim())
        return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? '']
      }

      const segments = line.split(/\s?[-–]\s?/)

      if (segments.length >= 2) {
        return [segments[0] ?? '', segments[1] ?? '', segments.slice(2).join(' - ')]
      }

      return [line, 'TBD', '']
    })

  if (!rows.length) {
    return '_Add the milestones you plan to ship._'
  }

  return (
    ['| Milestone | Timeline | Notes |', '| :-- | :-- | :-- |'].join('\n') +
    '\n' +
    rows.map((row) => `| ${row[0]} | ${row[1]} | ${row[2] ?? ''} |`).join('\n')
  )
}

function buildSnapshotSection(answers: Record<string, string>) {
  const project = shortenSummary(answers['vision']) || 'Define the high-level concept.'
  const audience = summarizeList(answers['users']) || 'Highlight the target personas.'
  const value = shortenSummary(answers['value']) || 'Explain the core value proposition.'
  const stack = summarizeList(answers['tech']) || 'Note the technologies and integrations.'
  const nextMilestone =
    extractNextMilestone(answers['roadmap']) || 'Outline the next tangible checkpoint.'

  const rows = [
    ['Project', project],
    ['Primary users', audience],
    ['Value proposition', value],
    ['Tech stack', stack],
    ['Next milestone', nextMilestone],
  ]

  const header = '| Key | Details |'
  const separator = '| :-- | :-- |'
  const body = rows.map((row) => `| ${row[0]} | ${row[1]} |`).join('\n')

  return `${header}\n${separator}\n${body}`
}

function shortenSummary(value?: string) {
  if (!value) return ''
  const firstLine = value.trim().split('\n')[0] ?? ''
  const trimmed = firstLine.trim()
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed
}

function summarizeList(value?: string) {
  if (!value) return ''
  const parts = value
    .split(/\n+|,/) // newline or comma separated
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (!parts.length) return ''

  return parts.slice(0, 3).join(', ')
}

function extractNextMilestone(value?: string) {
  if (!value) return ''
  const firstRow = value.split('\n').find((line) => line.trim().length > 0)

  if (!firstRow) return ''

  if (firstRow.includes('|')) {
    const [, timeline] = firstRow.split('|').map((segment) => segment.trim())
    return timeline || firstRow.trim()
  }

  const segments = firstRow.split(/\s?[-–]\s?/)
  return segments[0]?.trim() ?? firstRow.trim()
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function upsertSection(
  markdown: string,
  sectionTitle: string,
  body: string,
  options?: { description?: string; position?: 'top' | 'bottom' },
) {
  const normalized = markdown.replace(/\r\n/g, '\n')
  const heading = `## ${sectionTitle}`
  const description = options?.description?.trim() ?? ''
  const contentBody = body.trim() || '_Pending more detail._'

  const newSection = [heading, '', description ? `${description}\n` : '', contentBody, '']
    .filter((segment) => segment !== '')
    .join('\n')

  const sectionPattern = new RegExp(
    String.raw`(^|\n)## ${escapeRegExp(sectionTitle)}[\s\S]*?(?=\n## |$)`,
    'm',
  )

  if (sectionPattern.test(normalized)) {
    return normalized.replace(sectionPattern, `\n${newSection}`)
  }

  if (options?.position === 'top') {
    const parts = normalized.split('\n')
    const titleLine = parts[0] ?? ''
    const remaining = parts.slice(1).join('\n').trim()
    const composed = [titleLine, '', newSection, remaining]
      .filter((segment) => segment && segment.trim().length)
      .join('\n\n')

    return composed
  }

  const trimmed = normalized.trimEnd()
  const appended = `${trimmed}\n\n${newSection}`

  return appended.replace(/\n{3,}/g, '\n\n')
}
