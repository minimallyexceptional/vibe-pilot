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
})
