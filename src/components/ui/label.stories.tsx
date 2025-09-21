import * as React from 'react'
import type { StoryDefault } from '@ladle/react'

import { Input } from './input'
import { Label } from './label'

export default {
  title: 'Components/Label',
} satisfies StoryDefault

export const Default = () => {
  const fieldId = React.useId()

  return (
    <div className="space-y-1">
      <Label htmlFor={fieldId}>Full name</Label>
      <Input id={fieldId} placeholder="Rendered using the shared input" />
    </div>
  )
}
