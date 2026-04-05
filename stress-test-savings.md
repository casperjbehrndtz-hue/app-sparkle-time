# specs/stress-test-savings.md — Stress-test & Opsparingsplanlægger

## Job to Be Done
After seeing their budget, a user wants to know: "What happens if things go wrong?" and "When can I reach my savings goal?"

## Stress-test Requirements

### Scenarios
- Jobmistelse: what if income drops to dagpenge/kontanthjælp level?
- Rentestigning: what if variable rate mortgage increases by 1%, 2%, 3%?
- Uventede udgifter: what if a 10.000/25.000/50.000 kr expense hits?
- Barsel: what if income drops to barselsdagpenge?

### Output
- For each scenario: new rådighedsbeløb, monthly shortfall if any
- "Hvor lang tid holder din nødbuffer?" — months of runway
- Visual comparison: current vs. stress scenario

## Opsparingsplanlægger Requirements

### Input
- Savings goal (kr amount)
- Monthly savings capacity (auto-suggested from budget surplus)
- Expected return (optional, default 0%)

### Output
- Timeline: when goal is reached at current rate
- "Hvad hvis du sparede X mere?" — alternative timelines
- Link to nødbuffer guide if no emergency fund

### Acceptance Criteria
- [ ] All stress scenarios calculate correctly
- [ ] Savings timeline is mathematically correct (compound if return > 0)
- [ ] Clear visual comparison between current and stress states
- [ ] Works with 0 surplus (shows "du har ikke råd til opsparing lige nu" with link to savings tips)
- [ ] All calculations client-side
