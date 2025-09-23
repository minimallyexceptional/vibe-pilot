import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { micromark } from 'micromark'
import { gfm, gfmHtml } from 'micromark-extension-gfm'
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCcw,
  Send,
  Sparkles,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useProjects } from '@/lib/projects'

const STORAGE_KEY = 'nightshift.design-doc-assistant.v1'

const gfmExtensions = gfm()
const gfmHtmlExtensions = gfmHtml()

const SAVE_DEBOUNCE_MS = 500

const questionFlow = [
  {
    id: 'projectName',
    label: 'project title',
    prompt: "Let's start with a working name or codename for this initiative.",
    hint: 'If you have multiple candidates, list them and we will pick the best fit together.',
  },
  {
    id: 'projectGoal',
    label: 'vision & opportunity',
    prompt:
      'In a couple of sentences, what core problem or opportunity are you tackling and what spark makes this project worth pursuing?',
    hint: 'Think about the strategic bet, the customer pain, or the inspiration behind the project.',
  },
  {
    id: 'targetUsers',
    label: 'target audience',
    prompt:
      'Who are the primary users or customers? Describe their pains, motivations, and contexts.',
    hint: 'Call out distinct segments or personas that matter.',
  },
  {
    id: 'keyFeatures',
    label: 'signature experiences',
    prompt:
      'List the signature workflows or features you envision shipping first. Bullet points or rough stories are perfect.',
    hint: 'Use one bullet per feature or milestone experience.',
  },
  {
    id: 'techConsiderations',
    label: 'tech stack',
    prompt: 'What platforms, integrations, or architectural decisions feel right for this project?',
    hint: 'Mention front-end, back-end, data, and any external APIs you expect to lean on.',
  },
  {
    id: 'userJourney',
    label: 'happy path journey',
    prompt: 'Walk me through a happy-path flow. How does a user go from problem to value?',
    hint: 'Think through 4-6 beats that outline the core experience.',
  },
  {
    id: 'roadmap',
    label: 'release roadmap',
    prompt:
      'Sketch the milestone roadmap. What phases or releases do you see and what lands in each?',
    hint: 'Call out target dates or relative timeframes if you have them.',
  },
  {
    id: 'successMetrics',
    label: 'success metrics',
    prompt: 'Which signals, metrics, or guardrails will tell us we are winning?',
    hint: 'Blend quantitative goals with leading indicators and qualitative signals.',
  },
  {
    id: 'risks',
    label: 'risks & questions',
    prompt: 'Any risks, dependencies, or open questions we should spotlight?',
    hint: 'Capture research gaps, partner dependencies, or make/break assumptions.',
  },
] as const

type DesignDocQuestion = (typeof questionFlow)[number]

type DesignDocOutline = {
  projectName: string
  projectGoal: string
  targetUsers: string
  keyFeatures: string
  techConsiderations: string
  userJourney: string
  roadmap: string
  successMetrics: string
  risks: string
}

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

type DesignDocState = {
  outline: DesignDocOutline
  document: string
  messages: ChatMessage[]
  currentQuestionIndex: number
  lastSavedAt: string | null
}

type MutationInput = {
  answer: string
  questionIndex: number
  outline: DesignDocOutline
}

type DesignDocContextValue = {
  outline: DesignDocOutline
  document: string
  messages: ChatMessage[]
  currentQuestionIndex: number
  totalQuestions: number
  lastSavedAt: string | null
  isSaving: boolean
  isProcessing: boolean
  answeredCount: number
  sendAnswer: (value: string) => void
  updateDocument: (value: string) => void
  reset: () => void
}

const DesignDocContext = React.createContext<DesignDocContextValue | null>(null)

function useDesignDocContext() {
  const context = React.useContext(DesignDocContext)

  if (!context) {
    throw new Error('useDesignDocContext must be used within a DesignDocProvider')
  }

  return context
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function toListItems(input: string) {
  const trimmed = input.trim()

  if (!trimmed) {
    return []
  }

  const newlineSegments = trimmed
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[\s>*-•]+/, '').trim())
    .filter(Boolean)

  if (newlineSegments.length > 1) {
    return newlineSegments
  }

  const bulletSegments = trimmed
    .split(/[•\u2022]/)
    .map((item) => item.replace(/^[\s>*-]+/, '').trim())
    .filter(Boolean)

  if (bulletSegments.length > 1) {
    return bulletSegments
  }

  const punctuationSegments = trimmed
    .split(/[,;]\s*/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (punctuationSegments.length > 1) {
    return punctuationSegments
  }

  return [trimmed]
}

