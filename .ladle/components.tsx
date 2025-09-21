import * as React from 'react'
import type { Provider as LadleProvider } from '@ladle/react'

import '@/styles.css'
import { ThemeProvider } from '@/components/theme-provider'

type ProviderProps = Parameters<LadleProvider>[0] & { children: React.ReactNode }

export const Provider: LadleProvider = ({ children }: ProviderProps) => {
  return <ThemeProvider>{children}</ThemeProvider>
}
