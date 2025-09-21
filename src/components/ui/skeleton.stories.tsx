import * as React from 'react'
import type { StoryDefault } from '@ladle/react'

import { Skeleton } from './skeleton'

export default {
  title: 'Components/Skeleton',
} satisfies StoryDefault

export const LoadingList = () => {
  const placeholders = React.useMemo(() => Array.from({ length: 3 }), [])

  return (
    <div className="space-y-6">
      {placeholders.map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export const WithCustomHeight = () => {
  return <Skeleton className="h-48 w-full" />
}
