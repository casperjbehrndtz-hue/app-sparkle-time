---
active: true
iteration: 1
session_id: 
max_iterations: 50
completion_promise: null
started_at: "2026-04-05T15:49:32Z"
---

# PROMPT_build.md — NemtBudget.nu Build Mode

0a. Study `specs/*` with subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md.
0c. Study @AGENTS.md for build/test commands and operational learnings.
0d. For reference, the application source code is in `src/*`.

1. Your task is to implement functionality per the specifications using subagents. Follow @IMPLEMENTATION_PLAN.md and choose the SINGLE most important uncompleted item. Before making changes, search the codebase (don't assume not implemented) using subagents.

2. Implement completely. No placeholders. No stubs. No TODO comments. Ship-ready code.

3. After implementing, run backpressure:
   - `npm run build` — must pass with zero errors
   - Run tests if they exist — must pass
   - If tests unrelated to your work fail, resolve them as part of this iteration
   - Verify the specific acceptance criteria from IMPLEMENTATION_PLAN.md
   - `grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules` — remove any you added

4. When backpressure passes, update @IMPLEMENTATION_PLAN.md with progress, then `git add -A` then `git commit -m "ralph: [description]"`.

5. When you learn something new about how to run the application, update @AGENTS.md using a subagent but keep it brief.

6. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md even if unrelated to the current task.

7. When @IMPLEMENTATION_PLAN.md becomes large, clean out completed items to keep it focused.

8. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work.

9. If you find inconsistencies in the specs, update the spec file to match what the code actually needs.

10. All user-facing text MUST be in Danish. Never store user data server-side.

IMPORTANT: Keep @AGENTS.md operational only — status updates and progress notes belong in IMPLEMENTATION_PLAN.md. A bloated AGENTS.md pollutes every future loop's context.
