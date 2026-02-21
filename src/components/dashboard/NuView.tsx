import { motion } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import { formatKr } from "@/lib/budgetCalculator";

interface Props { budget: ComputedBudget; profile: BudgetProfile; }

const COLORS = [
  "hsl(152, 55%, 40%)", "hsl(213, 70%, 50%)", "hsl(38, 85%, 50%)",
  "hsl(280, 50%, 55%)", "hsl(190, 55%, 45%)", "hsl(320, 50%, 50%)",
  "hsl(30, 70%, 50%)", "hsl(160, 45%, 40%)",
];

export function NuView({ budget, profile }: Props) {
  const isPar = profile.householdType === "par";
  const grouped: Record<string, number> = {};
  [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
    grouped[e.category] = (grouped[e.category] ?? 0) + e.amount;
  });
  const donutData = Object.entries(grouped).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Indkomst", amount: budget.totalIncome, color: "text-primary" },
          { label: "Udgifter", amount: budget.totalExpenses, color: "text-destructive" },
          { label: "Til overs", amount: budget.disposableIncome, color: budget.disposableIncome > 0 ? "text-primary" : "text-destructive" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border p-3.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
            <p className={`font-display font-bold text-base ${item.color}`}>{formatKr(item.amount)}</p>
          </div>
        ))}
      </div>

      {/* Income split for couples */}
      {isPar && (
        <div className="rounded-xl border border-border p-4">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Indkomstfordeling</p>
          <div className="h-2.5 rounded-full overflow-hidden bg-muted flex">
            <div className="h-full bg-primary rounded-l-full" style={{ width: `${(profile.income / budget.totalIncome) * 100}%` }} />
            <div className="h-full bg-kassen-blue rounded-r-full" style={{ width: `${(profile.partnerIncome / budget.totalIncome) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
            <span>Dig: {formatKr(profile.income)} ({Math.round((profile.income / budget.totalIncome) * 100)}%)</span>
            <span>Partner: {formatKr(profile.partnerIncome)} ({Math.round((profile.partnerIncome / budget.totalIncome) * 100)}%)</span>
          </div>
        </div>
      )}

      {/* Donut */}
      <div className="rounded-xl border border-border p-5">
        <h3 className="font-semibold text-sm mb-4">Udgiftsoverblik</h3>
        <div className="flex gap-6 items-center">
          <div className="h-44 w-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={46} outerRadius={68} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {donutData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`${formatKr(val)} kr.`, ""]}
                  contentStyle={{ background: "white", border: "1px solid hsl(150,8%,91%)", borderRadius: "10px", fontSize: "13px", boxShadow: "0 4px 12px hsl(0 0% 0% / 0.06)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {donutData.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground text-xs">{entry.name}</span>
                </div>
                <span className="font-medium text-xs tabular-nums">{formatKr(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expense list */}
      <div className="rounded-xl border border-border divide-y divide-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Alle udgifter</h3>
          <span className="text-sm font-display font-bold text-destructive">{formatKr(budget.totalExpenses)} kr.</span>
        </div>
        {[...budget.fixedExpenses, ...budget.variableExpenses].map((exp, i) => (
          <div key={`${exp.label}-${i}`} className="px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{exp.label}</span>
            <span className="text-sm font-medium tabular-nums">{formatKr(exp.amount)} kr.</span>
          </div>
        ))}
      </div>
    </div>
  );
}
