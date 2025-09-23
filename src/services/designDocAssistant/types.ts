import type { Root as HastRoot } from 'hast'

export type DesignDocSectionKey =
  | 'vision'
  | 'users'
  | 'journeys'
  | 'tech'
  | 'roadmap'
  | 'metrics'
  | 'risks'

export type AnswersRecord = Partial<Record<DesignDocSectionKey, string>>

export type PlanContext = {
  projectName: string
  projectSummary?: string
  projectFocus?: string
}

export type QuestionOptions = {
  index: number
  answers: AnswersRecord
  context: PlanContext
}

export type FormatOptions = {
  answer: string
  answers: AnswersRecord
  context: PlanContext
}

export type DesignDocStepDefinition = {
  key: DesignDocSectionKey
  heading: string
  placeholder: string
  question: (options: QuestionOptions) => string
  acknowledgement: (options: FormatOptions) => string
  formatContent: (options: FormatOptions) => string
}

export type DesignDocPlan = DesignDocStepDefinition[]

export type ParsedDesignDoc = {
  title: string
  preface: string
  appendix: string
  sections: Map<DesignDocSectionKey, string>
}

export type MarkdownAst = HastRoot
