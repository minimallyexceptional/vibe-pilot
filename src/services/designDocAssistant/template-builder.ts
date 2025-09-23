import type { DesignDocPlan, PlanContext, ParsedDesignDoc } from './types'

export const DEFAULT_PLACEHOLDER = '_Add notes from the chat to build out this section._'

export function createDesignDocTemplate(plan: DesignDocPlan, context: PlanContext) {
  const title = context.projectName ? context.projectName + ' — Design Document' : 'Design Document'
  const summary = context.projectSummary ? context.projectSummary.trim() : undefined
  const introLines = summary
    ? ['> ' + summary]
    : ['> Use the chat on the left to capture context, decisions, and rationale.']

  const sections = plan.map((step) => ['## ' + step.heading, step.placeholder]).flat()

  return ['# ' + title, '', ...introLines, '', ...sections, ''].join('\n')
}

export function buildDesignDoc(parsed: ParsedDesignDoc, plan: DesignDocPlan) {
  const lines: string[] = []
  const title = parsed.title ? parsed.title.trim() : 'Design Document'
  lines.push('# ' + title)
  lines.push('')

  if (parsed.preface) {
    lines.push(parsed.preface)
    lines.push('')
  }

  plan.forEach((step) => {
    lines.push('## ' + step.heading)
    const rawValue = parsed.sections.get(step.key)
    const normalized =
      rawValue && rawValue.trim() ? rawValue.trim() : step.placeholder || DEFAULT_PLACEHOLDER
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
