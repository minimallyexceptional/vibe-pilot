/// <reference types="vite/client" />
/// <reference types="vitest" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  readonly VITE_STRIPE_PRICE_ID_STARTER?: string
  readonly VITE_STRIPE_PRICE_ID_GROWTH?: string
  readonly VITE_STRIPE_PRICE_ID_SCALE?: string
  readonly VITE_STRIPE_SUCCESS_URL?: string
  readonly VITE_STRIPE_CANCEL_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
