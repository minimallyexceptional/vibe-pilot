import type { AnswersRecord, DesignDocPlan, DesignDocSectionKey, PlanContext } from './types'

export async function mockDesignDocExchange({
  plan,
  stepIndex,
  answer,
  answers,
  context,
}: {
  plan: DesignDocPlan
  stepIndex: number
  answer: string
  answers: AnswersRecord
  context: PlanContext
}): Promise<{
  acknowledgement: string
  nextQuestion?: { key: DesignDocSectionKey; text: string }
  completion?: string
}> {
  const step = plan[stepIndex]
  const updatedAnswers = { ...answers, [step.key]: answer }
  const acknowledgement = step.acknowledgement({ answer, answers: updatedAnswers, context })
  const nextStep = plan[stepIndex + 1]

  const nextQuestion = nextStep
    ? nextStep.question({ index: stepIndex + 1, answers: updatedAnswers, context })
    : undefined

  await new Promise((resolve) => {
    setTimeout(resolve, 600)
  })

  return {
    acknowledgement,
    nextQuestion: nextStep
      ? {
          key: nextStep.key,
          text: nextQuestion ?? '',
        }
      : undefined,
    completion: !nextStep
      ? 'That is a solid first pass. Keep iterating in the document on the right or ask for more prompts whenever you need.'
      : undefined,
  }
}

export function createIntroMessage(context: PlanContext) {
  const name = context.projectName || 'your project'
  const summary = context.projectSummary ? context.projectSummary.trim() : ''
  const focus = context.projectFocus ? context.projectFocus.trim() : ''

  const parts = [
    'I am your design doc copilot for ' +
      name +
      '. Let us capture the decisions that will unblock your build.',
  ]

  if (summary) {
    parts.push('Current context: ' + summary)
  }

  if (focus) {
    parts.push('We will keep an eye on ' + focus + ' as we go.')
  }

  parts.push('Answer each prompt and I will stitch the details into the document.')

  return parts.join(' ')
}
