import { describe, expect, it } from 'vitest'

import {
  appendSectionContent,
  createDesignDocPlan,
  createDesignDocTemplate,
  parseDesignDoc,
} from './index'

const context = {
  projectName: 'Nightshift 2',
  projectSummary:
    'We plan to streamline the vibe coding process from first commit to final deployment.',
}

describe('appendSectionContent', () => {
  it('ignores doc-level scaffolding when merging new section content', () => {
    const plan = createDesignDocPlan(context)
    let document = createDesignDocTemplate(plan, context)

    const addition = [
      '# Nightshift 2 -- Design Document',
      '',
      '## Product Vision',
      '**North star**',
      'We plan to streamline the vibe coding process from first commit to final deployment.',
      '',
      '## Target Users',
      '- Product squads shipping nightly',
    ].join('\n')

    document = appendSectionContent(document, plan, 'vision', addition)

    const topLevelHeadings = document.match(/^#\s+/gm) ?? []
    expect(topLevelHeadings.length).toBe(1)

    const productVisionHeadings = document.match(/^##\s+Product Vision/gm) ?? []
    expect(productVisionHeadings.length).toBe(1)

    const parsed = parseDesignDoc(document, plan)
    expect(parsed.sections.get('vision')).toContain('North star')

    const usersPlaceholder = plan.find((step) => step.key === 'users')?.placeholder.trim()
    expect(parsed.sections.get('users')?.trim()).toBe(usersPlaceholder)
  })

  it('drops duplicate content when addition matches the current section', () => {
    const plan = createDesignDocPlan(context)
    let document = createDesignDocTemplate(plan, context)

    const sectionContent = [
      '**North star**',
      'We plan to streamline the vibe coding process from first commit to final deployment.',
    ].join('\n')

    document = appendSectionContent(document, plan, 'vision', sectionContent)
    const secondPass = appendSectionContent(document, plan, 'vision', sectionContent)

    expect(secondPass).toBe(document)
    const visionMatches = secondPass.match(/North star/g) ?? []
    expect(visionMatches.length).toBe(1)
  })

  it('merges new blocks without duplicating placeholders', () => {
    const plan = createDesignDocPlan(context)
    let document = createDesignDocTemplate(plan, context)

    const firstPass = appendSectionContent(
      document,
      plan,
      'metrics',
      'Leading indicator: deploy frequency',
    )

    const secondPass = appendSectionContent(
      firstPass,
      plan,
      'metrics',
      'Lagging indicator: reduced incident volume',
    )

    const parsed = parseDesignDoc(secondPass, plan)
    const metricsSection = parsed.sections.get('metrics') ?? ''

    expect(metricsSection).toContain('Leading indicator: deploy frequency')
    expect(metricsSection).toContain('Lagging indicator: reduced incident volume')
    expect(metricsSection).not.toContain('Track signals that prove the design is working')
  })
})
