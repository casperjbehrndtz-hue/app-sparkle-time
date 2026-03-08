

# Plan: Bring Kassen up-to-speed med ParFinans & Børneskat

## Overblik

Efter gennemgang af begge søsterprojekter er der en række arkitektur-, UX- og infrastruktur-forbedringer som Kassen mangler. Her er de vigtigste gaps og en prioriteret plan.

## Hvad de andre projekter har — som Kassen mangler

### Arkitektur & Robusthed
| Feature | ParFinans | Børneskat | Kassen |
|---------|-----------|-----------|--------|
| ErrorBoundary | Yes | No | **No** |
| React.lazy / code-splitting | Yes (13 routes) | No | **No** |
| ScrollToTop on navigate | Yes | No | **No** |
| Cookie consent banner | Yes | Yes | **No** |
| Privacy policy page | Yes | Yes | **No** |
| i18n / Language context | Yes (DA/EN) | Yes (DA/EN) | **No** |

### UX & Compliance
| Feature | ParFinans | Børneskat | Kassen |
|---------|-----------|-----------|--------|
| Auth + user accounts | Via Stripe/magic links | Yes (Supabase Auth + Pro) | **No** |
| Stripe paywall | Yes (per-product) | Yes (99 kr/md Pro) | **No** |
| Proper Navbar med suite-links | Yes | Yes (links to ParFinans) | **No** |
| Footer med links | Yes | Yes (4-column) | **Minimal** |
| Blog / content pages | Yes | Yes | **No** |
| SEO component | No | Yes | **No** |
| Investment disclaimer component | No | Yes (reusable) | **No** |

### Edge Functions (backend)
| Kassen har | ParFinans har (33 stk) | Børneskat har (11 stk) |
|-----------|----------------------|----------------------|
| budget-ai | calculate, generate-insight, insight-chat, save-calculation, track-event, parse-income-text, scan-payslip, etc. | calculator-insight, create-checkout, check-subscription, etc. |
| crowdsourced-prices | stripe/payment flow, email capture, analytics, admin, partner system | stripe/subscription flow, fund APIs, reminders |

---

## Prioriteret implementeringsplan

### Fase 1: Robusthed & Compliance (lav risiko, høj værdi)

**1. ErrorBoundary**
- Kopier mønstret fra ParFinans (`ErrorBoundary.tsx`)
- Wrap routes i `App.tsx` med dansk fallback-UI og retry-knap

**2. Cookie Consent Banner**
- Opret `CookieBanner.tsx` med accept/afvis, localStorage-persistering
- Vis efter 1-2 sek. delay med slide-in animation

**3. Privatlivspolitik-side**
- Ny route `/privatliv` med standard dansk privatlivspolitik
- Link fra footer og cookie banner

**4. Forbedret Footer**
- Udvid den nuværende minimale footer til et 3-4 kolonne layout (som Børneskat)
- Inkluder: Værktøjer, Juridisk (privatliv, betingelser), Om Kassen, kontakt

### Fase 2: Performance & Navigation

**5. React.lazy code-splitting**
- Dashboard og OnboardingFlow lazy-loades
- Tilføj `PageLoader` spinner-komponent

**6. ScrollToTop**
- Tilføj `ScrollToTop.tsx` til `BrowserRouter` (direkte kopi fra ParFinans)

**7. Suite Navigation Bar**
- Tilføj en top-bar der linker til ParFinans suite: Parøkonomi, Bolig, Børneskat, Lønseddel
- Styrker branding og kryds-trafik

### Fase 3: Brugerkonti & Persistering

**8. Auth-system (Supabase Auth)**
- Implementer login/signup med email
- Gem budgetprofiler i database i stedet for kun localStorage
- Muliggør adgang fra flere enheder

**9. Gem & Hent budgetter**
- Database-tabel `budget_profiles` med RLS
- Edge function til at gemme/hente med bruger-kobling

### Fase 4: Monetisering & Vækst

**10. Stripe paywall (valgfrit)**
- Pro-features: AI-indsigt, detaljeret rapport-PDF, diagrammer
- Pris: 49-99 kr. engangsbetaling eller abonnement

**11. Blog / indholdsmodul**
- `/blog`-route med artikler om budgettering
- SEO-optimering med meta tags

**12. Engelsk sprogunderstøttelse**
- LanguageContext med DA/EN translations
- Sprogvælger i header

---

## Anbefalet rækkefølge

Fase 1 (4 opgaver) kan implementeres med det samme — det er ren frontend uden backend-afhængigheder. Fase 2 er ligeledes lavrisiko. Fase 3-4 kræver beslutninger om forretningsmodel.

Skal jeg starte med Fase 1 og 2?

