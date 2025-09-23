import * as React from 'react'
import type { Story, StoryDefault } from '@ladle/react'

import { Textarea, type TextareaProps } from './textarea'
import { Label } from './label'

export default {
  title: 'Components/Textarea',
} satisfies StoryDefault<TextareaProps>

export const Playground: Story<TextareaProps> = (props) => {
  return <Textarea {...props} />
}

Playground.args = {
  placeholder: 'Sketch the flow or jot down your notes',
}

export const WithLabel = () => {
  const textareaId = React.useId()

  return (
    <div className="space-y-2">
      <Label htmlFor={textareaId}>Design notes</Label>
      <Textarea id={textareaId} placeholder="Capture the core interaction." />
    </div>
  )
}

export const Disabled = () => {
  return <Textarea placeholder="Textarea is disabled" disabled />
}
