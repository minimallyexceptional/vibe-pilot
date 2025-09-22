import React from 'react'
import { Bot, ClipboardList, MessageSquarePlus, RefreshCcw, Rocket, Sparkles } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestVibePilotCompletion, type VibePilotConfig } from '@/lib/vibe-pilot-ai'
import type { VibePilotChatMessage, VibePilotMode } from '@/lib/vibe-pilot-ai'
import { cn } from '@/lib/utils'

const toneOptions = [
  { value: 'encouraging product coach', label: 'Encouraging coach' },
  { value: 'direct and tactical strategist', label: 'Direct strategist' },
  { value: 'visionary storyteller', label: 'Visionary futurist' },
] as const

const modeOptions: Array<{
  value: VibePilotMode
  title: string
  description: string
  highlights: string[]
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}> = [
  {
    value: 'design',
    title: 'Design blueprint',
    description: 'Turn raw feature lists into detailed product specs and UX flows.',
    highlights: [
      'Expand rough ideas into structured design docs.',
      'Call out user journeys, edge cases, and validation states.',
      'Define success metrics to align the squad.',
    ],
    icon: ClipboardList,
  },
  {
    value: 'collaboration',
    title: 'Strategy partner',
    description: 'Brainstorm growth plays, monetization bets, and launch plans.',
    highlights: [
      'Co-create feature roadmaps and experiment backlogs.',
      'Explore monetization angles and activation loops.',
      'Plan cross-functional checkpoints and signals.',
    ],
    icon: Rocket,
  },
]

const totalSteps = 3

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  isMock?: boolean
}

type Phase = 'intro' | 'wizard' | 'chat'

type KickoffStatus = 'idle' | 'running' | 'done'

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function getModeLabel(mode: VibePilotMode) {
  return modeOptions.find((option) => option.value === mode)?.title ?? 'Mode'
}

