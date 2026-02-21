import { motion } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import type { HealthMetrics } from "@/lib/healthScore";
import { formatKr } from "@/lib/budgetCalculator";
import { ArrowRight } from "lucide-react";

interface Props {
  budget: ComputedBudget;
  profile: BudgetProfile;
  health: HealthMetrics;
  smartSteps: { icon: string; text: string; priority: "high" | "medium" | "low" }[];
}

const COLORS = [
  "hsl(152, 55%, 40%)", "hsl(213, 70%, 50%)", "hsl(38, 85%, 50%)",
  "hsl(280, 50%, 55%)", "hsl(190, 55%, 45%)", "hsl(320, 50%, 50%)",
  "hsl(30, 70%, 50%)", "hsl(160, 45%, 40%)",
];

const BUCKET_COLORS = {
  drift: "hsl(213, 70%, 50%)",
  frihed: "hsl(38, 85%, 50%)",
  fremtid: "hsl(152, 55%, 40%)",
  risiko: "hsl(280, 50%, 55%)",
};

const BUCKET_LABELS = {
  drift: { label: "Drift", emoji: "⚙️", sub: "Faste + nødvendigheder" },
  frihed: { label: "Frihed", emoji: "✨", sub: "Livsstil & oplevelser" },
  fremtid: { label: "Fremtid", emoji: "📈", sub: "Opsparing & investering" },
  risiko: { label: "Risiko", emoji: "🛡️", sub: "Forsikring & buffer" },
};

export function NuView({ budget, profile, health, smartSteps }: Props) {
  const isPar = profile.householdType === "par";

  // Category grouping for donut
  const grouped: Record<string, number> = {};
  [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
    grouped[e.category] = (grouped[e.category] ?? 0) + e.amount;
  });
  const donutData = Object.entries(grouped).map(([name, value]) => ({ name, value }));

  // 4 Buckets
  const totalBuckets = Object.values(health.buckets).reduce((s, v) => s + v, 0);
  const bucketEntries = Object.entries(health.buckets) as [keyof typeof BUCKET_LABELS, number][];

  return (
    <div className="space-y-4">
      {/* 3 Next Steps */}
      {smartSteps.length > 0 && (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          <div className="px-4 py-2.5">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Næste skridt</span>
          </div>
          {smartSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
              className="px-4 py-3 flex items-start gap-3"
            >
              <span className="text-base flex-shrink-0 mt-0.5">{step.icon}</span>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{step.text}</p>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${
                step.priority === "high" ? "bg-destructive" : step.priority === "medium" ? "bg-kassen-gold" : "bg-primary"
              }`} />
            </motion.div>
          ))}
        </div>
      )}

      {/* 4 Buckets */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Pengenes fordeling</h3>
        {/* Stacked bar */}
        <div className="h-3 rounded-full overflow-hidden flex mb-4">
          {bucketEntries.map(([key, val]) => (
            <motion.div
              key={key}
              initial={{ width: 0 }}
              animate={{ width: `${totalBuckets > 0 ? (val / totalBuckets) * 100 : 25}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              style={{ backgroundColor: BUCKET_COLORS[key] }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {bucketEntries.map(([key, val]) => {
            const info = BUCKET_LABELS[key];
            const pct = totalBuckets > 0 ? Math.round((val / totalBuckets) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: BUCKET_COLORS[key] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{info.emoji} {info.label}</span>
                    <span className="text-[11px] font-display font-bold tabular-nums">{pct}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatKr(val)} kr.</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Income split for couples */}
      {isPar && (
        <div className="rounded-xl border border-border p-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Indkomstfordeling</p>
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
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">Udgiftsoverblik</h3>
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
          <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Alle udgifter</h3>
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
