# Agent Guidelines

## Repository map

- `.github/workflows/` – CI definitions that lint, type-check, test, and build the project.
- `.husky/` – Git hooks configured to run lint-staged before commits.
- `.ladle/` – Story configuration for documenting UI primitives.
- `components.json` – shadcn/ui generator settings.
- `src/components/` – Theme providers, Ladle stories, and shadcn-based primitives under `ui/`.
- `src/lib/` – Shared utilities such as the Clerk adapter and Tailwind helper.
- `src/routes/` – TanStack Router route files for marketing and app flows.
- `src/main.tsx` and `src/router.tsx` – Application bootstrap and router shell.
- Root configs: `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`, `prettier.config.cjs`, `tsconfig*.json`, and `vite.config.ts`.

## Technology stack

The starter uses React 18 with TypeScript on top of Vite. Routing and data fetching rely on TanStack Router, TanStack Query, and TanStack Form. Styling comes from Tailwind CSS with shadcn/ui primitives. Authentication is wired through Clerk with a mock fallback when `VITE_CLERK_PUBLISHABLE_KEY` is unset. Ladle provides component docs, Vitest covers testing, and ESLint + Prettier enforce code quality with Husky and lint-staged running on commits. Keep changes compatible with this toolchain.

## Planning and scope

Plan before changing files and favor incremental updates that extend existing patterns. Understand how your change touches router routes, shared UI components, and authentication wrappers so the experience stays cohesive.

## UI expectations

Compose UI from shadcn/ui primitives or existing wrappers. If you add or adjust components, ensure the corresponding Ladle stories exist or are updated to reflect the design system.

## Code quality

Follow the existing TypeScript, ESLint, and Prettier conventions. Run the relevant npm scripts—`npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`—when your change warrants validation to maintain CI parity.
