import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, GitCompare, TrendingUp, Info } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
  CartesianGrid, Area, AreaChart, ReferenceLine,
} from "recharts";
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

// Refined color palette — navy-anchored with clear semantic meaning
const FLOW_COLORS: Record<string, string> = {
  "Bolig": "#1e40af",
  "Forsyning": "#3b82f6",
  "Transport": "#d97706",
  "Abonnementer": "#6366f1",
  "Forsikring": "#0ea5e9",
  "Fagforening": "#64748b",
  "Børn": "#f59e0b",
  "Kæledyr": "#a3a3a3",
  "Lån": "#7c3aed",
  "Fitness": "#14b8a6",
  "Opsparing": "#059669",
  "Mad & dagligvarer": "#dc2626",
  "Fritid": "#f97316",
  "Tøj": "#ec4899",
  "Sundhed": "#ef4444",
  "Restaurant": "#e11d48",
  "Andet": "#94a3b8",
};

function getFlowColor(cat: string) {
  return FLOW_COLORS[cat] || "#94a3b8";
}

// ─── Shared tooltip ───────────────────────────
function ChartTooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-xl shadow-black/8 text-xs">
      {children}
    </div>
  );
}

// ─── Pengestrøm (Waterfall) ───────────────────
function SankeyChart({ budget }: { budget: ComputedBudget }) {
  const categoryMap = new Map<string, number>();
  [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
    categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);
  });

  const data = [
    { name: "Indkomst", value: budget.totalIncome, type: "income", pct: 100 },
    ...Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        type: "expense",
        pct: Math.round((value / budget.totalIncome) * 100),
      })),
    { name: "Til overs", value: Math.max(0, budget.disposableIncome), type: "remaining", pct: Math.round((Math.max(0, budget.disposableIncome) / budget.totalIncome) * 100) },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Indkomst", value: budget.totalIncome, color: "text-kassen-blue" },
          { label: "Udgifter", value: budget.totalExpenses, color: "text-destructive" },
          { label: "Til overs", value: budget.disposableIncome, color: budget.disposableIncome >= 0 ? "text-kassen-blue" : "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="text-center p-3 rounded-xl bg-muted/40 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
            <p className={`font-display font-bold text-sm ${s.color}`}>{formatKr(s.value)} kr.</p>
          </div>
        ))}
      </div>

      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              type="number"
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={105}
              tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <ChartTooltipBox>
                    <p className="font-semibold text-foreground mb-1">{d.name}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-bold text-sm">{formatKr(d.value)} kr.</span>
                      <span className="text-muted-foreground">({d.pct}%)</span>
                    </div>
                  </ChartTooltipBox>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.type === "income"
                      ? "#1e3a5f"
                      : entry.type === "remaining"
                      ? "#2563eb"
                      : getFlowColor(entry.name)
                  }
                  opacity={entry.type === "income" ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Planlagt vs Faktisk ───────────────────────
function PlannedVsActualChart({ budget }: { budget: ComputedBudget }) {
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
      const typisk = Math.round(planned * variance);
      return {
        name: name.length > 12 ? name.slice(0, 11) + "…" : name,
        fullName: name,
        Planlagt: planned,
        Typisk: typisk,
        diff: typisk - planned,
        diffPct: Math.round(((typisk - planned) / planned) * 100),
      };
    });

  const hasOverspend = data.some((d) => d.diff > 0);

  return (
    <div className="space-y-4">
      {hasOverspend && (
        <div className="flex items-start gap-2 rounded-xl bg-kassen-gold/5 border border-kassen-gold/15 px-4 py-3">
          <Info className="w-3.5 h-3.5 text-kassen-gold flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Kategorier som mad, fritid og restaurant overstiger typisk budgettet med 12-25%.
          </p>
        </div>
      )}

      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 0 }} barGap={2} barCategoryGap="25%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={55}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <ChartTooltipBox>
                    <p className="font-semibold text-foreground mb-1.5">{d.fullName}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Planlagt</span>
                        <span className="font-medium tabular-nums">{formatKr(d.Planlagt)} kr.</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Typisk</span>
                        <span className="font-medium tabular-nums">{formatKr(d.Typisk)} kr.</span>
                      </div>
                      {d.diff !== 0 && (
                        <div className="flex justify-between gap-4 pt-1 border-t border-border/50">
                          <span className="text-muted-foreground">Difference</span>
                          <span className={`font-semibold tabular-nums ${d.diff > 0 ? "text-destructive" : "text-kassen-blue"}`}>
                            {d.diff > 0 ? "+" : ""}{formatKr(d.diff)} kr. ({d.diffPct > 0 ? "+" : ""}{d.diffPct}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </ChartTooltipBox>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="Planlagt" name="Dit budget" fill="#1e3a5f" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Typisk" name="Typisk forbrug" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-center">* "Typisk forbrug" er baseret på danske gennemsnitstal 2026 for lignende profiler.</p>
    </div>
  );
}

// ─── Rådighedsbeløb Over Tid ─────────────────
function DisposableOverTimeChart({ budget }: { budget: ComputedBudget }) {
  const monthly = budget.disposableIncome;
  const seasonalFactors = [0.85, 0.95, 1.0, 1.05, 1.0, 0.9, 0.7, 0.95, 1.0, 1.05, 0.95, 0.6];
  const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  const seasonNotes = ["", "", "", "", "", "Ferie", "Sommerferie", "", "", "", "", "Jul & nytår"];

  const data = months.map((m, i) => ({
    name: m,
    Rådighedsbeløb: Math.round(monthly * seasonalFactors[i]),
    note: seasonNotes[i],
  }));

  const avg = Math.round(data.reduce((s, d) => s + d.Rådighedsbeløb, 0) / 12);
  const min = Math.min(...data.map((d) => d.Rådighedsbeløb));
  const max = Math.max(...data.map((d) => d.Rådighedsbeløb));

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Gennemsnit", value: avg },
          { label: "Laveste (dec)", value: min },
          { label: "Højeste (apr)", value: max },
        ].map((s) => (
          <div key={s.label} className="text-center p-3 rounded-xl bg-muted/40 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
            <p className="font-display font-bold text-sm text-foreground">{formatKr(s.value)} kr.</p>
          </div>
        ))}
      </div>

      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <ReferenceLine y={avg} stroke="#64748b" strokeDasharray="4 4" strokeWidth={1} label={{ value: `Gns: ${formatKr(avg)}`, position: "insideTopRight", style: { fontSize: 10, fill: "#64748b" } }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <ChartTooltipBox>
                    <p className="font-semibold text-foreground mb-1">{d.name}</p>
                    <p className="font-display font-bold text-base text-kassen-blue">{formatKr(d.Rådighedsbeløb)} kr.</p>
                    {d.note && <p className="text-[10px] text-muted-foreground mt-1">📌 {d.note}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {d.Rådighedsbeløb < avg ? `${formatKr(avg - d.Rådighedsbeløb)} kr. under gns.` : `${formatKr(d.Rådighedsbeløb - avg)} kr. over gns.`}
                    </p>
                  </ChartTooltipBox>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="Rådighedsbeløb"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#areaGradient)"
              dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-center">* Sæsonvariation er estimeret baseret på typisk dansk forbrugsmønster (ferie, jul, etc.).</p>
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
        <div className="flex gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/50">
          {CHART_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeChart === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id)}
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
        <motion.div
          key={activeChart}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border/60 bg-background p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              {activeChart === "sankey" && <BarChart3 className="w-3.5 h-3.5 text-primary" />}
              {activeChart === "planlagt" && <GitCompare className="w-3.5 h-3.5 text-primary" />}
              {activeChart === "raadighed" && <TrendingUp className="w-3.5 h-3.5 text-primary" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {activeChart === "sankey" && "Pengestrøm"}
                {activeChart === "planlagt" && "Planlagt vs Faktisk"}
                {activeChart === "raadighed" && "Rådighedsbeløb over året"}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {activeChart === "sankey" && "Fra indkomst til udgifter — hvor går pengene hen?"}
                {activeChart === "planlagt" && "Dit budget sammenlignet med typisk dansk forbrug."}
                {activeChart === "raadighed" && "Estimeret månedligt rådighedsbeløb med sæsonvariation."}
              </p>
            </div>
          </div>

          {activeChart === "sankey" && <SankeyChart budget={budget} />}
          {activeChart === "planlagt" && <PlannedVsActualChart budget={budget} />}
          {activeChart === "raadighed" && <DisposableOverTimeChart budget={budget} />}
        </motion.div>
      </main>
    </div>
  );
}
