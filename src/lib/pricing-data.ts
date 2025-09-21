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
    name: 'Starter',
    price: '$0',
    priceSuffix: 'per month',
    description: 'Perfect for individuals exploring a new project or validating an idea.',
    features: [
      'Up to 3 live projects with fast builds',
      'Collaborative dashboard for 2 teammates',
      'Community Slack access and office hours',
      'Email support with 48 hour response time',
    ],
    cta: 'Start for free',
    href: '/sign-up',
    buttonVariant: 'outline',
  },
  {
    name: 'Growth',
    price: '$24',
    priceSuffix: 'per month',
    description: 'Built for growing teams that need advanced workflows and insight.',
    features: [
      'Unlimited projects with preview deployments',
      'Automation rules and branch-based environments',
      'Integrations with Slack, Linear, and GitHub',
      'Priority email and chat support',
    ],
    cta: 'Upgrade to Growth',
    href: '/sign-up',
    highlighted: true,
  },
  {
    name: 'Scale',
    price: '$79',
    priceSuffix: 'per month',
    description: 'For product-led organizations that require enterprise-grade controls.',
    features: [
      'SAML SSO and granular role-based permissions',
      'Uptime SLAs with dedicated success manager',
      'Regional edge deployments with analytics',
      'Quarterly architecture reviews and roadmap input',
    ],
    cta: 'Talk to sales',
    href: 'mailto:hello@example.com',
    external: true,
    buttonVariant: 'secondary',
  },
]
