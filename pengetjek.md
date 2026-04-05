# specs/pengetjek.md — Pengetjek (Kontoudtog-analyse)

## Job to Be Done
A user uploads their bank statement and wants to find forgotten subscriptions, spending patterns, and money drains — without any data leaving their browser.

## Requirements

### Input
- File upload (CSV/PDF bank statement)
- Client-side parsing only — no server upload

### Processing
- Categorize transactions (streaming, forsikring, transport, mad, etc.)
- Identify recurring charges (subscriptions, memberships)
- Flag potential savings: unused subscriptions, duplicate services, high-frequency small purchases
- AI-powered insights via Claude API (send anonymized/aggregated data only, never raw transactions)

### Output
- "Pengeslugere" — list of recurring charges sorted by annual cost
- "Glemte abonnementer" — subscriptions user may have forgotten
- Category breakdown with comparison to averages
- Specific savings suggestions with estimated monthly/annual savings

### Acceptance Criteria
- [ ] Raw bank data never leaves browser
- [ ] Loading state during analysis
- [ ] Error handling: wrong file format, empty file, unreadable CSV
- [ ] Results show actual kr amounts, not just percentages
- [ ] Mobile friendly file upload
- [ ] Clear distinction between AI suggestions and factual data
