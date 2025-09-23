import { describe, expect, it } from 'vitest'

import { createDesignDocPlan, parseDesignDoc } from './index'

const context = {
  projectName: 'Aurora',
}

describe('parseDesignDoc', () => {
  it('captures preface and appendix blocks outside the known plan', () => {
    const plan = createDesignDocPlan(context)
    const markdown = [
      '# Aurora — Design Document',
      '',
      'Preface content line',
      '',
      '## Product Vision',
      'Vision body',
      '',
      '## Unexpected Section',
      'This belongs in the appendix.',
    ].join('\n')

    const parsed = parseDesignDoc(markdown, plan)

    expect(parsed.title).toBe('Aurora — Design Document')
    expect(parsed.preface).toContain('Preface content line')
    expect(parsed.appendix).toContain('## Unexpected Section')
    expect(parsed.sections.get('vision')).toBe('Vision body')
  })
})
