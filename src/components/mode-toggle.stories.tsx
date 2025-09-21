import * as React from 'react'
import type { StoryDefault } from '@ladle/react'
import { useTheme } from 'next-themes'

import { ModeToggle } from './mode-toggle'

export default {
  title: 'Components/Mode Toggle',
} satisfies StoryDefault

function ThemeStatus() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <span className="text-muted-foreground">Detecting theme…</span>
  }

  return (
    <span className="font-medium text-primary">
      {resolvedTheme === 'dark' ? 'Dark' : 'Light'} mode active
    </span>
  )
}

export const Playground = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
      <ModeToggle />
      <p className="text-sm text-muted-foreground">
        Use the toggle above to switch between themes. Changes apply globally across the preview.
      </p>
      <ThemeStatus />
    </div>
  )
}