function formatAsBullets(input: string) {
  const items = toListItems(input)

  if (!items.length) {
    return '_Add bullet points to capture the details._'
  }

  if (items.length === 1) {
    return items[0]
  }

  return items.map((item) => `- ${item}`).join('\n')
}

function formatJourney(input: string) {
  const items = toListItems(input)

  if (!items.length) {
    return '_Outline 4-6 steps that show the happy path._'
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join('\n')
}

function formatRoadmap(input: string) {
  const trimmed = input.trim()

  if (!trimmed) {
    return '| Milestone | Focus |\n| --- | --- |\n| _TBD_ | _Add the releases that matter._ |'
  }

  const rows = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [milestone, rest] = line.split(/\s*(?:-|:|\u2014)\s*/)

      if (!rest) {
        return { milestone: line, focus: 'Details coming soon.' }
      }

      return { milestone: milestone.trim(), focus: rest.trim() }
    })

  const uniqueRows = rows.length ? rows : [{ milestone: trimmed, focus: 'Details coming soon.' }]

  const tableRows = uniqueRows
    .map((row) => `| ${row.milestone || 'Phase'} | ${row.focus || 'Details coming soon.'} |`)
    .join('\n')

  return ['| Milestone | Focus |', '| --- | --- |', tableRows].join('\n')
}

function summarizeForChat(answer: string) {
  const clean = answer.trim()

  if (!clean) {
    return 'noted.'
  }

  const normalized = clean.replace(/\s+/g, ' ')

  if (normalized.length <= 180) {
    return normalized
  }

  return `${normalized.slice(0, 177)}...`
}

function generateDocument(outline: DesignDocOutline) {
  const title = outline.projectName || 'Design blueprint'

  const sections = [
    `# ${title}`,
    '',
    `> Drafted with the Nightshift design document co-pilot.`,
    '',
    '## Vision & Opportunity',
    outline.projectGoal.trim() || '_Capture the spark that makes this project essential._',
    '',
    '## Target Audience',
    outline.targetUsers.trim() || '_Describe the people we are designing for._',
    '',
    '## Signature Experiences',
    formatAsBullets(outline.keyFeatures),
    '',
    '## Technical Direction',
    formatAsBullets(outline.techConsiderations),
    '',
    '## Happy Path Journey',
    formatJourney(outline.userJourney),
    '',
    '## Release Roadmap',
    formatRoadmap(outline.roadmap),
    '',
    '## Success Metrics & Signals',
    formatAsBullets(outline.successMetrics),
    '',
    '## Risks & Open Questions',
    formatAsBullets(outline.risks),
    '',
    '---',
    '',
    '### Collaboration Notes',
    '_Use the editor to capture decisions, trade-offs, and links to supporting research._',
  ]

  return sections.join('\n')
}

function buildAssistantMessage({
  answer,
  question,
  outline,
  isLast,
}: {
  answer: string
  question: DesignDocQuestion
  outline: DesignDocOutline
  isLast: boolean
}) {
  const snippet = summarizeForChat(answer)
  const projectName = outline.projectName || 'this project'

  const reflection = `Captured ${question.label} — ${snippet}`

  if (isLast) {
    return `${reflection}\n\nThat wraps the structured prompts. The design document for **${projectName}** is ready for polish. Add refinements in the editor or export when you're happy with it.`
  }

  const nextQuestion = questionFlow[questionFlow.indexOf(question) + 1]
  return `${reflection}\n\nNext up: ${nextQuestion.prompt}`
}

function createIntroMessage(outline: DesignDocOutline) {
  const projectName = outline.projectName || 'your project'
  const firstQuestion = questionFlow[0]

  return `Hey there! I'm your design doc wingmate. We'll layer context, architecture, and launch plans together for **${projectName}**. ${firstQuestion.prompt}`
}

function countAnswered(outline: DesignDocOutline) {
  return questionFlow.reduce((total, question) => {
    return total + (outline[question.id].trim() ? 1 : 0)
  }, 0)
}

function findNextQuestionIndex(outline: DesignDocOutline) {
  const index = questionFlow.findIndex((question) => !outline[question.id].trim())

  if (index === -1) {
    return questionFlow.length - 1
  }

  return index
}

type PersistedState = {
  outline: DesignDocOutline
  document: string
  messages: ChatMessage[]
  currentQuestionIndex: number
  lastSavedAt: string | null
}

