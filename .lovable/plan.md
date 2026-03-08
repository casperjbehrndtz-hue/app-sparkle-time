

# Implementation Plan: Dark Mode, Hvad-hvis Simulator, Historiske Snapshots & Par-split

## Scope

4 features across ~10 files. No backend needed — all localStorage-based.

---

## 1. Dark Mode

**What:** Add `.dark` CSS variables + toggle in dashboard header.

- **`src/index.css`**: Add `.dark` block under `:root` with inverted colors (dark bg, light text, adjusted kassen tokens)
- **`src/components/DarkModeToggle.tsx`**: New component — Sun/Moon icon button, reads/writes `localStorage("kassen_theme")`, toggles `dark` class on `<html>`
- **`src/components/dashboard/Dashboard.tsx`**: Add `<DarkModeToggle />` in header next to existing buttons
- **`tailwind.config.ts`**: Already has `darkMode: ["class"]` — no change needed
- **`src/index.css`** range slider + scrollbar: Add dark variants

---

## 2. Hvad-hvis Simulator

**What:** New tab "Hvad hvis" in dashboard with 3 preset scenarios that modify the budget live.

- **`src/components/dashboard/HvadHvisView.tsx`**: New component
  - 3 scenario cards: "Køb bolig" (rent→mortgage), "Få barn" (add childcare+reduced income), "Skift job" (salary slider)
  - Each scenario has a toggle + parameter inputs
  - Computes a modified `ComputedBudget` via `computeBudget()` with adjusted profile
  - Shows before/after comparison: disposable income delta, health score delta, stacked bar
- **`src/components/dashboard/Dashboard.tsx`**: Add "Hvad hvis" tab to `tabs` array, render `<HvadHvisView>` 

---

## 3. Historiske Snapshots

**What:** Save a timestamped snapshot each time a budget is computed. Show trend over time.

- **`src/lib/snapshots.ts`**: New module
  - `BudgetSnapshot = { date: string, disposableIncome: number, totalIncome: number, totalExpenses: number, score: number }`
  - `saveSnapshot(budget, health)`: Appends to `localStorage("kassen_snapshots")`, max 50 entries, deduplicates by day
  - `getSnapshots(): BudgetSnapshot[]`
- **`src/pages/Index.tsx`**: Call `saveSnapshot()` inside `handleComplete`
- **`src/components/dashboard/HistorikView.tsx`**: New component
  - Line chart (recharts) showing disposable income + score over time
  - "Ingen historik endnu" state if < 2 snapshots
  - Delta badges: "↑ 2.300 kr. siden første beregning"
- **`src/components/dashboard/Dashboard.tsx`**: Add "Historik" tab, render `<HistorikView>`

---

## 4. Par-split Mode

**What:** For couples (`householdType === "par"`), show expense split analysis.

- **`src/components/dashboard/ParSplitView.tsx`**: New component
  - Two split models: 50/50 vs. income-proportional
  - Toggle between models
  - Shows: each partner's share, who overpays/underpays, bar visualization
  - Based on existing `budget.totalExpenses`, `profile.income`, `profile.partnerIncome`
- **`src/components/dashboard/Dashboard.tsx`**: 
  - Conditionally add "Parsplit" tab when `profile.householdType === "par"`
  - Render `<ParSplitView>`

---

## Tab order (after changes)

```text
Cockpit | Fremad | Hvad hvis | Optimering | Sammenlign | Historik | [Parsplit*]
                                                                    *only for par
```

## Files created
- `src/components/DarkModeToggle.tsx`
- `src/components/dashboard/HvadHvisView.tsx`
- `src/components/dashboard/HistorikView.tsx`  
- `src/components/dashboard/ParSplitView.tsx`
- `src/lib/snapshots.ts`

## Files modified
- `src/index.css` (dark theme vars)
- `src/components/dashboard/Dashboard.tsx` (tabs + imports + dark toggle)
- `src/pages/Index.tsx` (snapshot save on complete)

