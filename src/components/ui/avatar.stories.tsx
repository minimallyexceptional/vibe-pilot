import * as React from 'react'
import type { StoryDefault } from '@ladle/react'

import { Avatar, AvatarFallback, AvatarImage } from './avatar'

export default {
  title: 'Components/Avatar',
} satisfies StoryDefault

export const Playground = () => {
  return (
    <div className="flex items-center gap-6">
      <Avatar className="h-12 w-12">
        <AvatarImage
          src="https://avatars.dicebear.com/api/initials/Avery%20Parker.svg"
          alt="Avery Parker"
        />
        <AvatarFallback>AP</AvatarFallback>
      </Avatar>
      <Avatar className="h-12 w-12">
        <AvatarFallback>AP</AvatarFallback>
      </Avatar>
    </div>
  )
}
