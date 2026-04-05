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

---

## P1 — High Impact

### 6. SEO: missing JSON-LD WebApplication structured data on main page
- **What**: The spec requires JSON-LD WebApplication schema on the main page and FAQPage on guides. `usePageMeta` supports JSON-LD but need to verify it's actually being passed on key pages.
- **Why**: Structured data helps Google show rich snippets (rating stars, app info). Competitors without it lose visibility.
- **Files**: `src/pages/Index.tsx`, `src/pages/Blog.tsx`, `src/pages/Article.tsx`
- **Fix**: Verify JSON-LD is passed to `usePageMeta` on main page (WebApplication), guide listing (CollectionPage), and article pages (FAQPage/Article). Add if missing.
- **Verify**: Use Google Rich Results Test on deployed pages. Inspect `<script type="application/ld+json">` in page source.
- **Impact**: SEO, search appearance

### 7. Cross-sell nudges: contextual links to sister products
- **What**: Spec requires contextual cross-sell nudges to ParFinans.dk (for couples), Børneskat.dk (when children indicated), and Institutionsguide.dk (for parents with young children). These should appear on the results/dashboard page, not during input.
- **Why**: Cross-selling is a core business model pillar. Without nudges, sister products get zero traffic from NemtBudget.
- **Files**: Dashboard section components (after results are shown)
- **Fix**: Add subtle, contextual cards/banners in the dashboard that link to sister products based on the user's budget profile (household type, children, etc.). Only show relevant ones.
- **Verify**: Create budget with couple + children → see ParFinans + Børneskat nudges. Solo no children → no nudges.
- **Impact**: Business model, traffic to sister products

---

## P2 — Medium Impact

### 8. Return-visit CTA: "Tjek dit budget næste måned"
- **What**: Spec calls for a return-visit hook encouraging users to come back monthly.
- **Why**: Retention is critical for a free tool. Monthly return visits build habit and increase sign-up chance.
- **Files**: Dashboard (bottom section or after BudgetReport)
- **Fix**: Add a CTA card after results.
- **Verify**: Complete onboarding → see return-visit CTA in dashboard.
- **Impact**: Retention, sign-ups

### 9. Guides: stub content needs real articles
- **What**: 4 seed articles exist. Content quality directly impacts SEO authority.
- **Why**: Thin content hurts SEO ranking. Well-written guides with internal links create the content flywheel.
- **Files**: `src/pages/Blog.tsx`, `src/pages/Article.tsx`, Supabase `articles` table
- **Fix**: Verify article content quality. If stub/thin, expand with real 800-1500 word Danish content.
- **Verify**: Read each article — is it genuinely helpful? Does it have internal links?
- **Impact**: SEO, authority, organic traffic

### 10. Open Graph image: dynamic or static OG image
- **What**: Spec mentions dynamic OG image generation is "in progress". `usePageMeta` references a default `/og-nemtbudget.png`.
- **Why**: Social sharing without a compelling OG image gets significantly fewer clicks.
- **Files**: `public/og-nemtbudget.png`, `usePageMeta` hook
- **Fix**: Verify `/og-nemtbudget.png` exists and looks good.
- **Verify**: Share a NemtBudget link on Facebook/LinkedIn preview tool.
- **Impact**: Social sharing, traffic

### 11. Accessibility audit
- **What**: Spec requires Lighthouse Accessibility >= 90 on all pages.
- **Why**: Legal requirement in Denmark (webtilgængelighed), competitive differentiator.
- **Files**: All page components
- **Fix**: Run Lighthouse on /, /lonseddel, /pengetjek, /guides. Fix issues.
- **Verify**: Lighthouse Accessibility >= 90 on all main pages.
- **Impact**: Accessibility, legal compliance

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
| **P1** | 5 | 4 | 2 (SEO JSON-LD, cross-sell nudges) |
| **P2** | 5 | 0 | 5 |
| **P3** | 4 | 0 | 4 |
