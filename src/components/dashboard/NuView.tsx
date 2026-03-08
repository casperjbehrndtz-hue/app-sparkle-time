import { motion } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import type { HealthMetrics } from "@/lib/healthScore";
import { formatKr } from "@/lib/budgetCalculator";
import { ArrowRight, ExternalLink, AlertTriangle, TrendingUp, Zap } from "lucide-react";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { SocialProofNudge } from "./SocialProofNudge";

interface Props {
  budget: ComputedBudget;
  profile: BudgetProfile;
  health: HealthMetrics;
  smartSteps: { icon: string; text: string; priority: "high" | "medium" | "low" }[];
}

const COLORS = [
  "#1e40af", "#2563eb", "#d97706", "#6366f1",
  "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899",
  "#64748b", "#dc2626",
];

const BUCKET_COLORS = {
  drift: "#1e40af",
  frihed: "#d97706",
  fremtid: "#059669",
  risiko: "#6366f1",
};

const BUCKET_LABELS = {
  drift: { label: "Drift", emoji: "⚙️", sub: "Faste + nødvendigheder" },
  frihed: { label: "Frihed", emoji: "✨", sub: "Livsstil & oplevelser" },
  fremtid: { label: "Fremtid", emoji: "📈", sub: "Opsparing & investering" },
  risiko: { label: "Risiko", emoji: "🛡️", sub: "Forsikring & buffer" },
};

// Smart action links based on step content + white-label config
function getSmartAction(
  step: { icon: string; text: string; priority: "high" | "medium" | "low" },
  ctaLinks: Record<string, { label: string; url: string } | undefined>
): { label: string; url: string } | null {
  if (step.text.includes("streaming")) return { label: "Sammenlign streaming", url: "https://www.telepriser.dk/streaming" };
  if (step.text.includes("Forsikring") || step.text.includes("forsikring")) return ctaLinks.insurance ?? { label: "Sammenlign forsikring", url: "https://www.forbrugerrådet.dk/forsikring" };
  if (step.text.includes("Bolig") || step.text.includes("refinansier")) return ctaLinks.mortgage ?? { label: "Tjek boliglån", url: "https://www.mybanker.dk/boliglaan/" };
  if (step.text.includes("opsparing") || step.text.includes("Opsparingsrate")) return ctaLinks.savings ?? { label: "Start opsparing", url: "https://www.nordnet.dk/dk/tjenester/maanedsopsparing" };
  if (step.text.includes("buffer") || step.text.includes("Buffer")) return ctaLinks.savings ?? { label: "Opret bufferkonto", url: "https://www.mybanker.dk/opsparing/" };
  return null;
}

