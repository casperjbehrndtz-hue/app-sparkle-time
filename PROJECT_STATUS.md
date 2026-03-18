# PROJECT_STATUS.md

> Last updated: 2026-03-14
> Keep this file updated whenever major changes are made.

---

## What this project is

**NemtBudget** is a Danish personal finance web app. Users answer ~6 onboarding steps about their household (income, housing, kids, subscriptions, etc.) and get an instant breakdown of their monthly budget, disposable income, and personalised AI-generated savings advice.

Target users: Danish households — individuals and couples. The app is designed to work without login (data stays in `localStorage`) while offering optional Supabase auth to sync profiles across devices.

The codebase also has a **white-label system** so the same app can be deployed under a bank's branding (Nordea, Danske Bank configs already exist as demos) with custom CTAs pointing to their products.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 (SWC) |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Animation | Framer Motion |
| Charts | Recharts + d3-sankey |
| PWA | vite-plugin-pwa (Workbox) |
| Auth & DB | Supabase (PostgreSQL + GoTrue auth) |
| Edge functions | Supabase Edge Functions (Deno) |
| AI | Anthropic Claude (`claude-haiku-4-5-20251001`) via direct API |
| Package manager | npm (bun.lock committed; use `npm install`) |
| Testing | Vitest + Testing Library |

---

## Architecture

```
Browser
  └── React SPA (Vite)
        ├── localStorage  — profile + snapshots (no-auth fallback)
        ├── Supabase Auth — optional login, syncs profile to DB
        └── Supabase Edge Functions
              ├── budget-ai          — AI chat + optimisation advice
              ├── onboarding-ai      — live comments + welcome insight
              ├── market-data        — DST income, el-priser, realkreditrente
              └── crowdsourced-prices — read/write anonymous price observations
```

**Data flow on first visit:**
1. User completes onboarding → `BudgetProfile` built in state
2. `computeBudget()` runs client-side → `ComputedBudget`
3. `AIWelcomeInsight` streams a personalised summary (via `onboarding-ai`)
4. Profile saved to `localStorage` (+ Supabase if logged in)
5. `submitPriceObservations()` sends anonymised data to `crowdsourced-prices`
6. `saveSnapshot()` writes a daily budget snapshot to `localStorage`

**White-label:** `?brand=nordea` or `?brand=danske` in URL swaps theme/copy/CTAs at runtime via `WhiteLabelProvider`.

---

## Routes & pages

| Route | File | Description |
|---|---|---|
| `/` | `pages/Index.tsx` | App entry. Shows onboarding → welcome insight → dashboard in sequence |
| `/login` | `pages/Auth.tsx` | Email/password sign in + sign up. Redirects to `/` on success |
| `/guides` | `pages/Blog.tsx` | Static article listing (4 stub articles, no detail pages yet) |
| `/install` | `pages/Install.tsx` | PWA install prompt; handles iOS "Add to Home Screen" instructions |
| `/privatliv` | `pages/Privatliv.tsx` | Privacy policy page |
| `*` | `pages/NotFound.tsx` | 404 fallback |

### Dashboard sections (all within `/`)

Once onboarding is complete, the dashboard renders these sections in a single scrolling page:

| Section | Component | Description |
|---|---|---|
| Cockpit | `CockpitSection` | Headline numbers: income, expenses, disposable income + health score |
| Charts | `InlineChartsSection` | Sankey diagram + donut chart of expense breakdown |
| Optimering | `OptimeringView` | Rule-based savings actions with estimated DKK/md. |
| AI Chat | `AIChatPanel` | Streaming chat against `budget-ai` edge function |
| Naboeffekt | `NaboeffektView` | Compare expenses to anonymised crowdsourced averages |
| Hvad Hvis | `HvadHvisView` | What-if sliders (income change, moving, etc.) |
| Stresstest | `StressTestView` | Simulate job loss, interest rate rise, etc. |
| Fremad | `FremadView` | Savings goal projections |
| Par-split | `ParSplitView` | Couple expense split calculator |
| Årshjul | `AarshjulView` | Annual expense calendar (big irregular costs) |
| Historik | `HistorikView` | Chart of past budget snapshots from localStorage |
| Abonnementer | `SubscriptionTracker` | Manage subscriptions saved to Supabase (auth required) |
| Budget Report | `BudgetReport` | Printable/shareable PDF-style summary |

---

## Supabase

**Project ID:** `xgyhmwjaxmbdiplfjrdq`
**URL:** `https://xgyhmwjaxmbdiplfjrdq.supabase.co`

### Tables

#### `profiles`
Stores one row per authenticated user. Auto-created by trigger on sign-up.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | References `auth.users(id)` |
| `display_name` | `text` | Defaults to email on creation |
| `budget_profile` | `jsonb` | Full `BudgetProfile` object (see `src/lib/types.ts`) |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

