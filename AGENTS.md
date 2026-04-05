# AGENTS.md — NemtBudget.nu Operational Guide

## Build & Run

```bash
npm install          # Install dependencies
npm run dev          # Dev server (usually localhost:5173)
npm run build        # Production build — MUST pass with zero errors
npm run preview      # Preview production build locally
```

## Tests

```bash
npx vitest run       # Run tests (Vitest)
npx tsc --noEmit     # TypeScript check — must be clean
```

## Backpressure Checklist (run after every change)

1. `npm run build` — zero errors, zero warnings (chunk size warning is known P0)
2. `npx tsc --noEmit` — zero type errors
3. `npx vitest run` — all tests pass
4. No `console.log` in src/ (grep -r "console.log" src/ --include="*.ts" --include="*.tsx")
5. No TODO/FIXME/HACK (grep -rn "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx")
6. Bundle check: no chunk over 200KB in build output (currently 3 chunks exceed this — see IMPLEMENTATION_PLAN.md P0 #1)

## Project Context

- **Stack**: React 18 + Vite 5 + TypeScript, Tailwind + shadcn/ui, Supabase (auth + DB + edge functions), Vercel deploy
- **Language**: All user-facing text is Danish (i18n via texts.da.ts / texts.no.ts / texts.en.ts). Code comments in English.
- **Data privacy**: ALL calculations happen client-side. NEVER store user data server-side. Core product promise.
- **Tax logic**: `src/lib/danishTax.ts` — 2026 rates, all 98 municipalities. Most critical code.
- **Deployment**: Push to main → Vercel auto-builds. Currently at app-sparkle-time.vercel.app.
- **AI**: Claude Haiku via Supabase edge functions (budget-ai, onboarding-ai). Requires ANTHROPIC_API_KEY in Supabase secrets.
- **PWA**: vite-plugin-pwa generates sw.js + manifest.webmanifest in dist/

## Architecture Patterns

- **Routing**: React Router v6 in `src/App.tsx`. Lazy-loaded routes with Suspense.
- **State**: Budget profile in localStorage (`nb_budget`), optional cloud sync via Supabase `profiles` table.
- **i18n**: `useI18n()` hook → `t("key")`. 3 locale files (~1,500 strings each). Build-time locale via `VITE_LOCALE`.
- **SEO**: `usePageMeta()` hook on every page for title, description, OG, JSON-LD.
- **White-label**: `useWhiteLabel()` hook. Brand via `?brand=nordea` URL param. 7 configs.
- **Onboarding**: 6-step wizard → writes BudgetProfile to localStorage → dashboard renders from it.
- **Charts**: Recharts (Area, Bar, Line) + d3-sankey (flow diagrams).
- **OCR**: Tesseract.js client-side for /lonseddel and /pengetjek. CPR redaction before processing.

## Common Pitfalls

- Municipality fuzzy matching can false-match — test with exact names from KOMMUNE_DATA record.
- Post-build scripts (prerender-articles.mjs, prerender-pages.mjs) run automatically — don't break them.
- `pdfjs-dist` is dynamically imported in `src/lib/pdfToImage.ts` — keep it lazy, don't add static imports.
- English locale (texts.en) is lazy-loaded via dynamic import in i18n.tsx — don't statically import it elsewhere.
- `manualChunks` in vite.config.ts controls vendor splitting — update it if adding large new dependencies.
