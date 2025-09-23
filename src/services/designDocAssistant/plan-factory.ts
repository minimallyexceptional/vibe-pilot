import type {
  AnswersRecord,
  DesignDocPlan,
  FormatOptions,
  PlanContext,
  QuestionOptions,
} from './types'

function friendlyProjectName(context: PlanContext) {
  return context.projectName ? '**' + context.projectName + '**' : 'your project'
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
        return String(index + 1) + '. ' + item.replace(/^\d+[.)]\s*/, '')
      }

      return item.startsWith('- ') || item.startsWith('* ')
        ? item
        : '- ' + item.replace(/^[-*]\s*/, '')
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
        'Let us start with the north star. What problem is ' +
        name +
        ' obsessed with solving and what change do you want to see?',
      acknowledgement: ({ answer }: FormatOptions) =>
        'Great, I will frame the vision section around that mission: ' + answer.trim() + '.',
      formatContent: ({ answer }: FormatOptions) =>
        combine(['**North star**', asParagraph(answer)]),
    },
    {
      key: 'users',
      heading: 'Target Users',
      placeholder: '_Describe the primary personas and their needs._',
      question: () =>
        'Who are the core users that ' +
        name +
        ' serves? List personas, segments, or customers and what they care about.',
      acknowledgement: () => 'Perfect — those personas will anchor the user section.',
      formatContent: ({ answer }: FormatOptions) =>
        combine(['**Primary users**', asList(answer, '-')]),
    },
    {
      key: 'journeys',
      heading: 'Experience Pillars',
      placeholder: '_Outline the flows or jobs-to-be-done that matter most._',
      question: ({ answers }: QuestionOptions) => {
        const userCallout = (answers as AnswersRecord).users
          ? ' Based on those personas, what outcomes do they need from the experience?'
          : ''

        return (
          'Map the pivotal use cases or experience pillars that define a successful session.' +
          userCallout
        )
      },
      acknowledgement: () => 'Awesome — those pillars will shape the UX flows and scope.',
      formatContent: ({ answer }: FormatOptions) =>
        combine(['**Experience pillars**', asList(answer, '-')]),
    },
    {
      key: 'tech',
      heading: 'Technical Foundations',
      placeholder: '_List the stack, services, and constraints to honor._',
      question: ({ context }: QuestionOptions) => {
        const focus = context.projectFocus
          ? ' Be sure to note anything that protects the focus on ' + context.projectFocus + '.'
          : ''

        return (
          'What does the technical stack look like — frameworks, integrations, data sources, or constraints to watch?' +
          focus
        )
      },
      acknowledgement: () => 'Nice — the implementation section will call out that stack.',
      formatContent: ({ answer }: FormatOptions) =>
        combine(['**Stack snapshot**', asList(answer, '-')]),
    },
    {
      key: 'roadmap',
      heading: 'Launch Roadmap',
      placeholder: '_Lay out phases, milestones, and owners._',
      question: () =>
        'Sketch the next few milestones or phases. Include timelines, owners, or deliverables if you know them.',
      acknowledgement: () => 'Got it — I will drop those milestones into the roadmap.',
      formatContent: ({ answer }: FormatOptions) =>
        combine(['**Milestones**', asList(answer, '1.')]),
    },
    {
      key: 'metrics',
      heading: 'Success Metrics',
      placeholder: '_Track signals that prove the design is working._',
      question: () =>
        'What signals, metrics, or qualitative reads will tell you the launch is working? List both leading and lagging indicators if possible.',
      acknowledgement: () => 'Excellent — those indicators will become the success criteria.',
      formatContent: ({ answer }: FormatOptions) =>
        combine(['**Signals to watch**', asList(answer, '-')]),
    },
    {
      key: 'risks',
      heading: 'Risks & Open Questions',
      placeholder: '_Capture unknowns, dependencies, and bets to validate._',
      question: () =>
        'Any open questions, dependencies, or risks we should flag while the plan is fresh?',
      acknowledgement: () => 'Thanks — I will log those so the team can follow up.',
      formatContent: ({ answer }: FormatOptions) =>
        combine(['**Risks & unknowns**', asList(answer, '-')]),
    },
  ]
}
