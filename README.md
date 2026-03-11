# Kassen

Danmarks nemmeste budgetværktøj. Beregn dit rådighedsbeløb gratis på 3 minutter – ingen login, 100% privat.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix UI primitives)
- **Supabase** (auth, database, edge functions)
- **TanStack Query** for server state
- **React Router v6** for routing
- **PWA** via vite-plugin-pwa

## Getting started

```sh
bun install
bun run dev
```

## Available scripts

| Script | Description |
|---|---|
| `bun run dev` | Start dev server on port 8080 |
| `bun run build` | Production build |
| `bun run preview` | Preview production build locally |
| `bun run lint` | Run ESLint |
| `bun run test` | Run tests once |
| `bun run test:watch` | Run tests in watch mode |

## Project structure

```
src/
  components/
    dashboard/   # Budget dashboard views and charts
    onboarding/  # Onboarding flow
    ui/          # shadcn/ui primitives
  hooks/         # Custom React hooks
  integrations/
    supabase/    # Supabase client and generated types
  lib/           # Business logic, utilities, i18n
  pages/         # Route-level page components
  data/          # Static data (price database)
supabase/
  functions/     # Edge functions (AI, market data, etc.)
  migrations/    # Database migrations
```

## Environment variables

Copy `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
