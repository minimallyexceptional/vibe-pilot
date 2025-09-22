const DEFAULT_MODEL = 'gpt-4o-mini'

export type VibePilotMode = 'design' | 'collaboration'

export type VibePilotConfig = {
  mode: VibePilotMode
  projectName: string
  audience: string
  focusDetails: string
  tone: string
}

export type VibePilotChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type VibePilotCompletion = {
  content: string
  isMock: boolean
}

const model = import.meta.env.VITE_OPENAI_MODEL?.trim() || DEFAULT_MODEL
const completionsUrl = import.meta.env.VITE_VIBE_PILOT_COMPLETIONS_URL?.trim()

export async function requestVibePilotCompletion({
  history,
  config,
  signal,
}: {
  history: VibePilotChatMessage[]
  config: VibePilotConfig
  signal?: AbortSignal
}): Promise<VibePilotCompletion> {
  const systemPrompt = buildSystemPrompt(config)

  if (!completionsUrl) {
    return {
      content: buildMockResponse(history, config),
      isMock: true,
    }
  }

  const payload = {
    model,
    temperature: config.mode === 'design' ? 0.4 : 0.6,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...history.map((message) => ({ role: message.role, content: message.content })),
    ],
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

    throw new Error('Unable to reach the Vibe Pilot completion service.')
  }

  if (!response.ok) {
    const errorBody = await safeParseError(response)
    throw new Error(errorBody ?? 'The Vibe Pilot completion service responded with an error.')
  }

  const data = (await response.json()) as {
    content?: string | null
    choices?: Array<{
      message?: { content?: string | null }
    }>
  }

  const directContent = typeof data.content === 'string' ? data.content : null
  const content = (directContent ?? data.choices?.[0]?.message?.content)?.trim()

  if (!content) {
    throw new Error('The completion service returned an empty response. Try again in a moment.')
  }

  return {
    content,
    isMock: false,
  }
}

async function safeParseError(response: Response) {
  try {
    const data = await response.json()
    const message =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : typeof data?.message === 'string'
          ? data.message
          : null
    return message
  } catch (error) {
    console.error('Failed to parse completion error payload', error)
    return null
  }
}

function buildSystemPrompt(config: VibePilotConfig) {
  const audience = config.audience.trim() || 'a broad product team audience'
  const tone = config.tone.trim() || 'encouraging and pragmatic'

  const sharedIntro = `You are Vibe Pilot, an embedded AI copilot inside a product team's productivity dashboard. Speak with a ${tone} voice that feels collaborative, concise, and energizing. Reference the project name “${config.projectName}” when helpful. Always organize suggestions into clear sections, bullet lists, and next steps so the team can act immediately. Assume the primary audience is ${audience}.`

  if (config.mode === 'design') {
    return `${sharedIntro} Your main objective is to transform raw feature ideas into a detailed design document. Expand on feature descriptions, outline user journeys, call out UX states, edge cases, validation, and success metrics. Ask follow-up questions whenever you need clarification before committing to a plan. Make sure every recommendation is grounded in the provided focus details: ${config.focusDetails}`
  }

  return `${sharedIntro} Your main objective is to behave like a collaborative product strategist. Help the user explore new features, growth opportunities, and monetization strategies. Tie every suggestion back to activation, engagement, and retention loops. Highlight potential risks, dependencies, and measurable experiments. Use the provided focus details as your starting point: ${config.focusDetails}`
}

function buildMockResponse(history: VibePilotChatMessage[], config: VibePilotConfig) {
  const latestUserMessage = [...history].reverse().find((message) => message.role === 'user')
  const snippet = latestUserMessage?.content ?? config.focusDetails
  const trimmedSnippet = snippet
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)

  const formattedSnippet = trimmedSnippet.length
    ? trimmedSnippet.map((line) => `• ${line}`).join('\n')
    : '• (Add a prompt to give me more to work with.)'

  if (config.mode === 'design') {
    return [
      `Here's a starter design brief for ${config.projectName}.`,
      '',
      `Focus points I'm hearing:`,
      formattedSnippet,
      '',
      `What we can do next:`,
      '- Break the experience into major flows (happy path, recovery, edge states).',
      '- Define inputs, validation, and data requirements for each feature.',
      '- Capture success metrics so we know what “done” feels like.',
      '',
      '_This is a preview response generated without a live completion proxy. Set `VITE_VIBE_PILOT_COMPLETIONS_URL` to unlock real conversations._',
    ].join('\n')
  }

  return [
    `Let's co-create the next moves for ${config.projectName}.`,
    '',
    `Themes emerging from your notes:`,
    formattedSnippet,
    '',
    `Strategic plays to explore:`,
    '- Sketch one quick win feature that ships in under two weeks.',
    '- Outline a monetization or pricing experiment tied to the audience you mentioned.',
    '- Identify data to track so we can decide if the idea sticks.',
    '',
    '_This is a preview response generated without a live completion proxy. Set `VITE_VIBE_PILOT_COMPLETIONS_URL` to unlock real conversations._',
  ].join('\n')
}