export function NuView({ budget, profile, health, smartSteps }: Props) {
  const config = useWhiteLabel();
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

  // Proactive alerts
  const alerts = generateAlerts(profile, budget, health);

  return (
    <div className="space-y-4">

      {/* Social Proof Nudges */}
      <SocialProofNudge profile={profile} budget={budget} health={health} context="cockpit" />

      {/* AI Insight - Always visible at top */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] border border-primary/15 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-primary/70 mb-1">AI-indsigt</p>
            <p className="text-sm text-foreground leading-relaxed">
              {generatePersonalInsight(profile, budget, health)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Proactive Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-xl p-3.5 flex items-start gap-3 border ${
                alert.level === "critical"
                  ? "bg-destructive/5 border-destructive/20"
                  : alert.level === "warning"
                  ? "bg-kassen-gold/5 border-kassen-gold/20"
                  : "bg-primary/5 border-primary/20"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                alert.level === "critical" ? "bg-destructive/10" : alert.level === "warning" ? "bg-kassen-gold/10" : "bg-primary/10"
              }`}>
                {alert.level === "critical" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                ) : alert.level === "warning" ? (
                  <Zap className="w-3.5 h-3.5 text-kassen-gold" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground leading-relaxed">{alert.message}</p>
                {alert.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{alert.detail}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 3 Next Steps with Smart Actions */}
      {smartSteps.length > 0 && (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Næste skridt</span>
            <span className="text-[10px] text-muted-foreground"></span>
          </div>
          {smartSteps.map((step, i) => {
            const action = getSmartAction(step, config.ctaLinks);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.2 }}
                className="px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <span className="text-base flex-shrink-0 mt-0.5">{step.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
                    {action && (
                      <a
                        href={action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold hover:bg-primary/15 transition-all"
                      >
                        {action.label} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${
                    step.priority === "high" ? "bg-destructive" : step.priority === "medium" ? "bg-kassen-gold" : "bg-primary"
                  }`} />
                </div>
              </motion.div>
            );
          })}
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

      {/* Expense Donut + Bar Chart */}
      <div className="rounded-xl border border-border p-5">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">Udgiftsoverblik</h3>
        
        {/* Bar chart — category breakdown */}
        <div className="h-52 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={donutData.sort((a, b) => b.value - a.value).slice(0, 8)} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const pct = Math.round((d.value / budget.totalExpenses) * 100);
                  return (
                    <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-xl shadow-black/8 text-xs">
                      <p className="font-semibold text-foreground mb-1">{d.name}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display font-bold text-sm">{formatKr(d.value)} kr./md.</span>
                        <span className="text-muted-foreground">({pct}%)</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={20}>
                {donutData.sort((a, b) => b.value - a.value).slice(0, 8).map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — refined */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
          <div className="h-36 w-36 sm:h-40 sm:w-40 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={44} outerRadius={64} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {donutData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const pct = Math.round((d.value / budget.totalExpenses) * 100);
                    return (
                      <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-xl shadow-black/8 text-xs">
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-muted-foreground">{formatKr(d.value)} kr. ({pct}%)</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5">
            {donutData.map((entry, i) => {
              const pct = Math.round((entry.value / budget.totalExpenses) * 100);
              return (
                <div key={entry.name} className="flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground text-xs group-hover:text-foreground transition-colors">{entry.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-medium text-xs tabular-nums">{formatKr(entry.value)}</span>
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums">{pct}%</span>
                  </div>
                </div>
              );
            })}
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

// Proactive alerts engine
interface Alert {
  level: "critical" | "warning" | "insight";
  message: string;
  detail?: string;
}

function generateAlerts(profile: BudgetProfile, budget: ComputedBudget, health: HealthMetrics): Alert[] {
  const alerts: Alert[] = [];

  if (budget.disposableIncome < 0) {
    alerts.push({
      level: "critical",
      message: `Du bruger ${formatKr(Math.abs(budget.disposableIncome))} kr. mere end du tjener`,
      detail: "Skær ned på variable udgifter eller øg indkomsten for at undgå gæld.",
    });
  }

  if (health.debtRatio > 35) {
    alerts.push({
      level: "warning",
      message: `Bolig udgør ${health.debtRatio}% af indkomsten — over anbefalede 35%`,
      detail: "Overvej refinansiering eller ekstra indkomstkilder.",
    });
  }

  const streamCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime].filter(Boolean).length;
  if (streamCount >= 4) {
    alerts.push({
      level: "warning",
      message: `${streamCount} streamingtjenester aktive — gennemsnitsdansker har 2`,
      detail: `Spar op til ${formatKr(streamCount * 99 - 2 * 99)} kr./md. ved at skære ${streamCount - 2} fra.`,
    });
  }

  if (health.savingsRate >= 20 && budget.disposableIncome > 3000) {
    alerts.push({
      level: "insight",
      message: `Stærk opsparingsrate på ${health.savingsRate}% — du bygger formue`,
      detail: `${formatKr(budget.disposableIncome * 0.5)} kr./md. investeret med 7% årligt afkast giver estimeret ca. ${formatKr(budget.disposableIncome * 0.5 * 12 * 5)} kr. på 5 år. Investering indebærer risiko.`,
    });
  } else if (health.savingsRate < 10 && budget.disposableIncome > 0) {
    alerts.push({
      level: "warning",
      message: `Opsparingsrate kun ${health.savingsRate}% — mål: minimum 15%`,
    });
  }

  return alerts.slice(0, 3);
}

// Personal AI insight generator
function generatePersonalInsight(profile: BudgetProfile, budget: ComputedBudget, health: HealthMetrics): string {
  const isPar = profile.householdType === "par";
  const freeCash = budget.disposableIncome;
  
  if (freeCash < 0) {
    return `${isPar ? "I" : "Du"} bruger mere end ${isPar ? "I" : "du"} tjener. Det vigtigste lige nu er at finde ${formatKr(Math.abs(freeCash))} kr. at skære — start med de variable udgifter.`;
  }
  
  if (health.debtRatio > 40) {
    return `${isPar ? "Jeres" : "Din"} boligudgift er ${health.debtRatio}% af indkomsten. Det er over grænsen. Overvej at refinansiere — det kan frigøre ${formatKr(Math.round(budget.totalIncome * (health.debtRatio - 30) / 100))} kr./md.`;
  }
  
  if (health.savingsRate >= 25) {
    const fiveYearProjection = Math.round(freeCash * 0.4 * 12 * 5 * 1.35); // 7% compounded rough
    return `Med ${health.savingsRate}% opsparingsrate er ${isPar ? "I" : "du"} i top 15% af danske husstande. Ved 7% årligt afkast kan det blive ca. ${formatKr(fiveYearProjection)} kr. på 5 år. Investering indebærer risiko.`;
  }
  
  if (health.savingsRate >= 15) {
    return `${isPar ? "I" : "Du"} sparer ${health.savingsRate}% op — det er solidt. Næste mål: nå 20% ved at flytte ${formatKr(Math.round((0.20 - health.savingsRate / 100) * budget.totalIncome))} kr. mere til opsparing.`;
  }

  const streamCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime].filter(Boolean).length;
  if (streamCount >= 3) {
    return `${streamCount} streamingtjenester koster ${formatKr(streamCount * 120)} kr./md. De fleste ser kun 1-2 regelmæssigt. Drop resten og flyt pengene til opsparing.`;
  }

  return `${isPar ? "Jeres" : "Dit"} frihedstal er ${formatKr(freeCash)} kr./md. — det er ${isPar ? "jeres" : "dit"} reelle økonomiske råderum efter alle faste udgifter.`;
}
