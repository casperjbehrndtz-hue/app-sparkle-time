# specs/budget-calculator.md — Core Budget Calculator

## Job to Be Done
A Danish individual or couple wants to know their real monthly disposable income (rådighedsbeløb) after tax and fixed expenses — in under 3 minutes, without login, without sharing data.

## Requirements

### Input
- Bruttoløn (monthly gross salary)
- Kommune (dropdown, all 98 Danish municipalities)
- Kirkeskat (ja/nej toggle)
- Pension contribution (% or fixed amount, optional)
- Fixed expenses by category: bolig, transport, forsikring, streaming/abonnementer, mad, børn, gæld/lån, øvrige
- Option to add custom expense categories

### Tax Calculation (2026 satser — post-reform)
- AM-bidrag: 8% of (bruttoløn - employee pension - ATP)
- A-indkomst: AM-grundlag - AM-bidrag
- Personfradrag: 54.100 kr/år (4.508 kr/md)
- Beskæftigelsesfradrag: 12,75% of AM-grundlag, max 63.300 kr/år
- Bundskat: 12,01% of (A-indkomst - personfradrag)
- Mellemskat: 7,5% of A-indkomst over 641.200 kr/år
- Topskat: 7,5% of A-indkomst over 777.900 kr/år
- Top-topskat: 5% of A-indkomst over 2.592.700 kr/år
- Kommuneskat: varies by kommune (all 98 with correct 2026 rates)
- Kirkeskat: varies by kommune (per-municipality rates, optional)
- ATP: 99 kr/md (standard employee contribution)

### Output
- Nettoløn (monthly take-home after all taxes)
- Rådighedsbeløb (nettoløn minus total fixed expenses)
- Expense breakdown (visual, by category)
- Comparison with Danish averages for user's area/age (if data available)

### Acceptance Criteria
- [ ] Tax calculation matches manual calculation for at least 10 spot-check municipalities
- [ ] Edge cases handled: 0 income, very high income (topskat), kirkeskat on/off, 0 expenses
- [ ] All 98 municipalities selectable with correct kommuneskat rates
- [ ] Entire flow completable in under 3 minutes
- [ ] Zero data sent to server — all client-side
- [ ] Works on mobile (375px viewport minimum)
- [ ] All input fields have inline validation with Danish error messages
- [ ] Results are clear and immediately understandable
