import * as React from 'react'
import type { Story, StoryDefault } from '@ladle/react'

import { Input, type InputProps } from './input'
import { Label } from './label'

export default {
  title: 'Components/Input',
} satisfies StoryDefault<InputProps>

export const Playground: Story<InputProps> = (props) => {
  return <Input {...props} />
}

Playground.args = {
  placeholder: 'Enter your email',
  type: 'email',
}

export const WithLabel = () => {
  const inputId = React.useId()

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Email</Label>
      <Input id={inputId} type="email" placeholder="hello@example.com" />
    </div>
  )
}

export const Disabled = () => {
  return <Input placeholder="Disabled input" disabled />
}
