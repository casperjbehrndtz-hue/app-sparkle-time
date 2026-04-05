# IMPLEMENTATION_PLAN.md — NemtBudget.nu

<!-- Generated 2026-04-05 by planning pass. Updated by build iterations. -->

## Status: Code-complete — only manual/external items remain

---

## Completed (27 items)

Bundle size 754→154KB, all 98 municipalities with 2026 PSKAT rates, bundskat 12.01%, kirkeskat per-municipality, beskæftigelsesfradrag 12.75%/max 63,300, 2026 tax reform brackets (mellemskat/topskat/top-topskat), SEO JSON-LD, cross-sell nudges, return-visit CTA, 4 guide articles (800-1200 words), OG image 1200x630, accessibility (skip links/aria-labels/aria-live), Tesseract lazy-load, favicons, stress-test scenarios, payslip benchmarks, input validation (slider UI), glemte abonnementer, "Sådan beregner vi" tax breakdown, i18n hardcoded strings (16 strings → t() calls, 10 new keys da/en/no), i18n key audit (2 missing keys + 13 NO gaps fixed), unused Radix UI cleanup (-3 packages), TypeScript strict mode enabled, NotFound SEO meta, AIChatPanel aria-label.

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

All 27 code items complete. 3 manual/external items remain (Sentry account, Vercel Analytics toggle, DNS setup).
