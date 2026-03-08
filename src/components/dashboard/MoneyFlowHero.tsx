import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useMemo, useCallback } from "react";
import { formatKr } from "@/lib/budgetCalculator";
import { AnimatedCounter } from "./AnimatedCounter";
import type { ComputedBudget, ExpenseItem } from "@/lib/types";
import { X } from "lucide-react";

/** Trigger haptic feedback on supported devices */
function haptic(style: "light" | "medium" = "light") {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(style === "light" ? 10 : 25);
    }
  } catch {
    // Haptic not available — silent fail
  }
}

interface Props {
  budget: ComputedBudget;
}

// Map categories to design-token CSS vars
const FLOW_COLOR_MAP: Record<string, string> = {
  Bolig: "hsl(var(--kassen-blue))",
  Transport: "hsl(var(--kassen-gold))",
  Forsikring: "hsl(var(--kassen-green))",
  Mad: "hsl(var(--flow-food))",
  "Mad & dagligvarer": "hsl(var(--flow-food))",
  Abonnementer: "hsl(var(--flow-subscriptions))",
  Fritid: "hsl(var(--flow-leisure))",
  Tøj: "hsl(var(--flow-clothing))",
  Sundhed: "hsl(var(--flow-health))",
  Restaurant: "hsl(var(--flow-restaurant))",
  Børn: "hsl(var(--flow-children))",
  Fagforening: "hsl(var(--muted-foreground))",
  Fitness: "hsl(var(--kassen-green))",
  Kæledyr: "hsl(var(--flow-pets))",
  Lån: "hsl(var(--destructive))",
  Opsparing: "hsl(var(--flow-savings))",
  Internet: "hsl(var(--kassen-blue))",
  Forsyning: "hsl(var(--kassen-blue))",
  Andet: "hsl(var(--muted-foreground))",
  Øvrigt: "hsl(var(--muted-foreground))",
};

function getColor(cat: string) {
  return FLOW_COLOR_MAP[cat] ?? "hsl(var(--muted-foreground))";
}

