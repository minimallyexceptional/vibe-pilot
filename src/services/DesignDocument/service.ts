import { unified } from 'unified'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'

import type { ProjectDesignDocumentStatus } from '@/lib/projects'

type MessageRole = 'user' | 'assistant'

type CompletionPayload = {
  systemPrompt: string
  messages: Array<{ role: MessageRole; content: string }>
  existingDocument: string
  signal?: AbortSignal
}

type CompletionResponse = {
  content: string
  isMock: boolean
}

type RequestCompletion = (payload: CompletionPayload) => Promise<CompletionResponse>

type DesignDocumentServiceOptions = {
  projectName: string
  initialDocument?: string
  initialStatus?: ProjectDesignDocumentStatus
  initialSavedAt?: string | null
  requestCompletion?: RequestCompletion
}

export type DesignDocumentMessage = {
  id: string
  role: MessageRole
  content: string
}

export type DesignDocumentServiceState = {
  messages: DesignDocumentMessage[]
  document: string
  status: ProjectDesignDocumentStatus
  isGenerating: boolean
  hasUserInteracted: boolean
  lastSavedAt: string | null
}

const DEFAULT_MODEL = 'gpt-4o'
const SEED_MESSAGE_ID = 'seed'

const model = import.meta.env.VITE_OPENAI_MODEL?.trim() || DEFAULT_MODEL
const completionsUrl =
  import.meta.env.VITE_VIBE_PILOT_COMPLETIONS_URL?.trim() ||
  (import.meta.env.DEV ? 'http://localhost:8787/v1/chat/completions' : undefined)

export class DesignDocumentService {
  private readonly projectName: string
  private readonly requestCompletion: RequestCompletion
  private readonly listeners = new Set<(state: DesignDocumentServiceState) => void>()
  private state: DesignDocumentServiceState
  private activeRequestId: string | null = null

  constructor(options: DesignDocumentServiceOptions) {
    this.projectName = options.projectName.trim() || 'Untitled project'
    this.requestCompletion = options.requestCompletion ?? defaultRequestCompletion

    const initialDocument = normalizeDocument(options.initialDocument ?? '')
    const initialStatus: ProjectDesignDocumentStatus = options.initialStatus ?? 'draft'

    this.state = {
      messages: [createSeedMessage(this.projectName)],
      document: initialDocument,
      status: initialStatus,
      isGenerating: false,
      hasUserInteracted: false,
      lastSavedAt: options.initialSavedAt ?? null,
    }
  }

  getState(): DesignDocumentServiceState {
    return this.state
  }

  subscribe(listener: (state: DesignDocumentServiceState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state)

    return () => {
      this.listeners.delete(listener)
    }
  }

