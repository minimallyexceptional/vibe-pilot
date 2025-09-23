import type { DesignDocPlan, DesignDocSectionKey, ParsedDesignDoc } from './types'

export function parseDesignDoc(markdown: string, plan: DesignDocPlan): ParsedDesignDoc {
  const headingMap = new Map<string, DesignDocSectionKey>(
    plan.map((step) => [step.heading.toLowerCase(), step.key]),
  )

  const normalized = markdown.replace(/\r/g, '')
  const titleMatch = normalized.match(/^\s*#\s+(.+?)\s*$/m)
  const title = titleMatch ? titleMatch[1].trim() : 'Design Document'
  const contentWithoutTitle = titleMatch
    ? normalized.replace(titleMatch[0], '').trimStart()
    : normalized.trimStart()

  const sections = new Map<DesignDocSectionKey, string>()
  plan.forEach((step) => {
    sections.set(step.key, '')
  })

  const sectionRegex = /^##\s+(.+?)\s*$/m
  const lines = contentWithoutTitle.split('\n')
  let currentKey: DesignDocSectionKey | null = null
  let currentBuffer: string[] = []
  const prefaceBuffer: string[] = []
  const appendixBuffer: string[] = []
  let hasSeenKnownSection = false

  const flushSection = () => {
    if (!currentKey) {
      return
    }

    const raw = currentBuffer.join('\n').trim()
    sections.set(currentKey, raw)
    currentKey = null
    currentBuffer = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const headingMatch = line.match(sectionRegex)

    if (headingMatch) {
      flushSection()

      const headingText = headingMatch[1].trim()
      const key = headingMap.get(headingText.toLowerCase())

      if (key) {
        currentKey = key
        currentBuffer = []
        hasSeenKnownSection = true
      } else {
        if (!hasSeenKnownSection) {
          prefaceBuffer.push(line)
        } else {
          appendixBuffer.push(line)
        }
      }

      continue
    }

    if (currentKey) {
      currentBuffer.push(line)
    } else if (!hasSeenKnownSection) {
      prefaceBuffer.push(line)
    } else {
      appendixBuffer.push(line)
    }
  }

  flushSection()

  return {
    title,
    preface: prefaceBuffer.join('\n').trim(),
    appendix: appendixBuffer.join('\n').trim(),
    sections,
  }
}

export function normalizeHeadingText(value: string) {
  return value
    .replace(/^\s*>+\s*/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/[*_\x60~]/g, '')
    .replace(/[-:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}