type ProviderProps = {
  children: React.ReactNode
  seed?: Partial<Pick<DesignDocOutline, 'projectName' | 'projectGoal' | 'keyFeatures'>>
}

function loadInitialState(seed?: ProviderProps['seed']): DesignDocState {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)

      if (stored) {
        const parsed = JSON.parse(stored) as PersistedState

        if (parsed && typeof parsed === 'object') {
          const sanitized: DesignDocState = {
            outline: {
              projectName: parsed.outline?.projectName ?? '',
              projectGoal: parsed.outline?.projectGoal ?? '',
              targetUsers: parsed.outline?.targetUsers ?? '',
              keyFeatures: parsed.outline?.keyFeatures ?? '',
              techConsiderations: parsed.outline?.techConsiderations ?? '',
              userJourney: parsed.outline?.userJourney ?? '',
              roadmap: parsed.outline?.roadmap ?? '',
              successMetrics: parsed.outline?.successMetrics ?? '',
              risks: parsed.outline?.risks ?? '',
            },
            document:
              typeof parsed.document === 'string'
                ? parsed.document
                : generateDocument(parsed.outline ?? createEmptyOutline()),
            messages:
              Array.isArray(parsed.messages) && parsed.messages.length
                ? parsed.messages.map((message) => ({
                    id: typeof message.id === 'string' ? message.id : createId('msg'),
                    role: message.role === 'user' ? 'user' : 'assistant',
                    content: typeof message.content === 'string' ? message.content : '',
                  }))
                : [],
            currentQuestionIndex:
              typeof parsed.currentQuestionIndex === 'number'
                ? Math.min(Math.max(parsed.currentQuestionIndex, 0), questionFlow.length - 1)
                : 0,
            lastSavedAt: typeof parsed.lastSavedAt === 'string' ? parsed.lastSavedAt : null,
          }

          if (!sanitized.messages.length) {
            sanitized.messages = [
              {
                id: createId('assistant'),
                role: 'assistant',
                content: createIntroMessage(sanitized.outline),
              },
            ]
          }

          return sanitized
        }
      }
    } catch {
      // Ignore corrupted persisted state.
    }
  }

  const seededOutline = {
    projectName: seed?.projectName ?? '',
    projectGoal: seed?.projectGoal ?? '',
    targetUsers: '',
    keyFeatures: seed?.keyFeatures ?? '',
    techConsiderations: '',
    userJourney: '',
    roadmap: '',
    successMetrics: '',
    risks: '',
  }

  const outline = { ...createEmptyOutline(), ...seededOutline }
  const document = generateDocument(outline)
  const messages: ChatMessage[] = [
    { id: createId('assistant'), role: 'assistant', content: createIntroMessage(outline) },
  ]

  return {
    outline,
    document,
    messages,
    currentQuestionIndex: findNextQuestionIndex(outline),
    lastSavedAt: null,
  }
}

function createEmptyOutline(): DesignDocOutline {
  return {
    projectName: '',
    projectGoal: '',
    targetUsers: '',
    keyFeatures: '',
    techConsiderations: '',
    userJourney: '',
    roadmap: '',
    successMetrics: '',
    risks: '',
  }
}

