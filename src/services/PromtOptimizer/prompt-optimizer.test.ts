import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('optimizePrompt', () => {
  const completionsUrl = 'https://proxy.test/v1/chat/completions'

  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_PROMT_OPTIMIZER_COMPLETIONS_URL', completionsUrl)
    vi.stubEnv('VITE_PROMT_OPTIMIZER_MODEL', 'gpt-4o')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('sends a formatted optimization request to the proxy', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: 'Optimized prompt for Cursor' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { optimizePrompt } = await import('./index')

    const optimized = await optimizePrompt({
      userPrompt: 'Build a dashboard for tracking KPIs',
      agent: 'Cursor',
      mpcServers: [
        { Name: 'Context7', Context: 'Use Context7 to reference all documentation' },
        { Name: 'MetricsDB', Context: 'Holds KPI calculation guidelines' },
      ],
    })

    expect(optimized).toBe('Optimized prompt for Cursor')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(completionsUrl)
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    })

    const body = JSON.parse(String(init?.body))
    expect(body.model).toBe('gpt-4o')
    expect(body.messages).toHaveLength(2)
    const [systemMessage, userMessage] = body.messages
    expect(systemMessage).toMatchObject({ role: 'system' })
    expect(systemMessage.content).toContain('Cursor')
    expect(userMessage.content).toContain('Build a dashboard for tracking KPIs')
    expect(userMessage.content).toContain('Context7')
    expect(userMessage.content).toContain('MetricsDB')
  })

  it('falls back to the first choice message when content is not provided directly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: 'Refined prompt for Codex' } },
          { message: { content: 'Another option' } },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { optimizePrompt } = await import('./index')

    const optimized = await optimizePrompt({
      userPrompt: 'Refactor the authentication module',
      agent: 'Codex',
      mpcServers: [],
    })

    expect(optimized).toBe('Refined prompt for Codex')
  })

  it('throws a helpful error when the proxy responds with an error message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Upstream failure' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { optimizePrompt } = await import('./index')

    await expect(
      optimizePrompt({
        userPrompt: 'Implement a realtime notification service',
        agent: 'Claude Code',
        mpcServers: [],
      }),
    ).rejects.toThrow('Upstream failure')
  })

  it('requires a non-empty user prompt', async () => {
    const { optimizePrompt } = await import('./index')

    await expect(
      optimizePrompt({
        userPrompt: '   ',
        agent: 'Cursor',
        mpcServers: [],
      }),
    ).rejects.toThrow('A user prompt is required to optimize.')
  })
})
