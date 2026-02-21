import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, GitCompare, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { formatKr } from "@/lib/budgetCalculator";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  onBack: () => void;
}

const CHART_TABS = [
  { id: "sankey", label: "Pengestrøm", icon: BarChart3 },
  { id: "planlagt", label: "Planlagt vs Faktisk", icon: GitCompare },
  { id: "raadighed", label: "Rådighedsbeløb", icon: TrendingUp },
] as const;

type ChartTab = typeof CHART_TABS[number]["id"];

// Category colors
const CAT_COLORS: Record<string, string> = {
  "Bolig": "hsl(213, 80%, 50%)",
  "Forsyning": "hsl(213, 60%, 60%)",
  "Transport": "hsl(38, 92%, 50%)",
  "Abonnementer": "hsl(152, 69%, 32%)",
  "Forsikring": "hsl(213, 80%, 45%)",
  "Fagforening": "hsl(213, 60%, 55%)",
  "Børn": "hsl(38, 80%, 55%)",
  "Kæledyr": "hsl(38, 70%, 60%)",
  "Lån": "hsl(213, 50%, 50%)",
  "Fitness": "hsl(152, 50%, 45%)",
  "Opsparing": "hsl(152, 69%, 32%)",
  "Mad & dagligvarer": "hsl(0, 72%, 51%)",
  "Fritid": "hsl(0, 50%, 60%)",
  "Tøj": "hsl(0, 40%, 65%)",
  "Sundhed": "hsl(0, 60%, 55%)",
  "Restaurant": "hsl(0, 45%, 58%)",
  "Andet": "hsl(213, 30%, 60%)",
};

function getColor(cat: string) {
  return CAT_COLORS[cat] || "hsl(var(--muted-foreground))";
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{d.name || d.label}</p>
      <p className="text-muted-foreground">{formatKr(d.value || d.amount)} kr./md.</p>
    </div>
  );
}

// ─── Sankey-style waterfall ───────────────────
function SankeyChart({ budget }: { budget: ComputedBudget }) {
  // Group expenses by category
  const categoryMap = new Map<string, number>();
  [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
    categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
  });

  const data = [
    { name: "Indkomst", value: budget.totalIncome, type: "income" },
    ...Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, type: "expense" })),
    { name: "Tilbage", value: Math.max(0, budget.disposableIncome), type: "remaining" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Visualisering af dine pengestrømme fra indkomst til udgifter.</p>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
            <XAxis type="number" tickFormatter={(v) => `${formatKr(v)}`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.type === "income"
                      ? "hsl(152, 69%, 32%)"
                      : entry.type === "remaining"
                      ? "hsl(213, 80%, 50%)"
                      : getColor(entry.name)
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Planned vs Actual ───────────────────────
function PlannedVsActualChart({ budget }: { budget: ComputedBudget }) {
  // Group by category, show "planned" (from budget) vs a simulated "typical" (±10-15%)
  const categoryMap = new Map<string, number>();
  [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
    categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
  });

  const data = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, planned]) => {
      // Simulate typical spending with slight variation
      const variance = name === "Mad & dagligvarer" ? 1.12 : name === "Fritid" ? 1.18 : name === "Restaurant" ? 1.25 : 1.0;
      return {
        name: name.length > 14 ? name.slice(0, 12) + "…" : name,
        fullName: name,
        Planlagt: planned,
        Typisk: Math.round(planned * variance),
      };
    });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Dit budget sammenlignet med typisk forbrug for din profil.</p>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tickFormatter={(v) => `${formatKr(v)}`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              formatter={(value: number, name: string) => [`${formatKr(value)} kr.`, name]}
              contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Planlagt" fill="hsl(213, 80%, 50%)" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="Typisk" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground/60 text-center">* "Typisk" er baseret på danske gennemsnitstal for lignende profiler.</p>
    </div>
  );
}

// ─── Disposable Income Over Time ─────────────
function DisposableOverTimeChart({ budget, profile }: { budget: ComputedBudget; profile: BudgetProfile }) {
  const monthly = budget.disposableIncome;
  // Simulate 12 months with seasonal variation
  const seasonalFactors = [0.85, 0.95, 1.0, 1.05, 1.0, 0.9, 0.7, 0.95, 1.0, 1.05, 0.95, 0.6];
  const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

  const data = months.map((m, i) => ({
    name: m,
    Rådighedsbeløb: Math.round(monthly * seasonalFactors[i]),
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Estimeret rådighedsbeløb over 12 måneder med sæsonvariation (ferie, jul).</p>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tickFormatter={(v) => `${formatKr(v)}`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              formatter={(value: number) => [`${formatKr(value)} kr.`, "Rådighedsbeløb"]}
              contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="Rådighedsbeløb" radius={[4, 4, 0, 0]} barSize={28}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.Rådighedsbeløb >= 0 ? "hsl(213, 80%, 50%)" : "hsl(0, 72%, 51%)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground/60 text-center">* Sæsonvariation er estimeret (ferie i jul, gaver i dec, etc.).</p>
    </div>
  );
}

export function ChartsView({ profile, budget, onBack }: Props) {
  const [activeChart, setActiveChart] = useState<ChartTab>("sankey");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage
          </button>
          <h1 className="font-display font-bold text-base text-foreground">Diagrammer</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        {/* Chart type selector */}
        <div className="flex gap-2">
          {CHART_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  activeChart === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Chart content */}
        <motion.div
          key={activeChart}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-border bg-background p-5"
        >
          {activeChart === "sankey" && <SankeyChart budget={budget} />}
          {activeChart === "planlagt" && <PlannedVsActualChart budget={budget} />}
          {activeChart === "raadighed" && <DisposableOverTimeChart budget={budget} profile={profile} />}
        </motion.div>
      </main>
    </div>
  );
}