function DesignDocProvider({ children, seed }: ProviderProps) {
  const initialStateRef = React.useRef<DesignDocState | null>(null)

  if (initialStateRef.current === null) {
    initialStateRef.current = loadInitialState(seed)
  }

  const [outline, setOutline] = React.useState<DesignDocOutline>(
    () => initialStateRef.current!.outline,
  )
  const [document, setDocument] = React.useState<string>(() => initialStateRef.current!.document)
  const [messages, setMessages] = React.useState<ChatMessage[]>(
    () => initialStateRef.current!.messages,
  )
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState<number>(
    () => initialStateRef.current!.currentQuestionIndex,
  )
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(
    initialStateRef.current!.lastSavedAt,
  )
  const [isSaving, setIsSaving] = React.useState(false)

  const saveTimeoutRef = React.useRef<number | null>(null)
  const autoDocRef = React.useRef<string>(generateDocument(outline))

  const answeredCount = React.useMemo(() => countAnswered(outline), [outline])

  const assistantMutation = useMutation({
    mutationFn: async ({ answer, questionIndex, outline: mutationOutline }: MutationInput) => {
      await new Promise((resolve) => setTimeout(resolve, 550))
      const question = questionFlow[questionIndex]
      const isLast =
        questionIndex >= questionFlow.length - 1 ||
        countAnswered(mutationOutline) >= questionFlow.length

      return buildAssistantMessage({
        answer,
        question,
        outline: mutationOutline,
        isLast,
      })
    },
    onSuccess: (content) => {
      setMessages((prev) => [
        ...prev,
        {
          id: createId('assistant'),
          role: 'assistant',
          content,
        },
      ])
    },
  })

  const persistState = React.useCallback((state: PersistedState) => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore storage failures (storage may be unavailable in private browsing).
    }
  }, [])

  React.useEffect(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    setIsSaving(true)

    saveTimeoutRef.current = window.setTimeout(() => {
      const timestamp = new Date().toISOString()
      persistState({
        outline,
        document,
        messages,
        currentQuestionIndex,
        lastSavedAt: timestamp,
      })
      setLastSavedAt(timestamp)
      setIsSaving(false)
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [outline, document, messages, currentQuestionIndex, persistState])

  const sendAnswer = React.useCallback(
    (value: string) => {
      const answer = value.trim()

      if (!answer) {
        return
      }

      const question = questionFlow[currentQuestionIndex]

      setMessages((prev) => [...prev, { id: createId('user'), role: 'user', content: answer }])

      let updatedOutline: DesignDocOutline | null = null

      setOutline((prev) => {
        const nextOutline = {
          ...prev,
          [question.id]: answer,
        }
        updatedOutline = nextOutline
        return nextOutline
      })

      const generatedDocument = generateDocument(
        updatedOutline ?? {
          ...outline,
          [question.id]: answer,
        },
      )

      setDocument((prevDocument) => {
        if (prevDocument.trim() === autoDocRef.current.trim()) {
          autoDocRef.current = generatedDocument
          return generatedDocument
        }

        if (!prevDocument.trim()) {
          autoDocRef.current = generatedDocument
          return generatedDocument
        }

        autoDocRef.current = generatedDocument

        return [
          generatedDocument,
          '',
          '---',
          '',
          '### Previous personal draft snapshot',
          prevDocument,
        ].join('\n')
      })

      const nextIndex = Math.min(currentQuestionIndex + 1, questionFlow.length - 1)
      setCurrentQuestionIndex(nextIndex)

      assistantMutation.mutate({
        answer,
        questionIndex: currentQuestionIndex,
        outline: updatedOutline ?? {
          ...outline,
          [question.id]: answer,
        },
      })
    },
    [assistantMutation, currentQuestionIndex, outline],
  )

  const updateDocument = React.useCallback((value: string) => {
    setDocument(value)
  }, [])

  const reset = React.useCallback(() => {
    const emptyOutline = createEmptyOutline()
    const seeded = seed ? { ...emptyOutline, ...seed } : emptyOutline
    const baseOutline = {
      ...emptyOutline,
      ...seeded,
    }
    const initialDocument = generateDocument(baseOutline)
    autoDocRef.current = initialDocument
    const nextState: DesignDocState = {
      outline: baseOutline,
      document: initialDocument,
      messages: [
        { id: createId('assistant'), role: 'assistant', content: createIntroMessage(baseOutline) },
      ],
      currentQuestionIndex: findNextQuestionIndex(baseOutline),
      lastSavedAt: null,
    }

    setOutline(nextState.outline)
    setDocument(nextState.document)
    setMessages(nextState.messages)
    setCurrentQuestionIndex(nextState.currentQuestionIndex)
    setLastSavedAt(nextState.lastSavedAt)
    assistantMutation.reset()

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [assistantMutation, seed])

  const value: DesignDocContextValue = React.useMemo(
    () => ({
      outline,
      document,
      messages,
      currentQuestionIndex,
      totalQuestions: questionFlow.length,
      lastSavedAt,
      isSaving,
      isProcessing: assistantMutation.isPending,
      answeredCount,
      sendAnswer,
      updateDocument,
      reset,
    }),
    [
      outline,
      document,
      messages,
      currentQuestionIndex,
      lastSavedAt,
      isSaving,
      assistantMutation.isPending,
      answeredCount,
      sendAnswer,
      updateDocument,
      reset,
    ],
  )

  return <DesignDocContext.Provider value={value}>{children}</DesignDocContext.Provider>
}

function MarkdownPreview({ content }: { content: string }) {
  const [html, setHtml] = React.useState('')
  const previewRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const rendered = micromark(content, {
      extensions: [gfmExtensions],
      htmlExtensions: [gfmHtmlExtensions],
    })
    setHtml(rendered)
  }, [content])

  React.useEffect(() => {
    if (!previewRef.current) {
      return
    }

    const container = previewRef.current

    container.querySelectorAll('pre code').forEach((codeBlock) => {
      const element = codeBlock as HTMLElement
      const languageClass = Array.from(element.classList).find((cls) => cls.startsWith('language-'))
      const language = languageClass ? languageClass.replace('language-', '') : 'text'
      const highlighted = highlightCode(element.textContent ?? '', language)
      element.innerHTML = highlighted
    })
  }, [html])

  return (
    <div
      ref={previewRef}
      className="markdown-surface prose-pre:mt-3 prose-pre:rounded-lg prose-pre:bg-slate-950/95 prose-pre:p-4 prose-pre:text-sm prose-pre:text-slate-100"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function highlightCode(code: string, language: string) {
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  if (
    language === 'js' ||
    language === 'ts' ||
    language === 'javascript' ||
    language === 'typescript'
  ) {
    return escaped
      .replace(
        /\b(const|let|var|function|return|if|else|for|while|import|from|export|async|await|class|extends|new|try|catch|throw)\b/g,
        '<span class="text-sky-300">$1</span>',
      )
      .replace(/\b(true|false|null|undefined)\b/g, '<span class="text-emerald-300">$1</span>')
      .replace(/(['"][^'"]*['"])/g, '<span class="text-orange-300">$1</span>')
  }

  if (language === 'json') {
    return escaped
      .replace(/("[^"]+"\s*:)/g, '<span class="text-sky-300">$1</span>')
      .replace(/(:\s*)("[^"]*")/g, '$1<span class="text-orange-300">$2</span>')
      .replace(/(:\s*)([0-9.+-]+)/g, '$1<span class="text-emerald-300">$2</span>')
  }

  return escaped
}

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
}

function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const applyFormatting = React.useCallback(
    (formatter: (selected: string, selection: { start: number; end: number }) => string) => {
      const textarea = textareaRef.current

      if (!textarea) {
        return
      }

      const { selectionStart, selectionEnd } = textarea
      const selected = value.slice(selectionStart, selectionEnd)
      const formatted = formatter(selected, { start: selectionStart, end: selectionEnd })

      const nextValue = `${value.slice(0, selectionStart)}${formatted}${value.slice(selectionEnd)}`
      onChange(nextValue)

      requestAnimationFrame(() => {
        textarea.focus()
        const cursorPosition = selectionStart + formatted.length
        textarea.setSelectionRange(cursorPosition, cursorPosition)
      })
    },
    [onChange, value],
  )

  const codeFence = '```'

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton
          ariaLabel="Bold"
          onClick={() => applyFormatting((selected) => `**${selected || 'Bold text'}**`)}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          ariaLabel="Italic"
          onClick={() => applyFormatting((selected) => `*${selected || 'Italic text'}*`)}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          ariaLabel="Add link"
          onClick={() =>
            applyFormatting((selected) => `[${selected || 'Link label'}](https://example.com)`)
          }
        >
          <span className="text-sm font-medium">Link</span>
        </ToolbarButton>
        <ToolbarButton
          ariaLabel="Inline code"
          onClick={() => applyFormatting((selected) => `\`${selected || 'code'}\``)}
        >
          <span className="font-mono text-sm">{`</>`}</span>
        </ToolbarButton>
        <ToolbarButton
          ariaLabel="Code block"
          onClick={() =>
            applyFormatting(
              (selected) =>
                `\n\n${codeFence}ts\n${selected || 'const example = true'}\n${codeFence}\n\n`,
            )
          }
        >
          <span className="font-mono text-xs">code</span>
        </ToolbarButton>
      </div>
      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Markdown
          </span>
          <textarea
            ref={textareaRef}
            className="flex-1 rounded-lg border border-border bg-background p-3 font-mono text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Use Markdown to expand the design doc."
          />
        </label>
        <div className="flex flex-col gap-2 overflow-hidden">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Preview
          </span>
          <div className="markdown-preview-container min-h-[12rem] overflow-y-auto rounded-lg border border-dashed border-muted/70 bg-muted/30 p-4">
            <MarkdownPreview content={value} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  children,
  ariaLabel,
  onClick,
}: {
  children: React.ReactNode
  ariaLabel: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
    >
      {children}
    </button>
  )
}

function ChatPanel() {
  const {
    messages,
    sendAnswer,
    isProcessing,
    currentQuestionIndex,
    totalQuestions,
    answeredCount,
  } = useDesignDocContext()
  const [draft, setDraft] = React.useState('')
  const listRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!listRef.current) {
      return
    }

    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const activeQuestion = questionFlow[currentQuestionIndex]

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-primary" /> Co-create the spec
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Structured prompts help us capture the strategy, experience, and technical plan behind the
          project.
        </CardDescription>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="bg-secondary/80 text-secondary-foreground">
            {answeredCount} / {totalQuestions} answered
          </Badge>
          <span className="inline-flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> Next: {activeQuestion.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message) => (
            <ChatMessageBubble key={message.id} message={message} />
          ))}
        </div>
        <div className="border-t bg-card/80 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              sendAnswer(draft)
              setDraft('')
            }}
            className="space-y-3"
          >
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your response
              </span>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={activeQuestion.prompt}
                className="min-h-[6rem] w-full rounded-lg border border-border bg-background p-3 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            {activeQuestion.hint ? (
              <p className="text-xs text-muted-foreground">{activeQuestion.hint}</p>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {isProcessing
                  ? 'Thinking through the next prompt…'
                  : 'Hit enter to continue the interview.'}
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={!draft.trim() || isProcessing}
                className="gap-1"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isProcessing ? 'Generating' : 'Send'}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}

