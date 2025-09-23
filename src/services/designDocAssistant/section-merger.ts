import { buildDesignDoc } from './template-builder'
import { normalizeHeadingText, parseDesignDoc } from './markdown-parser'
import type { DesignDocPlan, DesignDocSectionKey } from './types'

export function appendSectionContent(
  markdown: string,
  plan: DesignDocPlan,
  key: DesignDocSectionKey,
  addition: string,
) {
  const step = plan.find((item) => item.key === key)

  if (!step) {
    return markdown
  }

  const parsed = parseDesignDoc(markdown, plan)
  const placeholder = step.placeholder.trim()
  const existing = parsed.sections.get(key) ?? ''
  const normalizedExisting = existing && existing.trim() !== placeholder ? existing.trim() : ''
  const targetedAddition = extractSectionContent(addition, plan, key)
  const cleanedAddition = stripSectionArtifacts(targetedAddition, step.heading, placeholder)
  const nextContent = mergeSectionContent(normalizedExisting, cleanedAddition, placeholder)

  parsed.sections.set(key, nextContent || placeholder)

  return buildDesignDoc(parsed, plan)
}

export function extractSectionContent(
  content: string,
  plan: DesignDocPlan,
  key: DesignDocSectionKey,
): string {
  const trimmed = content.trim()

  if (!trimmed) {
    return ''
  }

  const containsDocHeading = /(^|\n)#\s+/.test(trimmed)
  const containsSectionHeading = /(^|\n)##\s+/.test(trimmed)

  if (!containsDocHeading && !containsSectionHeading) {
    return trimmed
  }

  try {
    const parsed = parseDesignDoc(trimmed, plan)
    const section = parsed.sections.get(key)

    if (typeof section === 'string' && section.trim()) {
      return section.trim()
    }

    if (section === '') {
      return ''
    }
  } catch (error) {
    console.warn('Failed to isolate design doc section from addition', error)
    return trimmed
  }

  return trimmed
}

export function stripSectionArtifacts(content: string, heading: string, placeholder: string) {
  const withoutHeading = removeLeadingHeadings(content, heading)
  const withoutPlaceholder = stripPlaceholderBlocks(withoutHeading, placeholder)
  const cleaned = dedupeBlocks(withoutPlaceholder)
  const trimmed = cleaned.trim()

  if (!trimmed) {
    return ''
  }

  return trimmed
}

export function removeLeadingHeadings(content: string, heading: string) {
  const lines = content.split('\n')
  const normalizedHeading = normalizeHeadingText(heading)

  while (lines.length > 0 && !lines[0].trim()) {
    lines.shift()
  }

  while (lines.length > 0 && /^#\s+/.test(lines[0].trim())) {
    lines.shift()

    while (lines.length > 0 && !lines[0].trim()) {
      lines.shift()
    }
  }

  if (lines.length > 0 && normalizeHeadingText(lines[0]) === normalizedHeading) {
    lines.shift()

    while (lines.length > 0 && !lines[0].trim()) {
      lines.shift()
    }
  }

  return lines.join('\n')
}

export function mergeSectionContent(existing: string, addition: string, placeholder: string) {
  const cleanedExisting = dedupeBlocks(stripPlaceholderBlocks(existing, placeholder)).trim()
  const cleanedAddition = dedupeBlocks(stripPlaceholderBlocks(addition, placeholder)).trim()

  if (!cleanedAddition) {
    return cleanedExisting
  }

  if (!cleanedExisting) {
    return cleanedAddition
  }

  const normalizedExisting = normalizeContent(cleanedExisting)
  const normalizedAddition = normalizeContent(cleanedAddition)

  if (normalizedExisting === normalizedAddition) {
    return cleanedExisting
  }

  if (normalizedAddition.includes(normalizedExisting)) {
    return cleanedAddition
  }

  if (normalizedExisting.includes(normalizedAddition)) {
    return cleanedExisting
  }

  const existingBlocks = splitIntoBlocks(cleanedExisting)
  const existingKeys = new Set(existingBlocks.map((block) => normalizeBlock(block)))
  const additionBlocks = splitIntoBlocks(cleanedAddition)
  const merged = [...existingBlocks]

  additionBlocks.forEach((block) => {
    const key = normalizeBlock(block)

    if (existingKeys.has(key)) {
      return
    }

    existingKeys.add(key)
    merged.push(block)
  })

  return merged.join('\n\n').trim()
}

export function splitIntoBlocks(value: string) {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}

export function normalizeBlock(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function normalizeContent(value: string) {
  return value
    .replace(/[*_\x60~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function stripPlaceholderBlocks(value: string, placeholder: string) {
  if (!value.trim()) {
    return ''
  }

  const normalizedPlaceholder = normalizeContent(placeholder)
  const blocks = splitIntoBlocks(value)
  const filtered = blocks.filter((block) => normalizeContent(block) !== normalizedPlaceholder)

  return filtered.join('\n\n')
}

export function dedupeBlocks(value: string) {
  if (!value.trim()) {
    return ''
  }

  const blocks = splitIntoBlocks(value)
  const seen = new Set<string>()
  const result: string[] = []

  blocks.forEach((block) => {
    const key = normalizeBlock(block)

    if (seen.has(key)) {
      return
    }

    seen.add(key)
    result.push(block)
  })

  return result.join('\n\n')
}
