import * as React from 'react'
import type { Story, StoryDefault } from '@ladle/react'

import { Badge, type BadgeProps } from './badge'

export default {
  title: 'Components/Badge',
} satisfies StoryDefault<BadgeProps>

export const Playground: Story<BadgeProps> = (props) => {
  return <Badge {...props} />
}

Playground.args = {
  children: 'New',
  variant: 'default',
}

export const Variants = () => {
  const badges = React.useMemo<
    Array<{ label: string; variant: NonNullable<BadgeProps['variant']> }>
  >(
    () => [
      { variant: 'default', label: 'Default' },
      { variant: 'secondary', label: 'Secondary' },
      { variant: 'outline', label: 'Outline' },
    ],
    [],
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      {badges.map(({ variant, label }) => (
        <Badge key={variant} variant={variant}>
          {label}
        </Badge>
      ))}
    </div>
  )
}