type ChatMessageBubbleProps = {
  message: ChatMessage
}

function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
          isAssistant ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground',
        )}
      >
        <MarkdownPreview content={message.content} />
      </div>
    </div>
  )
}

function DocumentPanel() {
  const { document, updateDocument, outline, lastSavedAt, isSaving, reset } = useDesignDocContext()

  const savedAtLabel = React.useMemo(() => {
    if (!lastSavedAt) {
      return 'Draft not yet saved'
    }

    const date = new Date(lastSavedAt)
    return `Saved at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }, [lastSavedAt])

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList className="h-5 w-5 text-primary" />
              {outline.projectName ? `${outline.projectName} design doc` : 'Design doc draft'}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              The editor stays synced with your answers. Use Markdown to expand each section and
              capture decisions.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
            <RefreshCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="flex items-center gap-1">
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            )}
            {isSaving ? 'Saving…' : savedAtLabel}
          </Badge>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <BookOpenCheck className="h-3 w-3" /> Markdown + GFM supported
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden">
        <MarkdownEditor value={document} onChange={updateDocument} />
      </CardContent>
      <CardFooter className="border-t bg-muted/20 text-xs text-muted-foreground">
        <div className="flex flex-col gap-1 py-3">
          <span>
            Tip: Add tables, task lists, and fenced code blocks. We auto-highlight JavaScript,
            TypeScript, and JSON examples.
          </span>
          <span>
            The conversation history stays linked to this project so you can revisit and refine any
            time.
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}

function DesignDocScreen() {
  const [activeTab, setActiveTab] = React.useState<'chat' | 'document'>('chat')
  const { outline, answeredCount, totalQuestions } = useDesignDocContext()

  const progress = Math.round((answeredCount / totalQuestions) * 100)

  return (
    <div className="flex h-full flex-col gap-6">
      <header className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              {outline.projectName
                ? `${outline.projectName} design blueprint`
                : 'Design blueprint studio'}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              Answer guided prompts on the left and the design doc will stitch itself together on
              the right. Perfect for quickly aligning strategy, UX flows, and technical direction
              before kickoff.
            </p>
          </div>
          <Badge className="flex items-center gap-1 bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" /> AI-assisted workflow
          </Badge>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress}% complete</span>
            <span>
              {answeredCount} of {totalQuestions} prompts answered
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(progress, 6)}%` }}
            />
          </div>
        </div>
      </header>
      <div className="lg:hidden">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-1">
          <button
            type="button"
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition',
              activeTab === 'chat'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition',
              activeTab === 'document'
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTab('document')}
          >
            Document
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {activeTab === 'chat' ? <ChatPanel /> : <DocumentPanel />}
        </div>
      </div>
      <div className="hidden min-h-[60vh] gap-6 lg:grid lg:grid-cols-2">
        <ChatPanel />
        <DocumentPanel />
      </div>
    </div>
  )
}

export function DashboardDesignDocRoute() {
  const { activeProject } = useProjects()

  const seed = React.useMemo(() => {
    if (!activeProject) {
      return undefined
    }

    return {
      projectName: activeProject.name,
      projectGoal: activeProject.summary,
      keyFeatures: activeProject.focus ? `Focus area: ${activeProject.focus}` : '',
    }
  }, [activeProject])

  return (
    <DesignDocProvider seed={seed}>
      <DesignDocScreen />
    </DesignDocProvider>
  )
}
