# Ralph × NemtBudget — 10 min setup

## Filer du skal kopiere ind i dit repo

```
nemtbudget/
├── loop.sh                    ← Kør denne
├── PROMPT_plan.md             ← Ralph læser denne i plan-mode
├── PROMPT_build.md            ← Ralph læser denne i build-mode
├── AGENTS.md                  ← Ralphs hukommelse (opdaterer selv)
├── IMPLEMENTATION_PLAN.md     ← Ralphs TODO-liste (opdaterer selv)
└── specs/                     ← Source of truth for hvad NemtBudget skal kunne
    ├── budget-calculator.md
    ├── payslip-analysis.md
    ├── pengetjek.md
    ├── stress-test-savings.md
    └── ux-seo-trust.md
```

## Step 1: Kopier filerne ind (2 min)

```bash
cd ~/sti-til/nemtbudget

# Kopier alle filer fra Downloads (eller hvor du har dem)
cp ~/Downloads/ralph-nemtbudget/loop.sh .
cp ~/Downloads/ralph-nemtbudget/PROMPT_plan.md .
cp ~/Downloads/ralph-nemtbudget/PROMPT_build.md .
cp ~/Downloads/ralph-nemtbudget/AGENTS.md .
cp ~/Downloads/ralph-nemtbudget/IMPLEMENTATION_PLAN.md .
cp -r ~/Downloads/ralph-nemtbudget/specs .

chmod +x loop.sh
```

## Step 2: Gem nuværende state (30 sek)

```bash
git add -A && git commit -m "pre-ralph: gemmer state før ralph kører"
```

## Step 3: Kør Ralph (10 sek)

```bash
./loop.sh
```

Det er det. Ralph gør nu:
1. **Plan-fase** (3 iterationer max) — læser hele din codebase, sammenligner med specs, bygger IMPLEMENTATION_PLAN.md
2. **Build-fase** (50 iterationer max) — tager én opgave ad gangen, implementerer, tester, committer, gentager

## Hvad sker der mens den kører?

- Terminalen viser hvilken iteration Ralph er på
- Ralph committer efter hver completed task
- IMPLEMENTATION_PLAN.md opdateres løbende
- AGENTS.md opdateres hvis Ralph lærer noget nyt om din codebase

## Stop

```bash
Ctrl+C
```

## Se hvad Ralph har lavet

```bash
git log --oneline -30          # Alle Ralphs commits
cat IMPLEMENTATION_PLAN.md     # Hvad er done, hvad mangler
cat AGENTS.md                  # Hvad Ralph har lært om dit projekt
```

## Tjek visuelt

```bash
npm run dev
```

## Hvis Ralph har lavet noget lort

```bash
# Rul én commit tilbage
git reset --hard HEAD~1

# Rul ALT tilbage til før Ralph
git log --oneline              # Find "pre-ralph: gemmer state..." commit
git reset --hard abc1234       # Brug dens hash
```

## Ship det

```bash
git push
```

Vercel bygger automatisk.

## Kør kun plan-mode (hvis du vil se planen først)

```bash
./loop.sh plan
cat IMPLEMENTATION_PLAN.md     # Review planen
./loop.sh build                # Kør build når du er tilfreds
```

## Kør mere end 50 iterationer

```bash
./loop.sh build 200            # Lad Ralph køre 200 iterationer
```

## Hvad koster det?

Ca. $5-15/time i Claude API credits afhængigt af codebase-størrelse.
8 timer ≈ $40-120. Du kan stoppe når som helst.

## Hvorfor det bliver bedre jo længere det kører

1. **AGENTS.md vokser** — Ralph lærer dine patterns, build-quirks, og hvad der fejler
2. **IMPLEMENTATION_PLAN.md skrumper** — opgaver bliver completed og ryddet op
3. **Backpressure strammes** — build, tests, og lint fanger flere fejl
4. **specs/ er ankeret** — Ralph sammenligner altid mod specs, ikke sine egne gæt
5. **Kode-patterns styrer** — jo mere korrekt kode der er, jo bedre patterns følger Ralph
