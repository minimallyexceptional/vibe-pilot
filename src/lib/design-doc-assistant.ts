import type { Root as HastRoot } from 'hast'

export type DesignDocSectionKey =
  | 'vision'
  | 'users'
  | 'journeys'
  | 'tech'
  | 'roadmap'
  | 'metrics'
  | 'risks'

type AnswersRecord = Partial<Record<DesignDocSectionKey, string>>

type PlanContext = {
  projectName: string
  projectSummary?: string
  projectFocus?: string
}

type QuestionOptions = {
  index: number
  answers: AnswersRecord
  context: PlanContext
}

type FormatOptions = {
  answer: string
  answers: AnswersRecord
  context: PlanContext
}

type DesignDocStepDefinition = {
  key: DesignDocSectionKey
  heading: string
  placeholder: string
  question: (options: QuestionOptions) => string
  acknowledgement: (options: FormatOptions) => string
  formatContent: (options: FormatOptions) => string
}

export type DesignDocPlan = DesignDocStepDefinition[]

const DEFAULT_PLACEHOLDER = '_Add notes from the chat to build out this section._'

function friendlyProjectName(context: PlanContext) {
  return context.projectName ? `**${context.projectName}**` : 'your project'
}

function asList(answer: string, marker: '-' | '1.') {
  const items = answer
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (items.length === 0) {
    return answer.trim()
  }

  return items
    .map((item, index) => {
      if (marker === '1.') {
        return `${index + 1}. ${item.replace(/^\d+[.)]\s*/, '')}`
      }

      return item.startsWith('- ') || item.startsWith('* ')
        ? item
        : `- ${item.replace(/^[-*]\s*/, '')}`
    })
    .join('\n')
}

function asParagraph(answer: string) {
  return answer.trim().replace(/\s+/, ' ')
}

function combine(lines: string[]) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n\n')
}

export function createDesignDocPlan(context: PlanContext): DesignDocPlan {
  const name = friendlyProjectName(context)

  return [
    {
      key: 'vision',
      heading: 'Product Vision',
      placeholder: '_Capture the mission and why the work matters._',
      question: () =>
        `Let's start with the north star. What problem is ${name} obsessed with solving and what change do you want to see?`,
      acknowledgement: ({ answer }) =>
        `Great, I'll frame the vision section around that mission: ${answer.trim()}.`,
      formatContent: ({ answer }) => combine([`**North star**`, asParagraph(answer)]),
    },
    {
      key: 'users',
      heading: 'Target Users',
      placeholder: '_Describe the primary personas and their needs._',
      question: () =>
        `Who are the core users that ${name} serves? List personas, segments, or customers and what they care about.`,
      acknowledgement: () => 'Perfect — those personas will anchor the user section.',
      formatContent: ({ answer }) => combine(['**Primary users**', asList(answer, '-')]),
    },
    {
      key: 'journeys',
      heading: 'Experience Pillars',
      placeholder: '_Outline the flows or jobs-to-be-done that matter most._',
      question: ({ answers }) => {
        const userCallout = answers.users
          ? ' Based on those personas, what outcomes do they need from the experience?'
          : ''

        return `Map the pivotal use cases or experience pillars that define a successful session.${userCallout}`
      },
      acknowledgement: () => 'Awesome — those pillars will shape the UX flows and scope.',
      formatContent: ({ answer }) => combine(['**Experience pillars**', asList(answer, '-')]),
    },
    {
      key: 'tech',
      heading: 'Technical Foundations',
      placeholder: '_List the stack, services, and constraints to honor._',
      question: ({ context }) => {
        const focus = context.projectFocus
          ? ` Be sure to note anything that protects the focus on ${context.projectFocus}.`
          : ''

        return `What does the technical stack look like — frameworks, integrations, data sources, or constraints to watch?${focus}`
      },
      acknowledgement: () => 'Nice — the implementation section will call out that stack.',
      formatContent: ({ answer }) => combine(['**Stack snapshot**', asList(answer, '-')]),
    },
    {
      key: 'roadmap',
      heading: 'Launch Roadmap',
      placeholder: '_Lay out phases, milestones, and owners._',
      question: () =>
        'Sketch the next few milestones or phases. Include timelines, owners, or deliverables if you know them.',
      acknowledgement: () => 'Got it — I’ll drop those milestones into the roadmap.',
      formatContent: ({ answer }) => combine(['**Milestones**', asList(answer, '1.')]),
    },
    {
      key: 'metrics',
      heading: 'Success Metrics',
      placeholder: '_Track signals that prove the design is working._',
      question: () =>
        'What signals, metrics, or qualitative reads will tell you the launch is working? List both leading and lagging indicators if possible.',
      acknowledgement: () => 'Excellent — those indicators will become the success criteria.',
      formatContent: ({ answer }) => combine(['**Signals to watch**', asList(answer, '-')]),
    },
    {
      key: 'risks',
      heading: 'Risks & Open Questions',
      placeholder: '_Capture unknowns, dependencies, and bets to validate._',
      question: () =>
        'Any open questions, dependencies, or risks we should flag while the plan is fresh?',
      acknowledgement: () => 'Thanks — I’ll log those so the team can follow up.',
      formatContent: ({ answer }) => combine(['**Risks & unknowns**', asList(answer, '-')]),
    },
  ]
}

export function createDesignDocTemplate(plan: DesignDocPlan, context: PlanContext) {
  const title = context.projectName ? `${context.projectName} — Design Document` : 'Design Document'
  const summary = context.projectSummary?.trim()
  const introLines = summary
    ? [`> ${summary}`]
    : ['> Use the chat on the left to capture context, decisions, and rationale.']

  const sections = plan.map((step) => [`## ${step.heading}`, step.placeholder]).flat()

  return ['# ' + title, '', ...introLines, '', ...sections, ''].join('\n')
}