export function DashboardVibePilotRoute() {
  const [phase, setPhase] = React.useState<Phase>('intro')
  const [stepIndex, setStepIndex] = React.useState(0)
  const [mode, setMode] = React.useState<VibePilotMode>('design')
  const [projectName, setProjectName] = React.useState('')
  const [audience, setAudience] = React.useState('')
  const [focusDetails, setFocusDetails] = React.useState('')
  const [tone, setTone] = React.useState<(typeof toneOptions)[number]['value']>(
    toneOptions[0].value,
  )
  const [sessionConfig, setSessionConfig] = React.useState<VibePilotConfig | null>(null)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = React.useState('')
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [kickoffStatus, setKickoffStatus] = React.useState<KickoffStatus>('idle')
  const [error, setError] = React.useState<string | null>(null)

  const messagesRef = React.useRef<ChatMessage[]>([])
  const endRef = React.useRef<HTMLDivElement | null>(null)
  const kickoffRequestIdRef = React.useRef(0)

  React.useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  React.useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isGenerating])

  React.useEffect(() => {
    if (phase !== 'chat' || !sessionConfig || kickoffStatus !== 'idle') {
      return
    }

    const requestId = kickoffRequestIdRef.current + 1
    kickoffRequestIdRef.current = requestId

    setKickoffStatus('running')
    setError(null)

    const introContent =
      sessionConfig.mode === 'design'
        ? `Welcome aboard — I'm Vibe Pilot, here to turn ${sessionConfig.projectName} into a crisp design blueprint. I'll expand your feature ideas into flows, UX states, and success measures.`
        : `Welcome aboard — I'm Vibe Pilot, ready to help shape ${sessionConfig.projectName}'s next wave of features, monetization ideas, and launch strategies.`

    const kickoffPrompt =
      sessionConfig.mode === 'design'
        ? `Here is the starter feature list for ${sessionConfig.projectName}:
${sessionConfig.focusDetails}
Audience: ${sessionConfig.audience || 'Not specified yet.'}`
        : `Here is the strategic brief for ${sessionConfig.projectName}:
${sessionConfig.focusDetails}
Audience: ${sessionConfig.audience || 'Not specified yet.'}`

    const introMessage: ChatMessage = {
      id: createId('assistant'),
      role: 'assistant',
      content: introContent,
    }
    const kickoffMessage: ChatMessage = {
      id: createId('user'),
      role: 'user',
      content: kickoffPrompt,
    }

    const initialMessages: ChatMessage[] = [introMessage, kickoffMessage]
    setMessages(initialMessages)

    const history: VibePilotChatMessage[] = initialMessages.map((message) => ({
      role: message.role,
      content: message.content,
    }))

    setIsGenerating(true)

    void requestVibePilotCompletion({ history, config: sessionConfig })
      .then((completion) => {
        if (kickoffRequestIdRef.current !== requestId) {
          return
        }

        setMessages((prev) => [
          ...prev,
          {
            id: createId('assistant'),
            role: 'assistant',
            content: completion.content,
            isMock: completion.isMock,
          },
        ])
      })
      .catch((requestError) => {
        if (kickoffRequestIdRef.current !== requestId) {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Something went wrong while talking to Vibe Pilot.',
        )
      })
      .finally(() => {
        if (kickoffRequestIdRef.current !== requestId) {
          return
        }

        setIsGenerating(false)
        setKickoffStatus('done')
      })
  }, [phase, sessionConfig, kickoffStatus])

  const isLastStep = stepIndex === totalSteps - 1

  const handleNext = () => {
    if (isLastStep) {
      const config: VibePilotConfig = {
        mode,
        projectName: projectName.trim() || 'Unnamed project',
        audience: audience.trim(),
        focusDetails: focusDetails.trim(),
        tone,
      }
      setSessionConfig(config)
      setPhase('chat')
      setKickoffStatus('idle')
      setMessages([])
      setInputValue('')
      setError(null)
      return
    }

    setStepIndex((index) => Math.min(index + 1, totalSteps - 1))
  }

  const handleBack = () => {
    if (stepIndex === 0) {
      setPhase('intro')
      return
    }

    setStepIndex((index) => Math.max(index - 1, 0))
  }

  const handleStart = () => {
    setPhase('wizard')
    setStepIndex(0)
  }

  const handleStartOver = () => {
    kickoffRequestIdRef.current += 1
    setPhase('intro')
    setStepIndex(0)
    setSessionConfig(null)
    setMessages([])
    setInputValue('')
    setIsGenerating(false)
    setKickoffStatus('idle')
    setError(null)
    setFocusDetails('')
    setProjectName('')
    setAudience('')
    setMode('design')
    setTone(toneOptions[0].value)
  }

  const canProceed = React.useMemo(() => {
    if (stepIndex === 0) {
      return Boolean(mode)
    }

    if (stepIndex === 1) {
      return Boolean(projectName.trim())
    }

    if (stepIndex === 2) {
      return Boolean(focusDetails.trim())
    }

    return true
  }, [stepIndex, mode, projectName, focusDetails])

  const wizardDescription = React.useMemo(() => {
    if (stepIndex === 0) {
      return 'Choose how Vibe Pilot should collaborate on this session.'
    }

    if (stepIndex === 1) {
      return 'Tell Vibe Pilot what you are building and who it is for.'
    }

    return 'Share the details you already have so the AI can kick things off in the right direction.'
  }, [stepIndex])

  const chatHeaderCopy = React.useMemo(() => {
    if (!sessionConfig) {
      return ''
    }

    if (sessionConfig.mode === 'design') {
      return 'Translate your feature list into a polished design doc.'
    }

    return 'Co-create launch experiments, monetization angles, and product strategy.'
  }, [sessionConfig])

  const handleSubmitMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!sessionConfig) {
      return
    }

    const trimmed = inputValue.trim()

    if (!trimmed) {
      return
    }

    const userMessage: ChatMessage = {
      id: createId('user'),
      role: 'user',
      content: trimmed,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsGenerating(true)
    setError(null)

    const history: VibePilotChatMessage[] = [...messagesRef.current, userMessage].map(
      (message) => ({
        role: message.role,
        content: message.content,
      }),
    )

    try {
      const completion = await requestVibePilotCompletion({ history, config: sessionConfig })
      const assistantMessage: ChatMessage = {
        id: createId('assistant'),
        role: 'assistant',
        content: completion.content,
        isMock: completion.isMock,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while talking to Vibe Pilot.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="border-primary/60 text-primary">
            New
          </Badge>
          <span className="inline-flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Vibe Pilot
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Guide your next product move with AI
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Spin up an AI copilot that adapts to your goals—generate detailed design docs or partner
          on growth strategy in minutes.
        </p>
      </div>

      {phase === 'intro' ? (
        <>
          <Card className="border-muted/70 bg-card/70">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                What Vibe Pilot can do
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Pick a collaboration style and we will collect the right context before launching
                straight into a tailored ChatGPT session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <li className="flex items-start gap-3">
                  <ClipboardList className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>
                    Expand bullet-point feature lists into structured design requirements.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Rocket className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>Map launch experiments, monetization angles, and success metrics.</span>
                </li>
                <li className="flex items-start gap-3">
                  <MessageSquarePlus className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>
                    Capture the setup details once—Vibe Pilot carries them through the entire chat.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <RefreshCcw className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>Restart with new prompts anytime to explore alternate directions.</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                We will ask a few quick questions, seed ChatGPT with your answers, and return a
                ready-to-use session.
              </p>
              <Button size="lg" onClick={handleStart}>
                Start a new AI chat
              </Button>
            </CardFooter>
          </Card>
        </>
      ) : null}

      {phase === 'wizard' ? (
        <Card className="border-muted/70">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Step {stepIndex + 1} of {totalSteps}
              </span>
              <span>{getModeLabel(mode)}</span>
            </div>
            <CardTitle>
              {stepIndex === 0
                ? 'How should Vibe Pilot collaborate?'
                : stepIndex === 1
                  ? 'Add the basics about your project'
                  : 'What should we focus on first?'}
            </CardTitle>
            <CardDescription>{wizardDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stepIndex === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {modeOptions.map((option) => {
                  const Icon = option.icon
                  const isActive = option.value === mode

                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setMode(option.value)}
                      className={cn(
                        'flex h-full flex-col gap-4 rounded-lg border p-5 text-left transition hover:border-primary/70 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        isActive ? 'border-primary bg-primary/5' : 'border-muted/70',
                      )}
                      aria-pressed={isActive}
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-foreground">{option.title}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      <ul className="mt-auto space-y-2 text-sm text-muted-foreground">
                        {option.highlights.map((highlight) => (
                          <li key={highlight} className="flex items-start gap-2">
                            <span
                              className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary"
                              aria-hidden="true"
                            />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {stepIndex === 1 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="project-name">Project or initiative</Label>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder="e.g. Nightshift mobile companion"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-audience">Who is this for?</Label>
                  <Input
                    id="project-audience"
                    value={audience}
                    onChange={(event) => setAudience(event.target.value)}
                    placeholder="e.g. Indie creators planning live drops"
                  />
                </div>
              </div>
            ) : null}

            {stepIndex === 2 ? (
              <div className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="project-details">
                    {mode === 'design'
                      ? 'Share the features or requirements you have so far'
                      : 'Describe the opportunities, goals, or challenges you want to explore'}
                  </Label>
                  <textarea
                    id="project-details"
                    value={focusDetails}
                    onChange={(event) => setFocusDetails(event.target.value)}
                    placeholder={
                      mode === 'design'
                        ? 'List the core features, flows, and constraints you want to cover.'
                        : 'What areas should we co-create on? Pricing, partnerships, onboarding, community?'
                    }
                    className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pick a tone for this session</Label>
                  <div className="flex flex-wrap gap-2">
                    {toneOptions.map((option) => {
                      const isActive = tone === option.value

                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={isActive ? 'default' : 'outline'}
                          onClick={() => setTone(option.value)}
                          className={cn('rounded-full', !isActive && 'border-muted/60')}
                        >
                          {option.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={handleBack}>
              {stepIndex === 0 ? 'Back to intro' : 'Previous'}
            </Button>
            <Button onClick={handleNext} disabled={!canProceed}>
              {isLastStep ? 'Launch Vibe Pilot' : 'Next'}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {phase === 'chat' && sessionConfig ? (
        <div className="space-y-6">
          <Card className="border-muted/70">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Badge variant="outline" className="border-primary/60 text-primary">
                  {getModeLabel(sessionConfig.mode)}
                </Badge>
                <span>{sessionConfig.tone}</span>
              </div>
              <CardTitle className="text-2xl text-foreground">
                {sessionConfig.projectName}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                {chatHeaderCopy}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-start gap-4 text-sm text-muted-foreground">
              {sessionConfig.audience ? (
                <div className="min-w-[220px] space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Audience
                  </p>
                  <p className="text-foreground">{sessionConfig.audience}</p>
                </div>
              ) : null}
              {sessionConfig.focusDetails ? (
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Kickoff notes
                  </p>
                  <p className="whitespace-pre-wrap text-foreground">
                    {sessionConfig.focusDetails}
                  </p>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Vibe Pilot keeps this brief in sync with every message it sends to ChatGPT.
              </p>
              <Button variant="outline" size="sm" onClick={handleStartOver}>
                Start over
              </Button>
            </CardFooter>
          </Card>

          {error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Card className="flex min-h-[460px] flex-col border-muted/70">
            <CardContent className="flex flex-1 flex-col gap-0 p-0">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3 text-sm',
                      message.role === 'user'
                        ? 'justify-end text-foreground'
                        : 'justify-start text-muted-foreground',
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="h-4 w-4" />
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        'max-w-[75%] whitespace-pre-wrap rounded-lg border px-4 py-3 shadow-sm',
                        message.role === 'assistant'
                          ? 'border-muted/70 bg-muted/40 text-foreground'
                          : 'border-primary bg-primary text-primary-foreground',
                      )}
                    >
                      {message.role === 'assistant' && message.isMock ? (
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Demo preview
                        </div>
                      ) : null}
                      <p>{message.content}</p>
                    </div>
                    {message.role === 'user' ? (
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 text-primary">
                        <MessageSquarePlus className="h-4 w-4" />
                      </div>
                    ) : null}
                  </div>
                ))}
                {isGenerating ? (
                  <div className="flex gap-3 text-sm text-muted-foreground">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4 animate-pulse" />
                    </div>
                    <div className="max-w-[75%] rounded-lg border border-dashed border-muted/70 bg-muted/30 px-4 py-3">
                      <p>Vibe Pilot is thinking…</p>
                    </div>
                  </div>
                ) : null}
                <div ref={endRef} />
              </div>
            </CardContent>
            <CardFooter className="border-t border-muted/70 bg-card/70 p-4">
              <form className="flex w-full flex-col gap-3" onSubmit={handleSubmitMessage}>
                <div className="grid gap-2">
                  <Label htmlFor="vibe-pilot-message" className="sr-only">
                    Message Vibe Pilot
                  </Label>
                  <textarea
                    id="vibe-pilot-message"
                    value={inputValue}
                    onChange={(event) => {
                      setInputValue(event.target.value)
                      if (error) {
                        setError(null)
                      }
                    }}
                    placeholder="Share the next question, update, or experiment you want to explore together."
                    className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isGenerating}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {sessionConfig.mode === 'design'
                      ? 'Tip: Ask for UX flows, state diagrams, or success metrics.'
                      : 'Tip: Ask for experiments, channel strategies, or partnership ideas.'}
                  </span>
                  <Button type="submit" disabled={isGenerating || !inputValue.trim()}>
                    Send to Vibe Pilot
                  </Button>
                </div>
              </form>
            </CardFooter>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