  async sendMessage(content: string, options?: { signal?: AbortSignal }): Promise<void> {
    const trimmed = content.trim()

    if (!trimmed) {
      return
    }

    if (this.state.isGenerating) {
      throw new Error('A response is already being generated.')
    }

    const requestId = createId('completion')
    this.activeRequestId = requestId

    const userMessage: DesignDocumentMessage = {
      id: createId('user'),
      role: 'user',
      content: trimmed,
    }

    this.updateState({
      messages: [...this.state.messages, userMessage],
      hasUserInteracted: true,
      isGenerating: true,
    })

    try {
      const payload: CompletionPayload = {
        systemPrompt: this.buildSystemPrompt(),
        messages: this.state.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        existingDocument: this.state.document,
        signal: options?.signal,
      }

      const completion = await this.requestCompletion(payload)
      const parsed = parseAssistantResponse(completion.content)

      if (this.activeRequestId !== requestId) {
        return
      }

      const assistantMessage: DesignDocumentMessage = {
        id: createId('assistant'),
        role: 'assistant',
        content: parsed.chat,
      }

      const nextMessages = [...this.state.messages, assistantMessage]
      const nextDocument = parsed.document
        ? normalizeDocument(parsed.document)
        : this.state.document

      this.activeRequestId = null
      this.updateState({
        messages: nextMessages,
        document: nextDocument,
        isGenerating: false,
      })
    } catch (error) {
      if (this.activeRequestId === requestId) {
        this.activeRequestId = null
        this.updateState({ isGenerating: false })
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      throw error instanceof Error ? error : new Error('Unable to generate a response.')
    }
  }

  setDocument(content: string) {
    const normalized = normalizeDocument(content)

    this.updateState({
      document: normalized,
      hasUserInteracted: this.state.hasUserInteracted || normalized.length > 0,
    })
  }

  markSaved(timestamp: string) {
    this.updateState({ lastSavedAt: timestamp })
  }

  finalize(timestamp: string) {
    this.activeRequestId = null
    this.updateState({ status: 'complete', lastSavedAt: timestamp, isGenerating: false })
  }

  reset() {
    this.activeRequestId = null
    this.state = {
      messages: [createSeedMessage(this.projectName)],
      document: '',
      status: 'draft',
      isGenerating: false,
      hasUserInteracted: false,
      lastSavedAt: null,
    }
    this.emit()
  }

  private buildSystemPrompt() {
    const existingDocument = this.state.document.trim()
    const documentSection = existingDocument
      ? `Current design document draft (keep structure unless the user asks to restructure):\n${existingDocument}\n\n`
      : 'Current design document draft: (empty)\n\n'

    return [
      'You are Nightshift, a design document partner helping a non-technical founder capture a polished plan.',
      `Project name: ${this.projectName}.`,
      documentSection,
      'Speak like a friendly product partner. Use warm, plain language and short paragraphs.',
      'Ask at most one simple follow-up question if you truly need more detail. Keep it easy to answer.',
      'Respond using two sections labeled exactly as "Chat:" and "Document:".',
      'The Chat section should summarize progress, highlight what changed, and gently guide the next question.',
      'The Document section must be valid Markdown ready to share with stakeholders. Preserve helpful context from the current draft and tighten phrasing instead of duplicating sections.',
      'Ensure headings remain unique. Remove duplicate or empty sections.',
      'Focus on clarity: goals, requirements, users, flows, success signals, risks, and next steps.',
    ].join('\n')
  }

  private updateState(partial: Partial<DesignDocumentServiceState>) {
    this.state = { ...this.state, ...partial }
    this.emit()
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }
}

function createSeedMessage(projectName: string): DesignDocumentMessage {
  return {
    id: SEED_MESSAGE_ID,
    role: 'assistant',
    content: [
      `Hey there! Let’s capture the essentials for ${projectName}.`,
      'Share what you are building, who it is for, and any must-have outcomes. I’ll turn it into a clean design doc.',
    ].join(' '),
  }
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeDocument(input: string) {
  let cleaned = input

  try {
    const processed = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkStringify, { bullet: '-', fences: true, listItemIndent: 'one' })
      .processSync(input)
    cleaned = String(processed)
  } catch (error) {
    console.error('Failed to normalize markdown with remark', error)
  }

  const normalized = cleaned.replace(/\r\n/g, '\n').split('\n')
  const result: string[] = []
  let previousBlank = false
  let lastHeadingSlug: string | null = null

  for (const rawLine of normalized) {
    const line = rawLine.replace(/\s+$/g, '')
    const trimmed = line.trim()

    if (!trimmed) {
      if (!previousBlank && result.length > 0) {
        result.push('')
      }
      previousBlank = true
      continue
    }

    const headingMatch = /^#{1,6}\s+/.test(trimmed)
    if (headingMatch) {
      const slug = trimmed.replace(/\s+/g, ' ').toLowerCase()

      if (slug === lastHeadingSlug) {
        previousBlank = false
        continue
      }

      lastHeadingSlug = slug
    } else {
      lastHeadingSlug = null
    }

    result.push(line)
    previousBlank = false
  }

  return result.join('\n').trim()
}

function parseAssistantResponse(raw: string) {
  const normalized = raw.replace(/\r\n/g, '\n').trim()

  if (!normalized) {
    return { chat: 'I captured your notes.', document: '' }
  }

  const docLabel =
    /^\s*(?:> ?)*?(?:[-*+]\s+|\d+\.\s+|#{1,6}\s+)?(?:[*_`~]{0,3})?Document(?:[*_`~]{0,3})?\s*:/im
  const docMatch = docLabel.exec(normalized)

  if (!docMatch) {
    const chat = normalized.replace(/^Chat\s*:/i, '').trim() || normalized
    return { chat, document: '' }
  }

  const index = docMatch.index
  const before = normalized.slice(0, index)
  const after = normalized.slice(index + docMatch[0].length)

  const chat = before.replace(/^Chat\s*:/i, '').trim() || 'Here’s the latest update.'
  const document = after.trim()

  return { chat, document }
}

const defaultRequestCompletion: RequestCompletion = async ({
  systemPrompt,
  messages,
  existingDocument: _existingDocument,
  signal,
}) => {
  void _existingDocument

  if (!completionsUrl) {
    const mock = buildMockResponse(messages)
    return { content: mock, isMock: true }
  }

  const payload = {
    model,
    temperature: 0.4,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((message) => ({ role: message.role, content: message.content })),
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
    throw new Error('Unable to reach the design document completion service.')
  }

  if (!response.ok) {
    const body = await safeParseError(response)
    throw new Error(body ?? 'The completion service returned an error.')
  }

  const data = (await response.json()) as {
    content?: string | null
    choices?: Array<{ message?: { content?: string | null } }>
  }

  const directContent = typeof data.content === 'string' ? data.content : null
  const content = (directContent ?? data.choices?.[0]?.message?.content)?.trim()

  if (!content) {
    throw new Error('The completion service returned an empty response. Try again shortly.')
  }

  return { content, isMock: false }
}

function buildMockResponse(messages: Array<{ role: MessageRole; content: string }>) {
  const latestUser = [...messages].reverse().find((message) => message.role === 'user')
  const snippet = latestUser?.content ?? ''
  const points = snippet
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((line) => `- ${line}`)

  const outline = points.length
    ? points.join('\n')
    : '- Outline the purpose of this release.\n- Capture who benefits and how success is measured.'

  return [
    'Chat:',
    'Here’s a quick draft so you can keep working while the live AI connection is offline.',
    'Add more detail and I’ll reshape the sections for you.',
    '',
    'Document:',
    '# Design Overview',
    '',
    '## Summary',
    outline,
    '',
    '## Open Questions',
    '- What decisions still need feedback?',
    '- Which risks should we call out for stakeholders?',
  ].join('\n')
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
    console.error('Failed to parse design document completion error payload', error)
    return null
  }
}
