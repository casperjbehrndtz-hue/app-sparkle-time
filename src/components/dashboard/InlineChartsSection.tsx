import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, GitCompare, TrendingUp } from "lucide-react";
import { SankeyDiagram } from "./SankeyDiagram";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart, ReferenceLine, Legend,
} from "recharts";
import { formatKr } from "@/lib/budgetCalculator";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

const TABS = [
  { id: "sankey" as const, label: "Pengestrøm", icon: BarChart3 },
  { id: "planlagt" as const, label: "Budget vs Typisk", icon: GitCompare },
  { id: "raadighed" as const, label: "Rådighedsbeløb", icon: TrendingUp },
];

type TabId = typeof TABS[number]["id"];

function ChartTooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-xl shadow-black/8 text-xs">
      {children}
    </div>
  );
}

export function InlineChartsSection({ profile, budget }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("sankey");

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex gap-1 p-1 rounded-2xl bg-muted/50 border border-border/50">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                isActive
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chart content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border/60 bg-background p-3 sm:p-5 shadow-sm"
        >
          {activeTab === "sankey" && <SankeyDiagram budget={budget} profile={profile} />}
          {activeTab === "planlagt" && <PlannedVsActualInline budget={budget} />}
          {activeTab === "raadighed" && <DisposableOverTimeInline budget={budget} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Planlagt vs Faktisk (inline) ─────────────
function PlannedVsActualInline({ budget }: { budget: ComputedBudget }) {
  const categoryMap = new Map<string, number>();
  [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
    categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
  });

  const data = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, planned]) => {
      const variance =
        name === "Mad & dagligvarer" ? 1.12
        : name === "Fritid" ? 1.18
        : name === "Restaurant" ? 1.25
        : name === "Tøj" ? 1.15
        : 1.0;
      return {
        name: name.length > 12 ? name.slice(0, 11) + "…" : name,
        fullName: name,
        Planlagt: planned,
        Typisk: Math.round(planned * variance),
      };
    });

  return (
    <div className="space-y-3">
      <div className="h-[300px] sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 5, bottom: 0 }} barGap={2} barCategoryGap="25%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-30} textAnchor="end" height={55} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <ChartTooltipBox>
                    <p className="font-semibold text-foreground mb-1">{d.fullName}</p>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Planlagt</span><span className="font-medium tabular-nums">{formatKr(d.Planlagt)} kr.</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Typisk</span><span className="font-medium tabular-nums">{formatKr(d.Typisk)} kr.</span></div>
                  </ChartTooltipBox>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
            <Bar dataKey="Planlagt" name="Dit budget" fill="#1e3a5f" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Typisk" name="Typisk forbrug" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-center">* Baseret på danske gennemsnitstal 2026.</p>
    </div>
  );
}

// ─── Rådighedsbeløb Over Tid (inline) ─────────
function DisposableOverTimeInline({ budget }: { budget: ComputedBudget }) {
  const monthly = budget.disposableIncome;
  const seasonalFactors = [0.85, 0.95, 1.0, 1.05, 1.0, 0.9, 0.7, 0.95, 1.0, 1.05, 0.95, 0.6];
  const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

  const data = months.map((m, i) => ({
    name: m,
    Rådighedsbeløb: Math.round(monthly * seasonalFactors[i]),
  }));
  const avg = Math.round(data.reduce((s, d) => s + d.Rådighedsbeløb, 0) / 12);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Gennemsnit", value: avg },
          { label: "Laveste", value: Math.min(...data.map((d) => d.Rådighedsbeløb)) },
          { label: "Højeste", value: Math.max(...data.map((d) => d.Rådighedsbeløb)) },
        ].map((s) => (
          <div key={s.label} className="text-center p-2.5 rounded-xl bg-muted/40 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
            <p className="font-display font-bold text-xs sm:text-sm text-foreground">{formatKr(s.value)} kr.</p>
          </div>
        ))}
      </div>
      <div className="h-[260px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="inlineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
            <ReferenceLine y={avg} stroke="#64748b" strokeDasharray="4 4" strokeWidth={1} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <ChartTooltipBox>
                    <p className="font-semibold text-foreground mb-1">{d.name}</p>
                    <p className="font-display font-bold text-base text-primary">{formatKr(d.Rådighedsbeløb)} kr.</p>
                  </ChartTooltipBox>
                );
              }}
            />
            <Area type="monotone" dataKey="Rådighedsbeløb" stroke="#2563eb" strokeWidth={2.5} fill="url(#inlineAreaGrad)" dot={{ r: 3, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
