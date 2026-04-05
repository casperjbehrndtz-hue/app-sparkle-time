#!/bin/bash
# loop.sh — Ralph Wiggum loop for NemtBudget.nu
# Usage: ./loop.sh [plan|build] [max_iterations]
#
# Examples:
#   ./loop.sh plan          # Run planning mode (usually 1-2 iterations)
#   ./loop.sh build         # Run build mode (default: 50 iterations)
#   ./loop.sh build 100     # Run build mode with 100 max iterations
#   ./loop.sh               # Runs plan first, then build automatically

MODE="${1:-auto}"
MAX_ITERATIONS="${2:-50}"
ITERATION=0

run_ralph() {
    local prompt_file="$1"
    local max="$2"
    local count=0

    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "  RALPH WIGGUM — $(echo $prompt_file | tr '[:lower:]' '[:upper:]')"
    echo "  Max iterations: $max"
    echo "  Ctrl+C to stop"
    echo "═══════════════════════════════════════════════════"
    echo ""

    while [ $count -lt $max ]; do
        count=$((count + 1))
        echo ""
        echo "─── Iteration $count / $max ───"
        echo ""

        cat "$prompt_file" | claude --dangerously-skip-permissions

        # Push after each completed iteration
        if git diff --cached --quiet 2>/dev/null && git diff --quiet 2>/dev/null; then
            echo "[ralph] No changes this iteration"
        else
            echo "[ralph] Changes detected, pushing..."
            git push 2>/dev/null || echo "[ralph] Push failed (no remote?), continuing..."
        fi

        echo "[ralph] Iteration $count complete"
    done

    echo ""
    echo "[ralph] Reached max iterations ($max)"
}

case "$MODE" in
    plan)
        run_ralph "PROMPT_plan.md" 3
        ;;
    build)
        run_ralph "PROMPT_build.md" "$MAX_ITERATIONS"
        ;;
    auto)
        echo "[ralph] Auto mode: planning first, then building"
        echo ""

        # Phase 1: Plan (max 3 iterations — usually enough)
        run_ralph "PROMPT_plan.md" 3

        echo ""
        echo "[ralph] Planning done. Starting build phase..."
        echo ""

        # Phase 2: Build
        run_ralph "PROMPT_build.md" "$MAX_ITERATIONS"
        ;;
    *)
        echo "Usage: ./loop.sh [plan|build|auto] [max_iterations]"
        exit 1
        ;;
esac
