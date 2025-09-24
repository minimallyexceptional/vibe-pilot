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
  readonly VITE_PROMT_OPTIMIZER_COMPLETIONS_URL?: string
  readonly VITE_PROMT_OPTIMIZER_MODEL?: string
  readonly VITE_VIBE_PILOT_COMPLETIONS_URL?: string
  readonly VITE_OPENAI_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
