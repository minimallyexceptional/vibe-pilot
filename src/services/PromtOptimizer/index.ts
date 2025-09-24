export type CodingAgent = 'Codex' | 'Cursor' | 'Claude Code'

export type MPCServerDescriptor = {
  Name: string
  Context: string
}

export type OptimizePromptOptions = {
  userPrompt: string
  agent: CodingAgent
  mpcServers: MPCServerDescriptor[]
  signal?: AbortSignal
}

type NormalizedMpcServer = {
  name: string
  context: string
}

const DEFAULT_MODEL = 'gpt-4o'

const AGENT_GUIDANCE: Record<CodingAgent, string> = {
  Codex:
    'Codex responds best to precise implementation details, code structure guidance, and explicit testing expectations. Highlight languages, frameworks, and success criteria.',
  Cursor:
    'Cursor is an IDE-native assistant. Break work into iterative steps, call out key files or commands, and show how to use in-editor tools or context awareness.',
  'Claude Code':
    'Claude Code thrives on well-organized instructions, scoped deliverables, and thoughtful guardrails. Emphasize careful reasoning, constraints, and review checkpoints.',
}

export async function optimizePrompt({
  userPrompt,
  agent,
  mpcServers,
  signal,
}: OptimizePromptOptions): Promise<string> {
  const trimmedPrompt = userPrompt.trim()
  if (!trimmedPrompt) {
    throw new Error('A user prompt is required to optimize.')
  }

  const completionsUrl = resolveCompletionsUrl()
  if (!completionsUrl) {
    throw new Error(
      'The prompt optimization service is not configured. Set VITE_PROMT_OPTIMIZER_COMPLETIONS_URL or VITE_VIBE_PILOT_COMPLETIONS_URL to your OpenAI proxy endpoint.',
    )
  }

  const normalizedServers = normalizeServers(mpcServers)
  const messages = buildPromptMessages({ agent, prompt: trimmedPrompt, servers: normalizedServers })
  const payload = {
    model: resolveModel(),
    temperature: 0.3,
    messages,
  }

  let response: Response
  try {
    response = await fetch(completionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new Error('Unable to reach the prompt optimization proxy.')
  }

  if (!response.ok) {
    const message = await parseProxyError(response)
    throw new Error(message ?? 'The prompt optimization proxy responded with an error.')
  }

  const data = (await response.json()) as {
    content?: string | null
    choices?: Array<{ message?: { content?: string | null } | null }>
  }

  const directContent = typeof data.content === 'string' ? data.content : null
  const optimized = (directContent ?? data.choices?.[0]?.message?.content ?? '').trim()

  if (!optimized) {
    throw new Error('The prompt optimization proxy returned an empty response. Try again shortly.')
  }

  return optimized
}

function resolveCompletionsUrl(): string | null {
  const explicit = import.meta.env.VITE_PROMT_OPTIMIZER_COMPLETIONS_URL?.trim()
  if (explicit) {
    return explicit
  }

  const vibePilotUrl = import.meta.env.VITE_VIBE_PILOT_COMPLETIONS_URL?.trim()
  if (vibePilotUrl) {
    return vibePilotUrl
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8787/v1/chat/completions'
  }

  return null
}

function resolveModel(): string {
  return (
    import.meta.env.VITE_PROMT_OPTIMIZER_MODEL?.trim() ||
    import.meta.env.VITE_OPENAI_MODEL?.trim() ||
    DEFAULT_MODEL
  )
}

function normalizeServers(servers: MPCServerDescriptor[]): NormalizedMpcServer[] {
  return servers
    .map((server) => ({
      name: server.Name?.trim() ?? '',
      context: server.Context?.trim() ?? '',
    }))
    .filter((server): server is NormalizedMpcServer => Boolean(server.name && server.context))
}

function buildPromptMessages({
  agent,
  prompt,
  servers,
}: {
  agent: CodingAgent
  prompt: string
  servers: NormalizedMpcServer[]
}) {
  const systemContent = [
    'You are an elite prompt engineer who rewrites software development prompts for coding agents.',
    `Target assistant: ${agent}.`,
    AGENT_GUIDANCE[agent],
    'Deliver a single, production-ready prompt optimized for the target assistant. Reference available MPC servers when they can help the work.',
    'Return only the optimized prompt with no additional commentary or roleplay.',
  ].join(' ')

  const serverSection =
    servers.length > 0
      ? [
          'MPC servers available:',
          ...servers.map((server) => `- ${server.name}: ${server.context}`),
        ].join('\n')
      : 'MPC servers available:\n- None provided; note when additional context would be helpful.'

  const userContent = [
    serverSection,
    '',
    'Rewrite the following user request so that it becomes a highly detailed, success-oriented brief for the target coding agent. Clarify deliverables, coding standards, tests, edge cases, and how to leverage MPC servers where applicable.',
    'Original prompt:',
    '"""',
    prompt,
    '"""',
  ].join('\n')

  return [
    { role: 'system' as const, content: systemContent },
    { role: 'user' as const, content: userContent },
  ]
}

async function parseProxyError(response: Response) {
  try {
    const data = await response.json()
    if (typeof data?.error?.message === 'string') {
      return data.error.message
    }
    if (typeof data?.message === 'string') {
      return data.message
    }
    return null
  } catch (error) {
    console.error('Failed to parse prompt optimizer error payload', error)
    return null
  }
}
