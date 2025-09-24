import { describe, expect, it, vi } from 'vitest'

import { DesignDocumentService } from './service'

describe('DesignDocumentService', () => {
  it('initializes with provided document state', () => {
    const service = new DesignDocumentService({
      projectName: 'Lunar Interfaces',
      initialDocument: '# Hello\n',
      initialStatus: 'complete',
      initialSavedAt: '2024-01-01T00:00:00.000Z',
    })

    const state = service.getState()

    expect(state.document.trim()).toBe('# Hello')
    expect(state.status).toBe('complete')
    expect(state.hasUserInteracted).toBe(false)
    expect(state.messages.at(0)?.role).toBe('assistant')
  })

  it('records user messages and produces assistant responses with markdown updates', async () => {
    const request = vi.fn().mockResolvedValue({
      content: 'Chat:\nGreat start!\n\nDocument:\n# Intro\n\nWelcome to the doc.',
      isMock: false,
    })

    const service = new DesignDocumentService({
      projectName: 'Glow Deck',
      requestCompletion: request,
    })

    await service.sendMessage(' outline the kickoff ')

    const state = service.getState()
    const userMessage = state.messages.find((message) => message.role === 'user')
    const assistantMessage = state.messages.find(
      (message) => message.role === 'assistant' && message.id !== 'seed',
    )

    expect(userMessage?.content).toBe('outline the kickoff')
    expect(assistantMessage?.content).toContain('Great start!')
    expect(state.document).toContain('# Intro')
    expect(state.hasUserInteracted).toBe(true)
    expect(request).toHaveBeenCalledTimes(1)
    const call = request.mock.calls[0][0]
    expect(call.systemPrompt).toContain('Speak like a friendly product partner')
    expect(call.systemPrompt).toContain('Document section must be valid Markdown')
    expect(call.existingDocument).toBe('')
    expect(call.messages.at(-1)?.content).toBe('outline the kickoff')
  })

  it('normalizes markdown content to remove duplicate headings', async () => {
    const request = vi.fn().mockResolvedValue({
      content: 'Chat:\nHere is the cleaned draft.\n\nDocument:\n# Intro\n\n# Intro\nRepeated',
      isMock: false,
    })

    const service = new DesignDocumentService({
      projectName: 'Glow Deck',
      requestCompletion: request,
    })

    await service.sendMessage('please polish the intro')

    const state = service.getState()
    const introCount = state.document
      .split('\n')
      .filter((line) => line.trim().toLowerCase().startsWith('# intro')).length
    expect(introCount).toBe(1)
  })

  it('parses document section when chat references the word document', async () => {
    const request = vi.fn().mockResolvedValue({
      content: [
        'Chat:',
        'Here is a quick summary of the document: we clarified the flows.',
        '',
        'Document:',
        '# Plan',
        '',
        'Details about next steps.',
      ].join('\n'),
      isMock: false,
    })

    const service = new DesignDocumentService({
      projectName: 'Glow Deck',
      requestCompletion: request,
    })

    await service.sendMessage('summarize updates')

    const state = service.getState()
    const assistantMessage = state.messages.find(
      (message) => message.role === 'assistant' && message.id !== 'seed',
    )

    expect(assistantMessage?.content).toBe(
      'Here is a quick summary of the document: we clarified the flows.',
    )
    expect(state.document).toBe('# Plan\n\nDetails about next steps.')
  })

  it('parses document section when the label is indented', async () => {
    const request = vi.fn().mockResolvedValue({
      content: [
        'Chat:',
        'Captured the latest structure and applied the requested edits.',
        '',
        '    Document:',
        '# Updated Outline',
        '',
        '- Step one',
      ].join('\n'),
      isMock: false,
    })

    const service = new DesignDocumentService({
      projectName: 'Glow Deck',
      requestCompletion: request,
    })

    await service.sendMessage('reformat with indentation in the label')

    const state = service.getState()
    const assistantMessage = state.messages.find(
      (message) => message.role === 'assistant' && message.id !== 'seed',
    )

    expect(assistantMessage?.content).toBe(
      'Captured the latest structure and applied the requested edits.',
    )
    expect(state.document).toBe('# Updated Outline\n\n- Step one')
  })

  it('parses document section when the label is presented as a list item', async () => {
    const request = vi.fn().mockResolvedValue({
      content: [
        'Chat:',
        'Updated the outline and kept the previous context.',
        '',
        '- Document:',
        '# Plan',
        '',
        'Details for the next phase.',
      ].join('\n'),
      isMock: false,
    })

    const service = new DesignDocumentService({
      projectName: 'Glow Deck',
      requestCompletion: request,
    })

    await service.sendMessage('preserve the document but reply with a list label')

    const state = service.getState()
    const assistantMessage = state.messages.find(
      (message) => message.role === 'assistant' && message.id !== 'seed',
    )

    expect(assistantMessage?.content).toBe('Updated the outline and kept the previous context.')
    expect(state.document).toBe('# Plan\n\nDetails for the next phase.')
  })

  it('parses document section when the label appears as a heading', async () => {
    const request = vi.fn().mockResolvedValue({
      content: [
        'Chat:',
        'Captured the remaining ideas in the document section below.',
        '',
        '## Document:',
        '# Launch Checklist',
        '',
        '- Verify staging',
      ].join('\n'),
      isMock: false,
    })

    const service = new DesignDocumentService({
      projectName: 'Glow Deck',
      requestCompletion: request,
    })

    await service.sendMessage('format the document label as a heading')

    const state = service.getState()
    const assistantMessage = state.messages.find(
      (message) => message.role === 'assistant' && message.id !== 'seed',
    )

    expect(assistantMessage?.content).toBe(
      'Captured the remaining ideas in the document section below.',
    )
    expect(state.document).toBe('# Launch Checklist\n\n- Verify staging')
  })

  it('parses document updates when the assistant keeps the labels on the same line', async () => {
    const request = vi.fn().mockResolvedValue({
      content: [
        'Chat: Thanks for the reminder to reuse the saved draft. Document:',
        '# Ready Plan',
        '',
        'Key flows are intact.',
      ].join('\n'),
      isMock: false,
    })

    const service = new DesignDocumentService({
      projectName: 'Glow Deck',
      initialDocument: '# Ready Plan\n\nInitial version',
      requestCompletion: request,
    })

    await service.sendMessage('please restore the previous outline without changes')

    const state = service.getState()
    const assistantMessage = state.messages.find(
      (message) => message.role === 'assistant' && message.id !== 'seed',
    )

    expect(assistantMessage?.content).toBe('Thanks for the reminder to reuse the saved draft.')
    expect(state.document).toBe('# Ready Plan\n\nKey flows are intact.')
  })

  it('tracks save events and allows reset and finalize flows', () => {
    const service = new DesignDocumentService({
      projectName: 'Glow Deck',
      initialDocument: '# Draft',
      initialSavedAt: '2024-04-01T08:00:00.000Z',
    })

    service.markSaved('2024-04-01T08:00:00.000Z')
    service.finalize('2024-04-02T10:30:00.000Z')

    let state = service.getState()
    expect(state.status).toBe('complete')
    expect(state.lastSavedAt).toBe('2024-04-02T10:30:00.000Z')

    service.reset()

    state = service.getState()
    expect(state.document).toBe('')
    expect(state.status).toBe('draft')
    expect(state.hasUserInteracted).toBe(false)
    expect(state.messages.length).toBeGreaterThan(0)
  })

  it('ignores pending completion results after a reset', async () => {
    let resolveCompletion: ((value: { content: string; isMock: boolean }) => void) | undefined
    const request = vi.fn().mockImplementation(
      () =>
        new Promise<{ content: string; isMock: boolean }>((resolve) => {
          resolveCompletion = resolve
        }),
    )

    const service = new DesignDocumentService({
      projectName: 'Glow Deck',
      requestCompletion: request,
    })

    const pending = service.sendMessage('Capture the main flows')

    service.reset()

    if (!resolveCompletion) {
      throw new Error('Expected completion resolver to be defined')
    }

    resolveCompletion({
      content: 'Chat:\nAll set.\n\nDocument:\n# Should not appear',
      isMock: false,
    })

    await pending

    const state = service.getState()

    expect(state.document).toBe('')
    expect(state.messages).toHaveLength(1)
    expect(state.messages[0]?.id).toBe('seed')
    expect(state.isGenerating).toBe(false)
    expect(state.hasUserInteracted).toBe(false)
  })

  it('preserves finalized state when later completions resolve', async () => {
    let resolveCompletion: ((value: { content: string; isMock: boolean }) => void) | undefined
    const request = vi.fn().mockImplementation(
      () =>
        new Promise<{ content: string; isMock: boolean }>((resolve) => {
          resolveCompletion = resolve
        }),
    )

    const service = new DesignDocumentService({
      projectName: 'Glow Deck',
      initialDocument: '# Draft',
      requestCompletion: request,
    })

    const pending = service.sendMessage('Please finalize the plan')

    service.finalize('2024-05-01T12:00:00.000Z')

    if (!resolveCompletion) {
      throw new Error('Expected completion resolver to be defined')
    }

    resolveCompletion({
      content: 'Chat:\nDone!\n\nDocument:\n# Replacement draft',
      isMock: false,
    })

    await pending

    const state = service.getState()

    expect(state.status).toBe('complete')
    expect(state.lastSavedAt).toBe('2024-05-01T12:00:00.000Z')
    expect(state.document).toBe('# Draft')
    expect(
      state.messages.filter((message) => message.role === 'assistant' && message.id !== 'seed')
        .length,
    ).toBe(0)
    expect(state.isGenerating).toBe(false)
  })
})
