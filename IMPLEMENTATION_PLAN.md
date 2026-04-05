# IMPLEMENTATION_PLAN.md — NemtBudget.nu

<!-- Generated 2026-04-05 by planning pass. Updated by build iterations. -->

## Status: Nearly complete — 3 items remain (all require manual/external setup)

---

## Completed

- **P0 #1: Bundle size** ✅ — App entry 754KB → 154KB (79% reduction), manualChunks, lazy-loaded pdfjs + EN locale
- **P0 #2: Municipality coverage** ✅ — All 98 municipalities with official 2026 DST PSKAT rates + kirkeskat
- **P1 #3: Bundskat rate** ✅ — Corrected to 12.01% (2026 post-reform)
- **P1 #4: Kirkeskat per-municipality** ✅ — Done with P0 #2
- **P1 #5: Beskæftigelsesfradrag** ✅ — 12.75% of AM-grundlag, max 63,300 kr/year
- **P1: 2026 Tax Reform brackets** ✅ — Mellemskat 7.5%, topskat 7.5%, top-topskat 5%
- **P1 #6: SEO JSON-LD** ✅ — WebApplication, CollectionPage, Article schemas
- **P1 #7: Cross-sell nudges** ✅ — ParFinans (par), Børneskat (children), Institutionsguide (age ≤ 6)
- **P2 #8: Return-visit CTA** ✅ — Google Calendar reminder, bottom of dashboard
- **P2 #9: Guide content** ✅ — All 4 articles expanded to 800-1200 words
- **P2 #10: OG image** ✅ — Verified: 1200x630, professional design, properly referenced
- **P2 #11: Accessibility** ✅ — Skip links, aria-labels, aria-live, lang="da"
- **P3 #13: Tesseract lazy-load** ✅ — Verified: only in lazy chunks, not initial bundle
- **P3 #14: Favicons** ✅ — favicon.ico, pwa-192, pwa-512, apple-touch-icon all present

---

## Remaining (all require manual/external setup)

### 12. Error tracking (Sentry)
- **Requires**: Create Sentry account → get DSN → add `@sentry/react` to App.tsx
- **Impact**: Production bug visibility

### 15. Vercel Analytics
- **Requires**: Enable in Vercel dashboard → optionally add `@vercel/analytics` package
- **Impact**: Usage data, data-driven decisions

### 16. Custom domain nemtbudget.nu
- **Requires**: Add domain in Vercel dashboard → configure DNS at Simply.com
- **Impact**: Trust, SEO, branding

---

## Summary

| Priority | Total | Done | Remaining |
|----------|-------|------|-----------|
| **P0** | 2 | 2 | 0 |
| **P1** | 5 | 5 | 0 |
| **P2** | 5 | 4 | 1 (Sentry — needs account) |
| **P3** | 4 | 2 | 2 (Vercel + domain — manual) |
