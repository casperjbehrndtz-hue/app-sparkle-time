# Kassen — Roadmap mod den bedste budgetinfrastruktur

> Levende dokument. Opdateres løbende. Baseret på dybdegående analyse marts 2026.
> **Mission:** Bygge Danmarks bedste, mest komplette og mest brugervenlige budgetværktøj.

---

## Status-oversigt

| Kategori | Færdig | I gang | Mangler |
|---|---|---|---|
| Kritiske bugs | 0 | 0 | 3 |
| Core features | 6 | 0 | 4 |
| UX & design | 7 | 0 | 8 |
| Indhold & i18n | 3 | 0 | 5 |
| Teknisk fundament | 8 | 0 | 4 |
| Vækst & lancering | 1 | 0 | 6 |

---

## 🔴 Kritiske bugs (blokkerer lancering)

- [ ] **Budget-rapport crasher** — `NotFoundError: insertBefore` race condition mellem Framer Motion og React DOM i `BudgetReport.tsx`
- [ ] **Cookie-banner blokerer onboarding** — fixed banner overlapper "Fortsæt"-knapper. Fix: `padding-bottom` på onboarding-container eller højere `z-index` hierarki
- [ ] **404-side er på engelsk** — `src/pages/NotFound.tsx` bruger engelske strings. Oversæt til dansk

---

## 🟠 Core features (mangler eller ufærdige)

### Guides & Blog
- [ ] Guides-artikler er ikke klikbare — 4 placeholder-kort uden indhold
- [ ] Skriv minimum 3 rigtige artikler: "Sådan læser du dit rådighedsbeløb", "De 5 største udgiftsfælder", "Opsparing for begyndere"
- [ ] SEO-optimerede artikler med dansk finansviden

### Suite-navigation
- [ ] "Parøkonomi"-modul — vises i nav men ikke implementeret
- [ ] "Børneskat"-modul — vises i nav men ikke implementeret
- [ ] Beslut: bygge dem eller skjule dem indtil klar

### Bruger-autentificering
- [ ] Cloud-sync er optional men ikke tydeligt kommunikeret
- [ ] "Log ind for at gemme på tværs af enheder" — mangler tydelig CTA
- [ ] Glemt kodeord-flow mangler (kun signup/login nu)

### Abonnementer-modul
- [ ] `subscriptions`-tabel er i databasen men UI er ikke fuldt implementeret
- [ ] Tilbagevendende udgifter burde synkronisere med onboarding-udgifter

---

## 🟡 UX & design forbedringer

### Onboarding
- [ ] **In-progress persistens** — gem onboarding-state i sessionStorage så brugeren ikke mister data ved reload
- [ ] **AI Live Comments synlighed** — kommentarerne dukkede ikke op under test, tjek edge function timeout og fejlhåndtering
- [ ] **Bekræftelsesdialog** ved "Ret oplysninger" — forhindrer utilsigtet nulstilling

### Dashboard
- [ ] **AI Chat FAB mangler label** — tilføj "Spørg AI" tekst eller tooltip til Sparkles-knappen
- [ ] **Editerbare beløb er ikke tydelige** — tilføj pencil-ikon eller understregning til klikbare beløb i Cockpit
- [ ] **Mobil: kollaps sektioner som default** — "Overblik", "Handling", "Fremtid" bør starte kollapset på mobil
- [ ] **Skeleton loader** — fjern tomt flash ved profil-indlæsning fra localStorage
- [ ] **Historik-sektion** er altid tom ved første brug — tilføj forklaring eller skjul til der er data

### Landingsside
- [ ] **Tomme felter** mellem feature-cards og testimonials — undersøg billedcontainere
- [ ] **Testimonials** er de rigtige? Tjek om de er placeholders
- [ ] **"Sådan virker det"-sektion** — er den fyldt ud med rigtigt indhold?

---

## 🟡 Indhold & i18n

- [ ] **Dashboard-sektionstitler mangler i18n** — "Cockpit", "Overblik", "Handling", "Fremtid", "Dybdegående" er hardcoded dansk
- [ ] **Onboarding hardcoded strings** — `OnboardingFlow.tsx` linje 141, 397, 417 er ikke i i18n-systemet
- [ ] **Expenses-step strings** — "Telefon, internet & forsyning" og lign. mangler i i18n
- [ ] **Engelsk i EN-mode** — test hvad der sker ved sprog-toggle, ret alle huller
- [ ] **Meta-beskrivelser** — er alle sider SEO-optimerede med unikke meta-tags?

---

## 🔵 Teknisk fundament

### Sikkerhed & stabilitet
- [ ] **TypeScript strict mode** — `strict: false` i tsconfig arvet fra Lovable, bør strammes gradvist
- [ ] **Error tracking** — tilføj Sentry eller lignende for at fange fejl i produktion
- [ ] **Rate limiting** på AI edge functions — en bruger kan spamme Anthropic API gratis

### Performance
- [ ] **PWA fuldt testet** — er offline-mode og install-flow testet på mobil?
- [ ] **Billeder optimeret** — er hero-billeder i moderne format (WebP/AVIF)?
- [ ] **Bundle size audit** — kør `npm run build` og analyser hvad der fylder

### Database
- [ ] **Migrations testet** — er alle migrations kørt på det rigtige Supabase-projekt?
- [ ] **Backup-strategi** — er Supabase point-in-time recovery aktiveret?

---

## 🟢 Vækst & lancering

- [ ] **Custom domæne** — køb og tilslut fx `kassen.dk` til Vercel
- [ ] **Analytics** — Vercel Analytics er tilbudt, aktiver det
- [ ] **Cookie-banner GDPR-compliance** — er den nuværende løsning GDPR-compliant?
- [ ] **Sitemap.xml** — generer og submit til Google Search Console
- [ ] **Open Graph billeder** — dynamiske OG-billeder for deling på sociale medier
- [ ] **Lanceringsplan** — ProductHunt, Reddit r/dkfinance, Facebook-grupper?

---

## ✅ Færdigt (reference)

- [x] Migreret fra Lovable til standard web stack
- [x] Supabase database med RLS
- [x] Auth (email/password)
- [x] AI edge functions deployet (budget-ai, onboarding-ai, market-data, crowdsourced-prices)
- [x] ANTHROPIC_API_KEY sat som secret
- [x] Deployet på Vercel
- [x] AIWelcomeInsight virker og streamer
- [x] Onboarding flow (6 trin)
- [x] Dashboard med Sankey, formueprojektion, stress-test
- [x] PWA-manifest
- [x] Dansk/engelsk sprog-toggle
- [x] Postnummer-baserede estimater
- [x] market-data 401-fejl fikset

---

## Arbejdsorden (anbefalet rækkefølge)

1. Fix de 3 kritiske bugs
2. Guides-artikler (SEO-værdi + troværdighed)
3. Custom domæne
4. Analytics + Error tracking
5. i18n komplet dækning
6. Parøkonomi-modul
7. Lancering