type ParsedDesignDoc = {
  title: string
  preface: string
  appendix: string
  sections: Map<DesignDocSectionKey, string>
}

export function parseDesignDoc(markdown: string, plan: DesignDocPlan): ParsedDesignDoc {
  const headingMap = new Map<string, DesignDocSectionKey>(
    plan.map((step) => [step.heading.toLowerCase(), step.key]),
  )

  const normalized = markdown.replace(/\r/g, '')
  const titleMatch = normalized.match(/^\s*#\s+(.+?)\s*$/m)
  const title = titleMatch ? titleMatch[1].trim() : 'Design Document'
  const contentWithoutTitle = titleMatch
    ? normalized.replace(titleMatch[0], '').trimStart()
    : normalized.trimStart()

  const sections = new Map<DesignDocSectionKey, string>()
  plan.forEach((step) => {
    sections.set(step.key, '')
  })

  const sectionRegex = /^##\s+(.+?)\s*$/m
  const lines = contentWithoutTitle.split('\n')
  let currentKey: DesignDocSectionKey | null = null
  let currentBuffer: string[] = []
  const prefaceBuffer: string[] = []
  const appendixBuffer: string[] = []
  let hasSeenKnownSection = false

  const flushSection = () => {
    if (!currentKey) {
      return
    }

    const raw = currentBuffer.join('\n').trim()
    sections.set(currentKey, raw)
    currentKey = null
    currentBuffer = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const headingMatch = line.match(sectionRegex)

    if (headingMatch) {
      flushSection()

      const headingText = headingMatch[1].trim()
      const key = headingMap.get(headingText.toLowerCase())

      if (key) {
        currentKey = key
        currentBuffer = []
        hasSeenKnownSection = true
      } else {
        if (!hasSeenKnownSection) {
          prefaceBuffer.push(line)
        } else {
          appendixBuffer.push(line)
        }
      }

      continue
    }

    if (currentKey) {
      currentBuffer.push(line)
    } else if (!hasSeenKnownSection) {
      prefaceBuffer.push(line)
    } else {
      appendixBuffer.push(line)
    }
  }

  flushSection()

  return {
    title,
    preface: prefaceBuffer.join('\n').trim(),
    appendix: appendixBuffer.join('\n').trim(),
    sections,
  }
}

export function buildDesignDoc(parsed: ParsedDesignDoc, plan: DesignDocPlan) {
  const lines: string[] = []
  const title = parsed.title?.trim() || 'Design Document'
  lines.push(`# ${title}`)
  lines.push('')

  if (parsed.preface) {
    lines.push(parsed.preface)
    lines.push('')
  }

  plan.forEach((step) => {
    lines.push(`## ${step.heading}`)
    const rawValue = parsed.sections.get(step.key)?.trim()
    const normalized = rawValue || step.placeholder || DEFAULT_PLACEHOLDER
    lines.push(normalized)
    lines.push('')
  })

  if (parsed.appendix) {
    lines.push(parsed.appendix)
    if (!parsed.appendix.endsWith('\n')) {
      lines.push('')
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

export function appendSectionContent(
  markdown: string,
  plan: DesignDocPlan,
  key: DesignDocSectionKey,
  addition: string,
) {
  const step = plan.find((item) => item.key === key)

  if (!step) {
    return markdown
  }

  const parsed = parseDesignDoc(markdown, plan)
  const placeholder = step.placeholder.trim()
  const existing = parsed.sections.get(key)?.trim() ?? ''
  const normalizedExisting = existing && existing !== placeholder ? existing : ''
  const nextContent = [normalizedExisting, addition.trim()].filter(Boolean).join('\n\n')

  parsed.sections.set(key, nextContent || placeholder)

  return buildDesignDoc(parsed, plan)
}

export async function mockDesignDocExchange({
  plan,
  stepIndex,
  answer,
  answers,
  context,
}: {
  plan: DesignDocPlan
  stepIndex: number
  answer: string
  answers: AnswersRecord
  context: PlanContext
}): Promise<{
  acknowledgement: string
  nextQuestion?: { key: DesignDocSectionKey; text: string }
  completion?: string
}> {
  const step = plan[stepIndex]
  const updatedAnswers = { ...answers, [step.key]: answer }
  const acknowledgement = step.acknowledgement({ answer, answers: updatedAnswers, context })
  const nextStep = plan[stepIndex + 1]

  const nextQuestion = nextStep
    ? nextStep.question({ index: stepIndex + 1, answers: updatedAnswers, context })
    : undefined

  await new Promise((resolve) => {
    setTimeout(resolve, 600)
  })

  return {
    acknowledgement,
    nextQuestion: nextStep
      ? {
          key: nextStep.key,
          text: nextQuestion ?? '',
        }
      : undefined,
    completion: !nextStep
      ? `That's a solid first pass. Keep iterating in the document on the right or ask for more prompts whenever you need.`
      : undefined,
  }
}

export function createIntroMessage(context: PlanContext) {
  const name = context.projectName || 'your project'
  const summary = context.projectSummary?.trim()
  const focus = context.projectFocus?.trim()

  const parts = [
    `I’m your design doc copilot for ${name}. Let’s capture the decisions that will unblock your build.`,
  ]

  if (summary) {
    parts.push(`Current context: ${summary}`)
  }

  if (focus) {
    parts.push(`We’ll keep an eye on ${focus} as we go.`)
  }

  parts.push('Answer each prompt and I’ll stitch the details into the document.')

  return parts.join(' ')
}

export type MarkdownAst = HastRoot
