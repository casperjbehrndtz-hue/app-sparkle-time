# IMPLEMENTATION_PLAN.md — NemtBudget.nu

<!-- Generated 2026-04-05 by planning pass. Updated by build iterations. -->

## Status: In progress

---

## Completed

### ~~P0 #2: Municipality coverage~~ ✅
- Expanded from 30 to all 98 municipalities with official 2026 rates from Statistics Denmark (DST PSKAT table).
- Per-municipality kirkeskat rates added (was using flat 0.71% average — now ranges from 0.38% Gentofte to 1.30% Læsø).
- Exported `getKirkeSkat()` and `getAllKommuner()` helper functions.

### ~~P1 #3: Bundskat rate~~ ✅
- Corrected from 12.09% to **12.01%** (official 2026 rate post-reform).

### ~~P1 #4: Kirkeskat per-municipality~~ ✅
- Done as part of P0 #2 above.

### ~~P1 #5: Beskæftigelsesfradrag~~ ✅
- Added: 12.75% of AM-grundlag, max 63,300 kr/year. Reduces kommune/kirkeskat base.

### ~~2026 Tax Reform: New bracket structure~~ ✅ (discovered during implementation)
- Denmark's 2026 tax reform replaced the old single topskat with 3 brackets:
  - **Mellemskat**: 7.5% on A-indkomst over 641,200 kr
  - **Topskat**: 7.5% on A-indkomst over 777,900 kr
  - **Top-topskat**: 5% on A-indkomst over 2,592,700 kr
- All brackets implemented and tested. 28 tests pass.

### ~~P0 #1: Bundle size~~ ✅
- Added `manualChunks` in `vite.config.ts` splitting: react, router, framer-motion, recharts, d3, radix, lucide, supabase, floating-ui, markdown, pdfjs
- Lazy-loaded `pdfjs-dist` (was 466KB in shared chunk, now only loads on /lonseddel and /pengetjek)
- Lazy-loaded English locale texts (saved ~71KB from app entry chunk)
- Removed static EN import from ErrorBoundary, PageLoader, SectionErrorBoundary
- **Results (before → after)**:
  - App entry: 754KB → **154KB** (79% reduction)
  - No initial-load chunk over 200KB
  - Lazy-loaded vendor-recharts (343KB) and vendor-pdfjs (448KB) only load when needed
  - Vite chunk size warning eliminated

### ~~P1 #6: SEO JSON-LD structured data~~ ✅
- WelcomePage: Added `WebApplication` JSON-LD (name, url, applicationCategory: FinanceApplication, free offer)
- Blog.tsx: Added `CollectionPage` JSON-LD with `ItemList` of all static guide articles
- Article.tsx: Migrated manual JSON-LD script tag to `usePageMeta`'s built-in `jsonLd` parameter (Article schema)
- All three pages now use the advanced `usePageMeta({ ... jsonLd })` format

---

### ~~P1 #7: Cross-sell nudges~~ ✅
- Added contextual cross-sell cards in Dashboard between FREMAD and DYBDE sections.
- ParFinans.dk shown when `householdType === "par"`, Børneskat.dk when `hasChildren`, Institutionsguide.dk when children age ≤ 6.
- i18n strings added in DA, NO, and EN.

---

## P2 — Medium Impact

### ~~P2 #8: Return-visit CTA~~ ✅
- Added "Tjek dit budget igen næste måned" card at bottom of dashboard (after DYBDE section).
- CTA opens Google Calendar with a pre-filled reminder event one month out.
- i18n strings in DA, NO, EN.

### ~~P2 #9: Guides content expansion~~ ✅
- Expanded all 4 static articles from ~200-300 words to 800-1200 words each.
- Added detailed Danish content: price tables, practical examples, step-by-step guides.
- Internal links to NemtBudget features and sister products (ParFinans.dk).
- Updated read times in Blog.tsx to match expanded content (5→8, 4→7, 6→9, 7→10 min).

### ~~P2 #10: Open Graph image~~ ✅
- Verified: `/og-nemtbudget.png` exists (154KB), professional design with brand name and Danish tagline.
- Proper 1200x630 dimensions referenced in index.html (`og:image`, `og:image:width/height`, `twitter:image`).
- `usePageMeta` hook uses it as default; dk-seo middleware injects it in SSR.

### ~~P2 #11: Accessibility audit~~ ✅
- Added skip-to-content links on WelcomePage and Dashboard (sr-only, visible on focus).
- Added aria-labels to all icon-only buttons in Dashboard header (edit, report, reset, logout, login).
- Added aria-label to Blog search input.
- Added aria-live="polite" to Blog no-results message for screen reader announcements.
- lang="da" already present in index.html. OG image properly sized.

### 12. Error tracking: no production error monitoring
- **What**: ErrorBoundary catches errors locally but no external error tracking.
- **Why**: Production bugs are invisible without error tracking.
- **Files**: `src/App.tsx` or root
- **Fix**: Add lightweight error tracking (Sentry free tier).
- **Verify**: Trigger error in production → see it in Sentry dashboard.
- **Impact**: Production reliability, bug detection

---

## P3 — Polish

### 13. Performance: lazy-load Tesseract.js
- **What**: Tesseract.js is ~3MB. Verify it's lazy-loaded only when /lonseddel or /pengetjek is visited.
- **Files**: `src/hooks/usePayslipOCR.ts`, `src/hooks/useBankStatementOCR.ts`
- **Verify**: Network tab on `/` — Tesseract worker should not load.
- **Impact**: Initial load performance

### 14. Favicon: verify all sizes present
- **What**: Spec requires favicon in multiple sizes + apple-touch-icon.
- **Files**: `public/` directory, `index.html`
- **Verify**: Check browser tab icon, iOS "Add to Home Screen" icon.
- **Impact**: Polish, professionalism

### 15. Vercel Analytics activation
- **What**: Spec mentions Vercel Analytics should be activated.
- **Files**: Vercel dashboard, potentially `src/App.tsx`
- **Verify**: Visit site → see data in Vercel Analytics dashboard.
- **Impact**: Data-driven decisions

### 16. Custom domain nemtbudget.nu
- **What**: Currently at `app-sparkle-time.vercel.app`. Custom domain needed.
- **Files**: Vercel dashboard, DNS at Simply.com
- **Verify**: `curl -I https://nemtbudget.nu` returns 200.
- **Impact**: Trust, SEO, branding

---

## Summary

| Priority | Total | Done | Remaining |
|----------|-------|------|-----------|
| **P0** | 2 | 2 | 0 |
| **P1** | 5 | 5 | 0 |
| **P2** | 5 | 4 | 1 |
| **P3** | 4 | 0 | 4 |
