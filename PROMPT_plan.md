# PROMPT_plan.md — NemtBudget.nu Planning Mode

0a. Study `specs/*` with subagents to learn what NemtBudget should do.
0b. Study @AGENTS.md for build/test commands.
0c. Study @IMPLEMENTATION_PLAN.md if it exists to understand previous state.
0d. For reference, the application source code is in `src/*`.

1. Use subagents to study existing source code in `src/*` and compare it against `specs/*`. Run backpressure checks:
   - `npm run build` — note errors/warnings
   - `npx tsc --noEmit` if TypeScript — note type errors
   - Check bundle size in build output
   - `grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules` — note cleanup needed
   - Look for TODO/FIXME/HACK comments: `grep -rn "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx"`

   Consider searching for: minimal implementations, placeholders, skipped/flaky tests, inconsistent patterns, missing error handling, missing loading states, missing mobile responsiveness, missing accessibility, missing SEO tags.

2. Create/update @IMPLEMENTATION_PLAN.md as a prioritized bullet point list sorted by impact. Each task must include:
   - What to do (specific files, specific changes)
   - Why it matters (user impact, conversion impact, quality impact)
   - Backpressure: how to verify it's done (test passes, build clean, grep returns nothing, Lighthouse score, etc.)
   - Priority: P0 (broken), P1 (high impact), P2 (medium), P3 (polish)

   IMPORTANT: Do NOT assume functionality is missing. Search the codebase first to confirm before listing.

3. Update @AGENTS.md if you learned anything about how to build/run/test the project. Keep it under 60 lines.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT commit code changes.

ULTIMATE GOAL: We want NemtBudget.nu to be the best free budgeting tool in Denmark — fast, accessible, trustworthy, with excellent SEO and conversion to sister products (ParFinans.dk, Børneskat.dk, Institutionsguide.dk). Every iteration Ralph runs should make the product measurably better across: correctness, performance, UX, accessibility, SEO, code quality, and conversion.
