import { describe, expect, it } from 'vitest'

import {
  buildDesignDoc,
  createDesignDocPlan,
  createDesignDocTemplate,
  parseDesignDoc,
} from './index'

const context = {
  projectName: 'Aurora',
  projectSummary: 'A collaborative design workspace.',
}

describe('template builder', () => {
  it('creates a template that includes the project summary', () => {
    const plan = createDesignDocPlan(context)
    const template = createDesignDocTemplate(plan, context)

    expect(template).toContain('# Aurora — Design Document')
    expect(template).toContain('> A collaborative design workspace.')
    expect(template).toContain('## Product Vision')
  })

  it('reconstructs a document using plan placeholders for empty sections', () => {
    const plan = createDesignDocPlan(context)
    const template = createDesignDocTemplate(plan, context)
    const parsed = parseDesignDoc(template, plan)

    parsed.sections.set('vision', '**North star**\nDeliver shared context in minutes.')

    const rebuilt = buildDesignDoc(parsed, plan)

    expect(rebuilt).toContain('**North star**\nDeliver shared context in minutes.')
    expect(rebuilt).toContain('_Describe the primary personas and their needs._')
  })
})
