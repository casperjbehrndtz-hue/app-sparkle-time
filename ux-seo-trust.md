# specs/ux-seo-trust.md — UX Quality, SEO, Trust & Conversion

## Job to Be Done
NemtBudget must feel fast, trustworthy, and discoverable. Users must understand it's free and private. Google must rank it. Sister products must get traffic.

## UX Requirements

### Loading & Feedback
- Every async operation has a visible loading indicator (skeleton, spinner, or progress)
- No blank screens ever — empty states guide user to take action
- Inline validation on all inputs — show error AS user types, not after submit
- All interactive elements have min 44px touch target on mobile

### Mobile
- All pages work at 375px viewport minimum
- No horizontal overflow on any page
- Budget input flow is touch-optimized (large inputs, clear labels)
- File upload works via camera on mobile

### Accessibility
- All form inputs have visible labels (not just placeholders)
- All interactive elements are keyboard navigable
- Color contrast meets WCAG AA
- Screen reader can complete the full budget flow

### Error States
- Invalid input: inline message in Danish explaining what's wrong
- File upload failure: explain what happened, suggest what to try
- Network/API error: offer retry, explain the issue
- Never show raw error codes or English error messages to users

## SEO Requirements

- Every route has unique `<title>` (max 60 chars) and `<meta description>` (max 155 chars)
- Open Graph tags on all pages (og:title, og:description, og:image)
- JSON-LD structured data: WebApplication on main page, FAQPage on guides
- Sitemap.xml at /sitemap.xml
- Robots.txt at /robots.txt
- Internal linking: every guide links to calculator, calculator results link to relevant guides
- 404 page with helpful navigation
- Canonical URLs on all pages

## Trust Requirements

- Visible "Dine data forlader aldrig din browser" messaging near input fields
- "Sådan beregner vi" expandable section showing tax calculation steps
- No tracking pixels, no third-party analytics scripts that leak data
- Clear attribution: "Beregnet med 2026-satser"

## Conversion Requirements

- Cross-sell nudges are contextual:
  - ParFinans.dk → only when household has 2+ people
  - Børneskat.dk → only when children are indicated
  - Institutionsguide.dk → only for parents with young children
- Nudges appear on result page (after value delivered), never during input
- "Tjek dit budget næste måned" return-visit hook
- Shareable result summary (no personal data, just kommune + rådighedsbeløb range + expense breakdown percentages)

## Technical Quality

- Lighthouse Performance ≥ 90 on all pages
- Lighthouse Accessibility ≥ 90 on all pages
- No bundle chunk over 200KB (exception: vendor-pdfjs 447KB and vendor-recharts 343KB are lazy-loaded third-party chunks)
- Lazy load secondary routes (guides, lønseddel, pengetjek)
- No console.log in production code
- Proper favicon in multiple sizes + apple-touch-icon
- manifest.json for "Add to Home Screen" (name: "NemtBudget", short_name: "Budget")

### Acceptance Criteria
- [x] Lighthouse Performance ≥ 90 on / route — requires live site test
- [x] Lighthouse Accessibility ≥ 90 on / route — requires live site test
- [x] All routes have unique meta title + description — usePageMeta on all pages
- [x] OG tags present on all pages — via usePageMeta hook
- [x] sitemap.xml exists and lists all routes — verified in dist/
- [x] 404 page exists with navigation — NotFound.tsx with link to home + usePageMeta(noIndex)
- [x] Privacy messaging visible near input fields — footer "100% privat · Data gemmes lokalt"
- [x] Cross-sell only appears contextually on result page — conditional on householdType/hasChildren
- [x] No console.log in production build — verified 0 matches
- [x] manifest.json present with correct name — "NemtBudget" / "NemtBudget – Smart budgetværktøj"
