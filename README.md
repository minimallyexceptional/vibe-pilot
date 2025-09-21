# Vibe TanStack Starter

This repository now ships a polished TanStack starter that layers shadcn/ui primitives on top of React Router, React Query, Tailwind CSS, and Vite so you can jump straight into building modern front-end experiences.

## Getting started

```bash
npm install
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173) to see the starter running. Edit files inside `src/` to customize the experience—the dev server supports hot module replacement out of the box.

## Available scripts

- `npm run dev` – start the Vite dev server.
- `npm run build` – type-check the project and create a production build.
- `npm run preview` – preview the production build locally.

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

Happy building!
