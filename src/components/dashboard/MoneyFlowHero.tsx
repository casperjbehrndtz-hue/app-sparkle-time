import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { formatKr } from "@/lib/budgetCalculator";
import type { ComputedBudget, ExpenseItem } from "@/lib/types";
import { X } from "lucide-react";

interface Props {
  budget: ComputedBudget;
}

const FLOW_COLORS: Record<string, string> = {
  Bolig: "var(--kassen-blue)",
  Transport: "var(--kassen-gold)",
  Forsikring: "var(--kassen-green)",
  Mad: "#f59e0b",
  Abonnementer: "#8b5cf6",
  Fritid: "#ec4899",
  Tøj: "#06b6d4",
  Sundhed: "#14b8a6",
  Restaurant: "#f97316",
  Børn: "#a855f7",
  Fagforening: "#64748b",
  Fitness: "#10b981",
  Kæledyr: "#d946ef",
  Lån: "#ef4444",
  Opsparing: "#059669",
  Internet: "#3b82f6",
};

function getColor(cat: string) {
  return FLOW_COLORS[cat] ?? "hsl(var(--muted-foreground))";
}

/** Counts from 0 to `target` synced with bar animation timing */
function FlowCounter({ target, delay, duration = 800, className }: { target: number; delay: number; duration?: number; className?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!isInView) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
        setValue(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [isInView, target, delay, duration]);

  return <span ref={ref} className={className}>{formatKr(value)}</span>;
}

/** Counts a percentage from 0 to target */
function PctCounter({ target, delay, duration = 800, className }: { target: number; delay: number; duration?: number; className?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!isInView) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setValue(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [isInView, target, delay, duration]);

  return <span ref={ref} className={className}>{value}%</span>;
}

export function MoneyFlowHero({ budget }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const allExpenses = [...budget.fixedExpenses, ...budget.variableExpenses];
  const grouped: Record<string, number> = {};
  allExpenses.forEach((e) => {
    grouped[e.category] = (grouped[e.category] ?? 0) + e.amount;
  });
  const sorted = Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const top = sorted.slice(0, 6);
  const otherSum = sorted.slice(6).reduce((s, e) => s + e.value, 0);
  if (otherSum > 0) top.push({ name: "Øvrigt", value: otherSum });

  const disposable = budget.disposableIncome;
  const totalOut = budget.totalExpenses;
  const income = budget.totalIncome;

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
                  <FlowCounter target={income} delay={0.2} duration={1000} /> kr.
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
        <div className="space-y-1.5">
          {top.map((expense, i) => {
            const pct = income > 0 ? (expense.value / income) * 100 : 0;
            const barDelay = 0.6 + i * 0.08;
            return (
              <motion.div
                key={expense.name}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 + i * 0.08 }}
                className="flex items-center gap-3 group"
              >
                <span className="text-[10px] text-muted-foreground w-16 text-right truncate group-hover:text-foreground transition-colors">
                  {expense.name}
                </span>
                <div className="flex-1 h-5 rounded-md bg-muted/40 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-md transition-shadow"
                    style={{ backgroundColor: getColor(expense.name) }}
                    initial={{ width: 0 }}
                    animate={isInView ? { width: `${Math.max(pct, 2)}%` } : {}}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: barDelay }}
                    whileHover={{ boxShadow: `0 0 12px ${getColor(expense.name)}40` }}
                  />
                  <div className="absolute inset-0 flex items-center px-2 z-10">
                    {pct > 15 && (
                      <span className="text-[10px] font-medium text-white drop-shadow-sm">
                        <FlowCounter target={expense.value} delay={barDelay} />
                      </span>
                    )}
                  </div>
                </div>
                <PctCounter target={Math.round(pct)} delay={barDelay} className="text-[10px] font-medium tabular-nums text-muted-foreground w-12 text-right" />
              </motion.div>
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
                {disposable >= 0 ? "+" : ""}<FlowCounter target={Math.abs(disposable)} delay={1.5} duration={1000} /> kr.
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
      <PctCounter target={pct} delay={delay} duration={600} className={`font-display font-black text-lg ${positive ? "text-primary" : "text-foreground"}`} />
      <p className="text-[10px] text-muted-foreground"><FlowCounter target={amount} delay={delay} duration={600} /> kr.</p>
    </div>
  );
}