export function MoneyFlowHero({ budget }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const { top, disposable, totalOut, income } = useMemo(() => {
    const allExpenses = [...budget.fixedExpenses, ...budget.variableExpenses];

    // Group by category with sub-items
    const categoryMap: Record<string, { total: number; items: ExpenseItem[] }> = {};
    allExpenses.forEach((e) => {
      if (!categoryMap[e.category]) categoryMap[e.category] = { total: 0, items: [] };
      categoryMap[e.category].total += e.amount;
      categoryMap[e.category].items.push(e);
    });

    const sorted = Object.entries(categoryMap)
      .map(([name, data]) => ({ name, value: data.total, items: data.items }))
      .sort((a, b) => b.value - a.value);

    const topEntries = sorted.slice(0, 6);
    const otherItems = sorted.slice(6);
    const otherSum = otherItems.reduce((s, e) => s + e.value, 0);
    if (otherSum > 0) topEntries.push({ name: "Øvrigt", value: otherSum, items: otherItems.flatMap(e => e.items) });

    return {
      top: topEntries,
      disposable: budget.disposableIncome,
      totalOut: budget.totalExpenses,
      income: budget.totalIncome,
    };
  }, [budget]);

  return (
    <div ref={ref} className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">Pengestrøm</p>
        <p className="text-xs text-muted-foreground">Hvordan dine penge flyder fra indkomst til udgifter</p>
      </div>

      <div className="px-5 pb-5">
        {/* Income bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="origin-left"
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-16">Ind</span>
            <div className="flex-1 h-8 rounded-lg bg-primary/15 relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-lg bg-primary"
                initial={{ width: 0 }}
                animate={isInView ? { width: "100%" } : {}}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              />
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="text-xs font-display font-bold text-primary-foreground drop-shadow-sm">
                  <AnimatedCounter target={income} delay={0.2} duration={1000} /> kr.
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Flow lines */}
        <div className="relative my-2 ml-[76px]">
          <svg width="100%" height="24" className="overflow-visible">
            <motion.path d="M 0 0 L 0 24" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 3" fill="none"
              initial={{ pathLength: 0 }} animate={isInView ? { pathLength: 1 } : {}} transition={{ duration: 0.4, delay: 0.6 }} />
            <motion.path d="M 0 12 L 24 12" stroke="hsl(var(--border))" strokeWidth="2" fill="none"
              initial={{ pathLength: 0 }} animate={isInView ? { pathLength: 1 } : {}} transition={{ duration: 0.3, delay: 0.8 }} />
          </svg>
        </div>

        {/* Expense waterfall */}
        <div className="space-y-1">
          {top.map((expense, i) => {
            const pct = income > 0 ? (expense.value / income) * 100 : 0;
            const barDelay = 0.6 + i * 0.08;
            const isExpanded = expandedCat === expense.name;
            return (
              <div key={expense.name} id={`flow-detail-${expense.name}`}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 + i * 0.08 }}
                  className="flex items-center gap-3 group cursor-pointer select-none active:scale-[0.98] transition-transform duration-100"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={`${expense.name}: ${formatKr(expense.value)} kr. Tryk for detaljer`}
                  onClick={() => {
                    haptic(isExpanded ? "light" : "medium");
                    const next = isExpanded ? null : expense.name;
                    setExpandedCat(next);
                    if (next) {
                      // Smooth scroll to the detail panel after it opens
                      requestAnimationFrame(() => {
                        setTimeout(() => {
                          document.getElementById(`flow-detail-${expense.name}`)?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                        }, 350);
                      });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      haptic("medium");
                      setExpandedCat(isExpanded ? null : expense.name);
                    }
                  }}
                >
                  <span className="text-[10px] text-muted-foreground w-16 text-right truncate group-hover:text-foreground group-active:text-foreground transition-colors">
                    {expense.name}
                  </span>
                  <div className="flex-1 h-7 sm:h-5 rounded-md bg-muted/40 relative overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-md transition-shadow"
                      style={{ backgroundColor: getColor(expense.name) }}
                      initial={{ width: 0 }}
                      animate={isInView ? { width: `${Math.max(pct, 2)}%` } : {}}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: barDelay }}
                      whileHover={{ boxShadow: `0 0 12px ${getColor(expense.name)}40` }}
                      whileTap={{ scale: 1.02 }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 z-10">
                      {pct > 15 && (
                        <span className="text-[10px] font-medium text-white drop-shadow-sm">
                          <AnimatedCounter target={expense.value} delay={barDelay} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 w-14 justify-end">
                    <AnimatedCounter target={Math.round(pct)} delay={barDelay} format="percent" className="text-[10px] font-medium tabular-nums text-muted-foreground" />
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[10px] text-muted-foreground/50"
                    >
                      ▾
                    </motion.span>
                  </div>
                </motion.div>

                {/* Expandable detail panel with swipe-to-dismiss */}
                <AnimatePresence>
                  {isExpanded && expense.items.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={0.4}
                      onDragEnd={(_e, info) => {
                        if (Math.abs(info.offset.y) > 40 || Math.abs(info.velocity.y) > 300) {
                          haptic("light");
                          setExpandedCat(null);
                        }
                      }}
                    >
                      <div className="ml-[76px] mr-[60px] mt-1 mb-2 rounded-lg border border-border/60 bg-muted/20 backdrop-blur-sm">
                        {/* Swipe handle */}
                        <div className="flex justify-center pt-1.5 pb-0.5">
                          <div className="w-8 h-1 rounded-full bg-muted-foreground/25" />
                        </div>
                        <div className="px-3 py-1.5 flex items-center justify-between border-b border-border/40">
                          <span className="text-[10px] font-semibold text-foreground">{expense.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); haptic("light"); setExpandedCat(null); }} className="p-0.5 rounded hover:bg-muted transition-colors">
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                        <div className="divide-y divide-border/30">
                          {expense.items.map((item, j) => {
                            const itemPct = expense.value > 0 ? Math.round((item.amount / expense.value) * 100) : 0;
                            return (
                              <div key={`${item.label}-${j}`} className="px-3 py-1.5 flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-[10px] font-medium tabular-nums">{formatKr(item.amount)} kr.</span>
                                  <span className="text-[9px] text-muted-foreground/60 tabular-nums w-7 text-right">{itemPct}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="px-3 py-1.5 border-t border-border/40 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-foreground">Total</span>
                          <span className="text-[10px] font-bold tabular-nums">{formatKr(expense.value)} kr.</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Flow lines to disposable */}
        <div className="relative my-2 ml-[76px]">
          <svg width="100%" height="24" className="overflow-visible">
            <motion.path d="M 0 0 L 0 24" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 3" fill="none"
              initial={{ pathLength: 0 }} animate={isInView ? { pathLength: 1 } : {}} transition={{ duration: 0.4, delay: 1.2 }} />
          </svg>
        </div>

        {/* Disposable income result */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 1.4 }}
          className="flex items-center gap-3"
        >
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-16">Frit</span>
          <div className={`flex-1 h-8 rounded-lg relative overflow-hidden ${disposable >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-lg ${disposable >= 0 ? "bg-primary" : "bg-destructive"}`}
              initial={{ width: 0 }}
              animate={isInView ? { width: `${Math.max(Math.abs(disposable) / income * 100, 3)}%` } : {}}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 1.5 }}
            />
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span className={`text-xs font-display font-bold drop-shadow-sm ${disposable >= 0 ? "text-primary-foreground" : "text-destructive-foreground"}`}>
                {disposable >= 0 ? "+" : ""}<AnimatedCounter target={Math.abs(disposable)} delay={1.5} duration={1000} /> kr.
              </span>
            </div>
          </div>
        </motion.div>

        {/* Summary pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1.8 }}
          className="mt-4 flex items-center justify-center gap-4"
        >
          <SummaryPill label="Udgifter" pct={Math.round((totalOut / income) * 100)} amount={totalOut} delay={1.8} />
          <div className="w-px h-6 bg-border" />
          <SummaryPill label="Til rådighed" pct={Math.round(Math.max(0, disposable) / income * 100)} amount={Math.max(0, disposable)} delay={1.8} positive />
        </motion.div>
      </div>
    </div>
  );
}

function SummaryPill({ label, pct, amount, delay, positive }: { label: string; pct: number; amount: number; delay: number; positive?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <AnimatedCounter target={pct} delay={delay} duration={600} format="percent" className={`font-display font-black text-lg ${positive ? "text-primary" : "text-foreground"}`} />
      <p className="text-[10px] text-muted-foreground"><AnimatedCounter target={amount} delay={delay} duration={600} /> kr.</p>
    </div>
  );
}
