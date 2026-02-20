import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import { formatKr } from "@/lib/budgetCalculator";

interface Props {
  budget: ComputedBudget;
  profile: BudgetProfile;
}

const COLORS = [
  "hsl(150, 100%, 65%)",
  "hsl(213, 100%, 65%)",
  "hsl(43, 100%, 71%)",
  "hsl(280, 80%, 70%)",
  "hsl(190, 80%, 60%)",
  "hsl(320, 80%, 65%)",
  "hsl(30, 90%, 65%)",
  "hsl(160, 70%, 50%)",
];

const fadeUp = (i: number) => ({
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" as const } },
});

export function NuView({ budget, profile }: Props) {
  const isPar = profile.householdType === "par";

  // Group for donut
  const grouped: Record<string, number> = {};
  [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
    grouped[e.category] = (grouped[e.category] ?? 0) + e.amount;
  });
  const donutData = Object.entries(grouped).map(([name, value]) => ({ name, value }));
  const fixedTotal = budget.fixedExpenses.reduce((s, e) => s + e.amount, 0);
  const varTotal = budget.variableExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Indkomst", amount: budget.totalIncome, cls: "text-primary" },
          { label: "Udgifter", amount: budget.totalExpenses, cls: "text-destructive" },
          { label: "Tilbage", amount: budget.disposableIncome, cls: budget.disposableIncome > 0 ? "text-kassen-gold" : "text-destructive" },
        ].map((item, i) => (
          <motion.div key={item.label} variants={fadeUp(i)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className={`font-display font-bold text-lg ${item.cls}`}>{formatKr(item.amount)}</p>
            <p className="text-xs text-muted-foreground">kr./md.</p>
          </motion.div>
        ))}
      </div>

      {/* Par split */}
      {isPar && (
        <motion.div variants={fadeUp(3)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-4">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Indkomstfordeling</p>
          <div className="h-3 rounded-full overflow-hidden bg-muted flex">
            <div className="h-full bg-primary rounded-l-full" style={{ width: `${(profile.income / budget.totalIncome) * 100}%` }} />
            <div className="h-full bg-secondary rounded-r-full" style={{ width: `${(profile.partnerIncome / budget.totalIncome) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Dig: {formatKr(profile.income)} ({Math.round((profile.income / budget.totalIncome) * 100)}%)</span>
            <span>Partner: {formatKr(profile.partnerIncome)} ({Math.round((profile.partnerIncome / budget.totalIncome) * 100)}%)</span>
          </div>
        </motion.div>
      )}

      {/* Donut */}
      <motion.div variants={fadeUp(4)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
        <h3 className="font-display font-bold text-base mb-4">Udgiftsoverblik</h3>
        <div className="flex gap-6 items-center">
          <div className="h-48 w-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                  {donutData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`${formatKr(val)} kr.`, ""]}
                  contentStyle={{ background: "hsl(222, 16%, 11%)", border: "1px solid hsl(222, 14%, 18%)", borderRadius: "12px", color: "hsl(220, 20%, 94%)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {donutData.map((entry, i) => {
              const pct = Math.round((entry.value / budget.totalExpenses) * 100);
              return (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground text-xs">{entry.name}</span>
                  </div>
                  <span className="font-medium text-xs">{formatKr(entry.value)} <span className="text-muted-foreground">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Expense list */}
      <motion.div variants={fadeUp(5)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base">Alle udgifter</h3>
          <span className="text-sm font-display font-bold text-destructive">{formatKr(budget.totalExpenses)} kr.</span>
        </div>
        <div className="space-y-1.5">
          {[...budget.fixedExpenses, ...budget.variableExpenses].map((exp, i) => (
            <div key={`${exp.label}-${i}`} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: `hsl(var(${exp.colorVar}))` }} />
                <span className="text-sm text-muted-foreground">{exp.label}</span>
              </div>
              <span className="text-sm font-medium">{formatKr(exp.amount)} kr.</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
