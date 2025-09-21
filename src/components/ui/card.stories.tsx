import * as React from 'react'
import type { StoryDefault } from '@ladle/react'

import { Button } from './button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

export default {
  title: 'Components/Card',
} satisfies StoryDefault

export const Showcase = () => {
  const benefits = React.useMemo(
    () => [
      'Unlimited boards and advanced roles',
      'Insights dashboards for real-time analytics',
      'Priority support with a dedicated success manager',
    ],
    [],
  )

  return (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Pro Workspace</CardTitle>
        <CardDescription>Everything you need to collaborate without limits.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm text-muted-foreground">
          {benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">$24/month</p>
          <p className="text-xs text-muted-foreground">Billed annually</p>
        </div>
        <Button>Upgrade</Button>
      </CardFooter>
    </Card>
  )
}
