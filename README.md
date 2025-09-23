# Nightshift

Nightshift is a vibe coding companion experience built on the TanStack starter foundation. It pairs shadcn/ui primitives with React Router, React Query, Tailwind CSS, and Vite so you can explore mindful after-dark workflows while keeping the modern tooling you expect.

## Getting started

```bash
npm install
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173) to see the starter running. The `dev` script now launches both the Vite dev server and the local Vibe Pilot proxy; add `OPENAI_API_KEY` to `.env` (or export it) so the proxy can authenticate. Edit files inside `src/` to customize the experience—the dev server supports hot module replacement out of the box.

## Available scripts

- `npm run dev` – start the Vite dev server and the Vibe Pilot proxy together (requires `OPENAI_API_KEY`).
- `npm run dev:client` – run only the Vite dev server.
- `npm run build` – type-check the project and create a production build.
- `npm run preview` – preview the production build locally.
- `npm run vibe-pilot:proxy` – start the local OpenAI proxy for the Vibe Pilot chat feature.

## Vibe Pilot chat proxy

The Vibe Pilot route expects a server-side proxy to call OpenAI. To run the local proxy:

```bash
npm run vibe-pilot:proxy
```

The proxy reads `OPENAI_API_KEY` (and related settings) from `.env`, so add your key there first. By default it listens on port `8787`. The app reads `VITE_VIBE_PILOT_COMPLETIONS_URL` from `.env`, which is already set to `http://localhost:8787/v1/chat/completions` for local development. If your OpenAI account lacks access to the default `gpt-4o` model, override it via `VITE_OPENAI_MODEL` (client) and/or `OPENAI_MODEL` (proxy).

Environment tweaks:

- `OPENAI_MODEL` (optional) forces a default model when the client omits one.
- `VIBE_PILOT_PROXY_ORIGINS` (optional) sets an allow-list for CORS, e.g. `http://localhost:5173`.
- `OPENAI_BASE_URL` lets you point at Azure/OpenAI-compatible endpoints if needed.

## Project structure

```
.
├── components.json        # shadcn/ui configuration
├── src/
│   ├── components/
│   │   └── ui/             # Reusable shadcn/ui primitives (button, card, badge, ...)
│   ├── lib/utils.ts        # `cn` utility for className composition
│   ├── main.tsx            # Entry point that wires React Query and the router
│   ├── router.tsx          # Router configuration and layout shell
│   └── routes/
│       └── index.tsx       # Example route redesigned with shadcn/ui components
├── index.html              # Vite HTML entry
├── tailwind.config.ts      # Tailwind CSS theme tokens and scanning config
├── tsconfig*.json          # TypeScript configuration with `@/*` aliasing
└── vite.config.ts          # Vite configuration and module aliases
```

## What's inside

- [React](https://react.dev/) with TypeScript
- [TanStack Router](https://tanstack.com/router/latest) for declarative, type-safe routing
- [TanStack Query](https://tanstack.com/query/latest) for data synchronization and caching
- [shadcn/ui](https://ui.shadcn.com) components powered by [Tailwind CSS](https://tailwindcss.com)
- [Vite](https://vitejs.dev/) for lightning-fast builds and hot module replacement
- Devtools for both the router and React Query to aid development

Happy Nightshifting!
