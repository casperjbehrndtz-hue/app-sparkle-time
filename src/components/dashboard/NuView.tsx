import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { ComputedBudget } from "@/lib/types";
import { formatKr } from "@/lib/budgetCalculator";

interface Props {
  budget: ComputedBudget;
}

const COLORS = [
  "hsl(150, 100%, 65%)",
  "hsl(213, 100%, 65%)",
  "hsl(43, 100%, 71%)",
  "hsl(280, 80%, 70%)",
  "hsl(190, 80%, 60%)",
  "hsl(320, 80%, 65%)",
];

export function NuView({ budget }: Props) {
  // Group expenses for Donut
  const grouped: Record<string, number> = {};
  [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
    grouped[e.category] = (grouped[e.category] ?? 0) + e.amount;
  });
  const donutData = Object.entries(grouped).map(([name, value]) => ({
    name,
    value,
  }));

  // Sankey data
  const sankeyNodes = [
    { name: `Indkomst\n${formatKr(budget.totalIncome)} kr.` },
    { name: `Faste udgifter\n${formatKr(budget.fixedExpenses.reduce((s, e) => s + e.amount, 0))} kr.` },
    { name: `Variable udgifter\n${formatKr(budget.variableExpenses.reduce((s, e) => s + e.amount, 0))} kr.` },
    { name: `Rådighedsbeløb\n${formatKr(budget.disposableIncome)} kr.` },
  ];
  const fixedTotal = budget.fixedExpenses.reduce((s, e) => s + e.amount, 0);
  const varTotal = budget.variableExpenses.reduce((s, e) => s + e.amount, 0);
  const sankeyLinks = [
    { source: 0, target: 1, value: fixedTotal },
    { source: 0, target: 2, value: varTotal },
    ...(budget.disposableIncome > 0
      ? [{ source: 0, target: 3, value: budget.disposableIncome }]
      : []),
  ];

  const container = (i: number) => ({
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" as const },
    },
  });

  return (
    <div className="space-y-4">
      {/* Flow overview cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Samlet indkomst", amount: budget.totalIncome, color: "text-kassen-green" },
          { label: "Udgifter i alt", amount: budget.totalExpenses, color: "text-kassen-red" },
          { label: "Tilbage", amount: budget.disposableIncome, color: budget.disposableIncome > 0 ? "text-kassen-gold" : "text-kassen-red" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            variants={container(i)}
            initial="hidden"
            animate="visible"
            className="glass-card rounded-xl p-4 text-center"
          >
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className={`font-display font-bold text-lg ${item.color}`}>
              {formatKr(item.amount)}
            </p>
            <p className="text-xs text-muted-foreground">kr./md.</p>
          </motion.div>
        ))}
      </div>

      {/* Donut chart */}
      <motion.div
        variants={container(3)}
        initial="hidden"
        animate="visible"
        className="glass-card rounded-2xl p-5"
      >
        <h3 className="font-display font-bold text-base mb-4">Udgiftsoverblik</h3>
        <div className="flex gap-4 items-center">
          <div className="h-44 w-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`${formatKr(val)} kr.`, ""]}
                  contentStyle={{
                    background: "hsl(222, 16%, 11%)",
                    border: "1px solid hsl(222, 14%, 18%)",
                    borderRadius: "10px",
                    color: "hsl(220, 20%, 94%)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {donutData.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-medium">{formatKr(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Expense breakdown */}
      <motion.div
        variants={container(4)}
        initial="hidden"
        animate="visible"
        className="glass-card rounded-2xl p-5"
      >
        <h3 className="font-display font-bold text-base mb-4">Faste udgifter</h3>
        <div className="space-y-2">
          {budget.fixedExpenses.map((exp, i) => (
            <motion.div
              key={exp.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-kassen-blue" />
                <span className="text-sm text-muted-foreground truncate">{exp.label}</span>
              </div>
              <span className="text-sm font-medium ml-2">{formatKr(exp.amount)} kr.</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border flex justify-between">
          <span className="text-sm text-muted-foreground">I alt</span>
          <span className="font-display font-bold text-kassen-blue">
            {formatKr(budget.fixedExpenses.reduce((s, e) => s + e.amount, 0))} kr.
          </span>
        </div>
      </motion.div>
    </div>
  );
}
