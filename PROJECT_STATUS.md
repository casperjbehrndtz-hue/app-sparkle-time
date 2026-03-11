# PROJECT_STATUS.md

> Last updated: 2026-03-11
> Keep this file updated whenever major changes are made.

---

## What this project is

**Kassen** is a Danish personal finance web app. Users answer ~6 onboarding steps about their household (income, housing, kids, subscriptions, etc.) and get an instant breakdown of their monthly budget, disposable income, and personalised AI-generated savings advice.

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
| AI | Lovable AI gateway → `google/gemini-3-flash-preview` ⚠️ (see Broken) |
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
| `budget-ai` | POST from `AIChatPanel` / optimisation mode | `LOVABLE_API_KEY` ⚠️ |
| `onboarding-ai` | POST from `AILiveComment`, `AIWelcomeInsight` | `LOVABLE_API_KEY` ⚠️ |
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

**AI gateway is Lovable-owned**
Both `budget-ai` and `onboarding-ai` call `https://ai.gateway.lovable.dev` using a `LOVABLE_API_KEY` secret stored in the Supabase project. This key belongs to Lovable and can be revoked at any time. AI features (welcome insight, live onboarding comments, AI chat, optimisation analysis) will silently fail or return 402/401 when that happens.

**Fix:** Replace the gateway URL and key with a direct provider — either Anthropic (Claude) or Google AI Studio (Gemini) — and store the new secret as a Supabase function secret.

### 🟡 Incomplete

- **Blog** — `/guides` lists 4 stub articles with no detail/content pages. Clicking an article does nothing.
- **NaboeffektView** — neighbour comparison only shows data when `price_averages` has ≥5 observations for a given category+household_type. The database is currently near-empty so most comparisons will show no data.
- **Profile edit flow** — "Rediger profil" re-runs the full onboarding instead of an in-place edit form.
- **`supabase/integrations/client.ts`** is auto-generated boilerplate (comments say "do not edit"). The env var name is `VITE_SUPABASE_PUBLISHABLE_KEY` (non-standard name for the anon key) — works fine as long as `.env` matches.

### 🟢 Minor

- `tsconfig.json` has `strict: false` and several null-check options off — inherited from Lovable defaults. Not a runtime issue but worth tightening eventually.
- Unused Radix UI packages in `package.json` (e.g. `react-menubar`, `react-context-menu`, `react-hover-card`) — add ~30 KB to the bundle. Can be pruned.

---

## Next priorities

1. **Replace AI gateway** — swap `LOVABLE_API_KEY` + `ai.gateway.lovable.dev` in both edge functions with a real provider key (Anthropic or Google). Update Supabase function secrets.

2. **Blog article pages** — add `/guides/:slug` route with full article content, or integrate a headless CMS.

3. **Seed crowdsourced prices** — the neighbour comparison feature needs data. Either pre-seed the DB with realistic Danish averages or show a fallback until enough real observations accumulate.

4. **Profile edit UX** — replace the full onboarding re-run with a dedicated edit panel so users can change one field without re-doing everything.

5. **Prune unused packages** — remove the ~10 Radix UI primitives that have no components using them.

6. **Deploy** — set up a proper hosting target (Vercel, Cloudflare Pages, or Netlify) to replace `app-sparkle-time.lovable.app`.
