import type { ButtonProps } from '@/components/ui/button'

export type PricingPlan = {
  name: string
  price: string
  priceSuffix: string
  description: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
  external?: boolean
  buttonVariant?: ButtonProps['variant']
}

export const pricingPlans: PricingPlan[] = [
  {
    name: 'Night Owl',
    price: '$0',
    priceSuffix: 'per month',
    description: 'Perfect for personal experiments and capturing the rhythm of solo vibe sessions.',
    features: [
      'Up to 5 journal entries each night',
      'Energy and mood tracking across the week',
      'Personal ritual checklist with reminders',
      'Community prompts delivered every Sunday',
    ],
    cta: 'Start for free',
    href: '/sign-up',
    buttonVariant: 'outline',
  },
  {
    name: 'Flow State',
    price: '$24',
    priceSuffix: 'per month',
    description: 'Built for duos and small crews who want to sync their late-night breakthroughs.',
    features: [
      'Unlimited journal entries with shared tags',
      'Collaborative ritual library and templates',
      'Integrations with Spotify, Linear, and Slack',
      'Priority support with 12 hour response time',
    ],
    cta: 'Upgrade to Flow State',
    href: '/sign-up',
    highlighted: true,
  },
  {
    name: 'Constellation',
    price: '$68',
    priceSuffix: 'per month',
    description: 'For studios running overnight sprints that need advanced insights and controls.',
    features: [
      'Workspace analytics with vibe trend reporting',
      'Custom ritual frameworks and team coaching',
      'Single sign-on and granular access controls',
      'Dedicated success partner with quarterly reviews',
    ],
    cta: 'Talk to the team',
    href: 'mailto:hello@example.com',
    external: true,
    buttonVariant: 'secondary',
  },
]