RLS: authenticated users can only read/write their own row.

#### `price_observations`
Anonymous crowdsourced expense data. No auth required to insert.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `category` | `text` | e.g. `rent`, `netflix`, `car_insurance` |
| `postal_code` | `text` nullable | |
| `household_type` | `text` | `solo` or `par` |
| `amount` | `integer` | Monthly DKK |
| `created_at` | `timestamptz` | |

RLS: anyone can insert (amount must be 0–200,000). Anyone can read.

#### `subscriptions`
Per-user subscription tracker (auth required).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | References `auth.users(id)` |
| `name` | `text` | e.g. "Netflix" |
| `amount` | `integer` | Monthly DKK |
| `frequency` | `text` | Default `monthly` |
| `category` | `text` | Default `other` |
| `is_active` | `boolean` | Default `true` |
| `created_at` | `timestamptz` | |

RLS: authenticated users can CRUD only their own rows.

### Views

#### `price_averages`
Aggregates `price_observations` from the last 6 months. Only returns rows with **≥5 observations** per group.

Columns: `category`, `postal_code`, `household_type`, `avg_amount`, `median_amount`, `observation_count`, `stddev_amount`.

### Edge functions

| Function | Trigger | Depends on |
|---|---|---|
| `budget-ai` | POST from `AIChatPanel` / optimisation mode | `ANTHROPIC_API_KEY` |
| `onboarding-ai` | POST from `AILiveComment`, `AIWelcomeInsight` | `ANTHROPIC_API_KEY` |
| `market-data` | GET, called by `useMarketData` hook on app load | DST API, Energi Data Service, Nationalbanken |
| `crowdsourced-prices` | GET/POST from `NaboeffektView` + `submitPriceObservations` | Supabase DB |

---

## What works

- **Onboarding flow** — full 6-step flow with live AI comments per step
- **Budget calculation** — fully client-side (`budgetCalculator.ts`), no network required
- **Dashboard** — all sections render correctly
- **Auth** — sign up, sign in, sign out, profile cloud sync all working
- **localStorage fallback** — works fully without login
- **Market data** — DST income comparison, el-priser, realkreditrente all fetching live
- **Crowdsourced prices** — insert on onboarding complete; read in NaboeffektView (sparse data currently)
- **Subscription tracker** — CRUD for authenticated users
- **Snapshots / Historik** — daily snapshots saved to localStorage
- **White-label system** — theme, copy, CTAs all swappable via `?brand=` param
- **PWA** — installable on mobile; service worker with offline cache
- **i18n** — Danish/English toggle via `LanguageToggle`
- **Dark mode** — via `next-themes`

---

## What's broken / at risk

### 🔴 Critical

~~**AI gateway is Lovable-owned**~~ — **Resolved.** Both edge functions now call Anthropic directly (`api.anthropic.com/v1/messages`, model `claude-haiku-4-5-20251001`). The `ANTHROPIC_API_KEY` secret must be set in the Supabase project (Dashboard → Edge Functions → Secrets). Until it is set, AI features will return 500.

### 🟢 Minor

- `tsconfig.json` has `strict: false` and several null-check options off — inherited from Lovable defaults. Not a runtime issue but worth tightening eventually.
- Unused Radix UI packages in `package.json` (e.g. `react-menubar`, `react-context-menu`, `react-hover-card`) — add ~30 KB to the bundle. Can be pruned.

---

## Status of previous priorities

1. ~~**Replace AI gateway**~~ — Done. Still need to set `ANTHROPIC_API_KEY` in Supabase Dashboard → Edge Functions → Secrets.

2. ~~**Blog article pages**~~ — Done. `Article.tsx` serves all 4 articles with full content (DB primary, static fallback). Route `/guides/:slug` registered in `App.tsx`.

3. ~~**Seed crowdsourced prices**~~ — Done. Migration `20260314000000_seed_price_observations.sql` seeds 10 national observations per (category, household_type) pair for all tracked categories. Apply with `supabase db push`.

4. ~~**Profile edit UX**~~ — Done. `ProfileEditSheet` (in-place slide-over panel) is wired up in `Dashboard.tsx`. The pencil icon in the header opens it directly.

5. ~~**Deploy**~~ — Done. Live on Vercel at `app-sparkle-time.vercel.app`. GitHub → Vercel CD is active.

---

## Remaining action item

**Set `ANTHROPIC_API_KEY`** in Supabase Dashboard → Edge Functions → Secrets → New secret:
- Name: `ANTHROPIC_API_KEY`
- Value: your Anthropic API key

Without this, `budget-ai` and `onboarding-ai` edge functions return 500.
