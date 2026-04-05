# IMPLEMENTATION_PLAN.md — NemtBudget.nu

<!-- Generated 2026-04-05 by planning pass. Updated by build iterations. -->

## Status: In progress — new items found from spec audit

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
- **P1 #17: Stress-test missing scenarios** ✅ — Added "Uventede udgifter" and "Barsel" per spec

---

## Active — Code-implementable

### ~~#18: Payslip salary benchmarks~~ ✅ (already implemented)
- Verified: PayslipResult.tsx already has full percentile comparison with DST industry data, visual slider, and median comparison.

### 19. Onboarding input validation (P2)
- **What**: Spec requires inline validation on all inputs — show error as user types
- **Why**: Reduces user frustration, prevents bad data entry
- **Files**: `src/components/onboarding/OnboardingFlow.tsx`
- **Verify**: Enter invalid income (negative, text) → see inline Danish error message
- **Impact**: UX quality, data quality

### ~~#20: Pengetjek "Glemte abonnementer"~~ ✅
- Split subscription section: active (2+ occurrences) vs forgotten (1 occurrence, AI-flagged).
- Forgotten subscriptions shown in amber-highlighted card with potential savings total.
- i18n in DA, NO, EN.

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
| **P1** | 6 | 6 | 0 |
| **P2** | 8 | 4 | 4 (3 code + 1 Sentry) |
| **P3** | 4 | 2 | 2 (manual) |
