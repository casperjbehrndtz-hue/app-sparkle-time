# Kassen — Roadmap mod den bedste budgetinfrastruktur

> Levende dokument. Opdateres løbende.
> **Mission:** Bygge Danmarks bedste, mest komplette og mest brugervenlige budgetværktøj.

---

## Status-oversigt

| Kategori | Færdig | Mangler |
|---|---|---|
| Kritiske bugs | 2 | 0 |
| Core features | 10 | 1 |
| UX & design | 13 | 2 |
| Indhold & i18n | 4 | 4 |
| Teknisk fundament | 9 | 3 |
| Vækst & lancering | 3 | 4 |

---

## 🟠 Core features

- [x] Supabase database med RLS
- [x] Auth (email/password)
- [x] AI edge functions (budget-ai, onboarding-ai, market-data, crowdsourced-prices)
- [x] Onboarding flow (6 trin)
- [x] Dashboard med Sankey, formueprojektion, stress-test
- [x] Guides-artikler klikbare med rigtigt indhold (4 artikler)
- [x] Login-synlighed — "Log ind for at gemme" CTA i dashboard
- [x] Glemt kodeord-flow
- [x] Sitemap.xml
- [x] Onboarding in-progress persistens (sessionStorage)
- [ ] **Suite-navigation** — Parøkonomi og Børneskat er separate Lovable-projekter. Link til dem når de er klar (nu vist som "Snart")

---

## 🟡 UX & design

- [x] BudgetReport crash fikset
- [x] Cookie-banner overlapper ikke onboarding (z-[200])
- [x] AI Chat FAB har "Spørg AI" label
- [x] Bekræftelsesdialog ved "Ret oplysninger"
- [x] Historik empty state forklaring
- [x] Landingsside footer links fikset
- [ ] **Landingsside testimonials** — "Line, 34 fra Aarhus" m.fl. er placeholders. Erstat med rigtige når du har dem
- [ ] **Billeder optimeret** — `feature-family.jpg` er 188 kB, bør konverteres til WebP

---

## 🟡 Indhold & i18n

- [x] 4 guides-artikler med dansk finansviden
- [x] SEO meta-tags på alle sider (usePageMeta hook)
- [ ] **Dashboard-sektionstitler** — "Cockpit", "Overblik" m.fl. er hardcoded dansk, mangler i18n
- [ ] **Onboarding hardcoded strings** — OnboardingFlow.tsx linje 141, 397, 417
- [ ] **Expenses-step strings** — "Telefon, internet & forsyning" m.fl. mangler i18n
- [ ] **EN-mode test** — gennemtest sprog-toggle og ret huller

---

## 🔵 Teknisk fundament

- [x] Rate limiting på AI edge functions (20 req/IP/time)
- [x] Vercel SPA routing (vercel.json)
- [x] .gitignore ryddet op
- [ ] **Bundle size** — Index-chunk er 787 kB. Overvej lazy-load af recharts og avancerede dashboard-views
- [ ] **TypeScript strict mode** — `strict: false` i tsconfig, stram gradvist
- [ ] **Error tracking** — Sentry eller lignende (kræver API-nøgle)

---

## 🟢 Vækst & lancering

- [x] Deployet på Vercel (app-sparkle-time.vercel.app)
- [x] Sitemap.xml klar til Google Search Console
- [x] Suite-nav "Snart" badges
- [ ] **Custom domæne** — køb fx `kassen.dk` og tilslut til Vercel
- [ ] **Analytics** — aktiver Vercel Analytics i dashboardet
- [ ] **Open Graph billeder** — dynamiske OG-billeder til sociale medier
- [ ] **Lanceringsplan** — ProductHunt, Reddit r/dkfinance, Facebook-grupper

---

## ✅ Kritiske bugs — alle fikset

- [x] BudgetReport crash (Framer Motion race condition)
- [x] Cookie-banner blokerede onboarding
- [x] Alle routes 404 (vercel.json SPA routing)
- [x] market-data 401 (manglende verify_jwt=false)
- [x] Gammelt Lovable-projekt slettet

---

## Næste prioriteter (anbefalet rækkefølge)

1. **Custom domæne** — kassen.dk eller lignende
2. **Analytics aktivering** — Vercel dashboard, 2 klik
3. **Testimonials** — erstat placeholders med rigtige når du har dem
4. **Bundle size** — lazy-load recharts/avancerede views
5. **i18n komplet** — dansk/engelsk konsistens
6. **Lancering** — Google Search Console + sitemap submit
