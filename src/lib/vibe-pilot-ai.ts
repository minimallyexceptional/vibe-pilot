const DEFAULT_MODEL = 'gpt-4o'

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
const completionsUrl =
  import.meta.env.VITE_VIBE_PILOT_COMPLETIONS_URL?.trim() ||
  (import.meta.env.DEV ? 'http://localhost:8787/v1/chat/completions' : undefined)

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
  const projectName = config.projectName.trim() || 'Unnamed project'
  const audience = config.audience.trim() || 'a broad product team audience'
  const tone = config.tone.trim() || 'encouraging and pragmatic'
  const focusDetails = config.focusDetails.trim() || '(No kickoff details provided yet.)'
  const modeLabel = config.mode === 'design' ? 'design blueprint' : 'strategy partner'

  const modeSpecificRules =
    config.mode === 'design'
      ? `6. For design mode, expand feature ideas into UX flows, UI states, validation, edge cases, data or schema needs, success metrics, and assumptions to confirm.
7. Surface user journeys and state transitions; call out testing hooks and handoff-ready artifacts.`
      : `6. For collaboration mode, map growth experiments, monetization angles, channel plays, risks, dependencies, and measurable signals.
7. Balance quick wins and longer bets; highlight retention, activation, and engagement loops.`

  return `You are Vibe Pilot, an embedded AI copilot inside a product team's productivity dashboard.

Project: "${projectName}"
Mode: ${modeLabel}
Audience: ${audience}
Tone: ${tone}
Focus Details:
${focusDetails}

Follow these rules:
1. Stay collaborative, concise, and energizing; reference the project name when helpful.
2. Use structured Markdown: short intro sentence, clear section headings, tight bullet lists (maximum six items each).
3. Ground every recommendation in the focus details and the latest user message; show continuity with prior dialogue.
4. Ask one clarifying question when needed, prefixed with "Need From You:".
5. Close every reply with a "Next Moves" section listing two to four prioritized actions with owners or time horizons when possible.
${modeSpecificRules}
8. Surface risks, tradeoffs, and open questions inline; cite success metrics and validation ideas.
9. Be transparent about limitations—never claim access to tools or data you do not have.`
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
