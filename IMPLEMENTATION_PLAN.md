# IMPLEMENTATION_PLAN.md — NemtBudget.nu

<!-- Generated 2026-04-05 by planning pass. Updated by build iterations. -->

## Status: Code-complete — only manual/external items remain

---

## Completed

- **P0 #1: Bundle size** ✅ — App entry 754KB → 154KB (79% reduction)
- **P0 #2: Municipality coverage** ✅ — All 98 municipalities with 2026 DST PSKAT rates
- **P1 #3: Bundskat rate** ✅ — Corrected to 12.01%
- **P1 #4: Kirkeskat per-municipality** ✅
- **P1 #5: Beskæftigelsesfradrag** ✅ — 12.75% of AM-grundlag, max 63,300 kr
- **P1: 2026 Tax Reform brackets** ✅ — Mellemskat, topskat, top-topskat
- **P1 #6: SEO JSON-LD** ✅ — WebApplication, CollectionPage, Article
- **P1 #7: Cross-sell nudges** ✅ — ParFinans, Børneskat, Institutionsguide
- **P2 #8: Return-visit CTA** ✅ — Google Calendar reminder
- **P2 #9: Guide content** ✅ — 4 articles expanded to 800-1200 words
- **P2 #10: OG image** ✅ — Verified 1200x630
- **P2 #11: Accessibility** ✅ — Skip links, aria-labels, aria-live
- **P3 #13: Tesseract lazy-load** ✅ — Verified in lazy chunks only
- **P3 #14: Favicons** ✅ — All sizes present
- **P1 #17: Stress-test scenarios** ✅ — Added "Uventede udgifter" and "Barsel"
- **#18: Payslip benchmarks** ✅ — Already had full DST percentile comparison
- **#19: Input validation** ✅ — Handled by slider-based UI design
- **#20: Glemte abonnementer** ✅ — Split active vs forgotten subscriptions in Pengetjek
- **#21: "Sådan beregner vi"** ✅ — Expandable tax breakdown in CockpitSection showing all 2026 rates
- **#22: i18n hardcoded strings** ✅ — Dashboard (fallbackTitles, cancel/confirm, skip-to-content, back-to-top, calendar event, live data, AI advisor) + OnboardingFlow (Norwegian label overrides removed, monthly equiv) + WelcomePage (skip-to-content). 10 new keys in da/en/no.

---

## Remaining — Code items (from ROADMAP.md)

### ~~23. i18n key audit and fix~~ ✅
- Added missing `step.children.title` key (da/en/no)
- Added missing `suite.partOf` key (da/en/no), removed hardcoded fallback
- Added 13 missing Norwegian keys (cookie.settings, cookie.changeAnytime, gdpr.*)

### ~~24. Unused Radix UI package cleanup~~ ✅
- Removed `@radix-ui/react-menubar`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card` and their shadcn wrappers

### ~~25. TypeScript strict mode~~ ✅
- Enabled `strict: true` in tsconfig.app.json and tsconfig.json — zero errors

### ~~26. Bundle size ROADMAP update~~ ✅
- Index-chunk already at 157 kB (ROADMAP said 383 kB — stale). Updated ROADMAP.

### ~~27. Accessibility + SEO fixes~~ ✅
- AIChatPanel close button: added missing aria-label
- NotFound page: added usePageMeta with noIndex for proper SEO

---

## Remaining — Manual/external setup

### 12. Error tracking (Sentry)
- **Requires**: Create Sentry account → get DSN → add `@sentry/react`

### 15. Vercel Analytics
- **Requires**: Enable in Vercel dashboard

### 16. Custom domain nemtbudget.nu
- **Requires**: Add domain in Vercel → DNS at Simply.com

---

## Summary

| Priority | Total | Done | Remaining |
|----------|-------|------|-----------|
| **P0** | 2 | 2 | 0 |
| **P1** | 7 | 7 | 0 |
| **P2** | 8 | 8 | 0 (Sentry needs account) |
| **P3** | 4 | 2 | 2 (manual) |
| **New** | 6 | 6 | 0 |
| **Cleanup** | 1 | 1 | 0 |
