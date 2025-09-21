import * as React from 'react'
import type { Story, StoryDefault } from '@ladle/react'

import { Button, type ButtonProps } from './button'

export default {
  title: 'Components/Button',
} satisfies StoryDefault<ButtonProps>

export const Playground: Story<ButtonProps> = (props) => {
  return <Button {...props} />
}

Playground.args = {
  children: 'Primary action',
  variant: 'default',
  size: 'default',
}

export const Variants = () => {
  const variants = React.useMemo<
    Array<{ label: string; variant: NonNullable<ButtonProps['variant']> }>
  >(
    () => [
      { variant: 'default', label: 'Default' },
      { variant: 'secondary', label: 'Secondary' },
      { variant: 'outline', label: 'Outline' },
      { variant: 'ghost', label: 'Ghost' },
      { variant: 'link', label: 'Link' },
      { variant: 'destructive', label: 'Destructive' },
    ],
    [],
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      {variants.map(({ variant, label }) => (
        <Button key={variant} variant={variant}>
          {label}
        </Button>
      ))}
    </div>
  )
}

export const Sizes = () => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Icon button">
        <span className="text-lg" aria-hidden="true">
          👍
        </span>
      </Button>
    </div>
  )
}
