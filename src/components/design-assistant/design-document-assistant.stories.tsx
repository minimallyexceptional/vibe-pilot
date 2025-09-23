import * as React from 'react'
import type { StoryDefault } from '@ladle/react'

import { DesignDocumentAssistant } from './design-document-assistant'

const STORAGE_KEY = 'design-document-assistant-state-v1'

const mockConversation = [
  {
    stepId: 'vision',
    sectionTitle: 'Product Vision',
    question: 'What is the elevator pitch for your project idea?',
    answer:
      'Pulseboard is a lightweight planning workspace for distributed product teams to keep rituals, documentation, and status updates in sync.',
  },
  {
    stepId: 'users',
    sectionTitle: 'Target Audience',
    question: 'Who are the primary users or customers for Pulseboard?',
    answer:
      'Product managers in remote-first startups\nEngineering leads coordinating cross-timezone teams\nDesign partners who need async visibility.',
  },
  {
    stepId: 'value',
    sectionTitle: 'Value Proposition',
    question: 'What unique value does Pulseboard deliver compared to existing alternatives?',
    answer:
      'Pulseboard keeps the strategy, roadmap, and rituals in one canvas so teams can run weekly rituals without juggling docs and slides. It automates recaps and surfaces blockers before they derail releases.',
  },
  {
    stepId: 'tech',
    sectionTitle: 'Tech Stack & Integrations',
    question: 'What technologies or platforms will power the first release?',
    answer:
      'React + TanStack Router front-end\nNode.js API with tRPC for typed requests\nPostgreSQL via Prisma\nTemporal for async ritual reminders\nSlack + Linear integrations.',
  },
  {
    stepId: 'architecture',
    sectionTitle: 'System Architecture Highlights',
    question: 'Walk me through the key architectural decisions or data flow for Pulseboard.',
    answer:
      'A React + Tailwind client communicates with a Node.js gateway via tRPC for typed requests. Temporal orchestrates ritual reminders and recaps, while PostgreSQL holds workspace data. Slack and Linear webhooks push updates into the cockpit.',
  },
  {
    stepId: 'roadmap',
    sectionTitle: 'Milestones & Roadmap',
    question:
      'Outline the major milestones we need to hit to ship the first compelling release of Pulseboard.',
    answer:
      'MVP rituals dashboard - 3 weeks - covers weekly planning rituals\nPrivate beta onboarding - 5 weeks - onboard 5 pilot teams\nInsights & metrics layer - 8 weeks - share retention leading indicators.',
  },
  {
    stepId: 'risks',
    sectionTitle: 'Risks & Open Questions',
    question: 'What are the biggest risks, assumptions, or unknowns we should track?',
    answer:
      'Integration scopes may take longer than planned\nNeed to validate adoption beyond champion teams\nCalendar sync reliability across providers.',
  },
]

export default {
  title: 'Components/Design Document Assistant',
} satisfies StoryDefault

export const EmptyState = () => {
  React.useEffect(() => {
    window.localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <div className="min-h-[720px] w-full">
      <DesignDocumentAssistant />
    </div>
  )
}

export const MockedPlan = () => {
  React.useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        conversation: mockConversation,
        activeTab: 'document',
      }),
    )

    return () => {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return (
    <div className="min-h-[720px] w-full">
      <DesignDocumentAssistant />
    </div>
  )
}
