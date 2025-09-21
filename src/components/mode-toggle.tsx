import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const label = React.useMemo(() => {
    if (!mounted || !resolvedTheme) {
      return 'Toggle theme'
    }

    return resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  }, [mounted, resolvedTheme])

  const handleToggle = React.useCallback(() => {
    if (!mounted || !resolvedTheme) {
      return
    }

    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [mounted, resolvedTheme, setTheme])

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="relative h-9 w-9"
      onClick={handleToggle}
      aria-label={label}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
