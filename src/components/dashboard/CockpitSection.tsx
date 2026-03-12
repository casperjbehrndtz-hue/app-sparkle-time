import { useMemo } from "react";
import { motion } from "framer-motion";
import { formatKr } from "@/lib/budgetCalculator";
import { EditableAmount } from "./EditableAmount";
import { Wallet, Activity, Shield, Zap, AlertTriangle, TrendingUp, Radio } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SocialProofNudge } from "./SocialProofNudge";
import { getFieldMapping, INCOME_MAPPINGS } from "@/lib/fieldMappings";
import { useMarketData } from "@/hooks/useMarketData";
import { hasLiveData, getLiveIncome, getLiveElPrice, getLiveMortgageRate } from "@/lib/marketData";
import type { BudgetProfile, ComputedBudget, OptimizingAction, ExpenseItem } from "@/lib/types";
import type { HealthMetrics } from "@/lib/healthScore";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  health: HealthMetrics;
  smartSteps: { icon: string; text: string; priority: "high" | "medium" | "low" }[];
  optimizations: OptimizingAction[];
  onProfileChange: (profile: BudgetProfile) => void;
}

const BUCKET_COLORS = {
  drift: "hsl(var(--primary))",
  frihed: "hsl(var(--kassen-gold))",
  fremtid: "hsl(var(--flow-savings))",
  risiko: "hsl(var(--flow-subscriptions))",
};

const BUCKET_LABELS = {
  drift: { label: "Drift", emoji: "⚙️", tip: "Faste udgifter: bolig, mad, transport, forsikring" },
  frihed: { label: "Frihed", emoji: "✨", tip: "Til overs efter faste udgifter — dit rådighedsbeløb" },
  fremtid: { label: "Fremtid", emoji: "📈", tip: "Opsparing og pensionsbidrag" },
  risiko: { label: "Risiko", emoji: "🛡️", tip: "Gæld og varierende udgifter" },
};

const FLOW_COLORS: Record<string, string> = {
  Bolig: "hsl(var(--kassen-blue))",
  Transport: "hsl(var(--kassen-gold))",
  Forsikring: "hsl(var(--kassen-green))",
  "Mad & dagligvarer": "hsl(var(--flow-food))",
  Mad: "hsl(var(--flow-food))",
  Abonnementer: "hsl(var(--flow-subscriptions))",
  Fritid: "hsl(var(--flow-leisure))",
  Tøj: "hsl(var(--flow-clothing))",
  Sundhed: "hsl(var(--flow-health))",
  Restaurant: "hsl(var(--flow-restaurant))",
  Børn: "hsl(var(--flow-children))",
  Opsparing: "hsl(var(--flow-savings))",
  Lån: "hsl(var(--destructive))",
};

function getColor(cat: string) {
  return FLOW_COLORS[cat] ?? "hsl(var(--muted-foreground))";
}

export function CockpitSection({ profile, budget, health, smartSteps, optimizations, onProfileChange }: Props) {
  const { t } = useI18n();
  const { data: marketData } = useMarketData();
  const { score, label, color, truths } = health;

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const ringColor = score >= 75 ? "#1e40af" : score >= 55 ? "#d97706" : "#dc2626";

  const isPar = profile.householdType === "par";

  // Helper: update a single profile field
  const updateField = (field: keyof BudgetProfile, value: number) => {
    onProfileChange({ ...profile, [field]: value });
  };

  // Top expenses grouped by category, with editable items
  const topExpenses = useMemo(() => {
    const categoryMap = new Map<string, { total: number; items: ExpenseItem[] }>();
    [...budget.fixedExpenses, ...budget.variableExpenses].forEach((e) => {
      const existing = categoryMap.get(e.category) || { total: 0, items: [] };
      existing.total += e.amount;
      existing.items.push(e);
      categoryMap.set(e.category, existing);
    });
    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, value: data.total, items: data.items }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [budget]);

  // Alerts
  const alerts = useMemo(() => {
    const a: { level: "critical" | "warning" | "insight"; message: string }[] = [];
    if (budget.disposableIncome < 0) a.push({ level: "critical", message: `Du bruger ${formatKr(Math.abs(budget.disposableIncome))} kr. mere end du tjener` });
    if (health.debtRatio > 35) a.push({ level: "warning", message: `Bolig udgør ${health.debtRatio}% af indkomsten — over anbefalede 35%` });
    const streamCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime].filter(Boolean).length;
    if (streamCount >= 4) a.push({ level: "warning", message: `${streamCount} streamingtjenester — gennemsnitsdansker har 2` });
    if (health.savingsRate >= 20 && budget.disposableIncome > 3000) a.push({ level: "insight", message: `Stærk opsparingsrate på ${health.savingsRate}%` });
    return a;
  }, [profile, budget, health]);

  // 4 Buckets
  const totalBuckets = Object.values(health.buckets).reduce((s, v) => s + v, 0);
  const bucketEntries = Object.entries(health.buckets) as [keyof typeof BUCKET_LABELS, number][];

  const totalSavings = optimizations.reduce((s, o) => s + o.besparelse_kr, 0);

  return (
    <div className="space-y-4">
      {/* ── Row 1: Health Score + Truths ── */}
      <div className="rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80" className="drop-shadow-sm">
              <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
              <motion.circle
                cx="40" cy="40" r={radius}
                fill="none" stroke={ringColor} strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-display font-black text-xl ${color}`}>{score}</span>
              <span className="text-[8px] text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <TruthRow icon={<Wallet className="w-3 h-3" />} label={t("health.freedom")} value={`${formatKr(truths.freeCashFlow)} kr.`} positive={truths.freeCashFlow > 5000} />
            <TruthRow icon={<Activity className="w-3 h-3" />} label={t("health.baseline")} value={`${formatKr(truths.monthlyBaseline)} kr.`} positive={true} />
            <TruthRow icon={<Shield className="w-3 h-3" />} label={t("health.buffer")} value={truths.bufferScore} positive={health.bufferMonths >= 3} />
          </div>
        </div>

        {/* Income → Expenses → Free — EDITABLE */}
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Indkomst</p>
              <div className="font-display font-bold text-base text-primary">
                <EditableAmount
                  value={profile.income}
                  onChange={(v) => updateField("income", v)}
                  min={INCOME_MAPPINGS.income.min}
                  max={INCOME_MAPPINGS.income.max}
                  step={INCOME_MAPPINGS.income.step}
                  className="font-display font-bold text-base text-primary"
                />
              </div>
              {isPar && (
                <div className="mt-1.5 pt-1.5 border-t border-primary/10">
                  <p className="text-[8px] text-muted-foreground mb-0.5">Partner</p>
                  <EditableAmount
                    value={profile.partnerIncome}
                    onChange={(v) => updateField("partnerIncome", v)}
                    min={INCOME_MAPPINGS.partnerIncome.min}
                    max={INCOME_MAPPINGS.partnerIncome.max}
                    step={INCOME_MAPPINGS.partnerIncome.step}
                    className="font-display font-bold text-sm text-primary/70"
                  />
                </div>
              )}
              <p className="text-[9px] text-muted-foreground mt-1 tabular-nums">I alt: {formatKr(budget.totalIncome)} kr.</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex-1 p-3 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Udgifter</p>
                <p className="font-display font-bold text-base text-foreground">{formatKr(budget.totalExpenses)} kr.</p>
              </div>
              <div className={`flex-1 p-3 rounded-xl border ${budget.disposableIncome >= 0 ? "bg-primary/5 border-primary/15" : "bg-destructive/5 border-destructive/15"}`}>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Til rådighed</p>
                <p className={`font-display font-bold text-base ${budget.disposableIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                  {budget.disposableIncome >= 0 ? "+" : ""}{formatKr(budget.disposableIncome)} kr.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div className="space-y-1.5" role="list" aria-label="Advarsler">
          {alerts.map((alert, i) => (
            <motion.div
              key={i}
              role="listitem"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-xl p-3 flex items-center gap-2.5 border-l-4 border text-xs ${
                alert.level === "critical"
                  ? "bg-destructive/5 border-l-destructive border-destructive/20 text-destructive"
                  : alert.level === "warning"
                  ? "bg-kassen-gold/5 border-l-kassen-gold border-kassen-gold/20 text-kassen-gold"
                  : "bg-primary/5 border-l-primary border-primary/20 text-primary"
              }`}
            >
              {alert.level === "critical" ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-label="Kritisk" />
                : alert.level === "warning" ? <Zap className="w-3.5 h-3.5 flex-shrink-0" aria-label="Advarsel" />
                : <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" aria-label="Indsigt" />}
              <span className="font-medium">{alert.message}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Top Expenses — compact waterfall with EDITABLE items ── */}
      <div className="rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Top udgifter</p>
          <p className="text-[9px] text-muted-foreground">Klik på beløb for at redigere</p>
        </div>
        <div className="space-y-2">
          {topExpenses.map((expense, i) => {
            const pct = budget.totalIncome > 0 ? (expense.value / budget.totalIncome) * 100 : 0;
            // Find editable items within this category
            const editableItems = expense.items.filter(item => getFieldMapping(item.label));
            const hasEditable = editableItems.length > 0;

            return (
              <motion.div
                key={expense.name}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="space-y-0.5"
              >
                {/* Category bar */}
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] text-muted-foreground w-20 text-right truncate">{expense.name}</span>
                  <div className="flex-1 h-5 rounded-md bg-muted/40 relative overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-md"
                      style={{ backgroundColor: getColor(expense.name) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 2)}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.06 }}
                    />
                    {pct > 18 && (
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-white drop-shadow-sm z-10">
                        {formatKr(expense.value)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{Math.round(pct)}%</span>
                </div>

                {/* Editable sub-items */}
                {hasEditable && (
                  <div className="ml-[calc(5rem+10px)] space-y-0.5">
                    {editableItems.map((item) => {
                      const mapping = getFieldMapping(item.label)!;
                      return (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{item.label}</span>
                          <EditableAmount
                            value={item.amount}
                            onChange={(v) => updateField(mapping.field, v)}
                            min={mapping.min}
                            max={mapping.max}
                            step={mapping.step}
                            className="text-[10px] font-medium tabular-nums text-foreground"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Disposable bar */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-20 text-right">Frit</span>
            <div className={`flex-1 h-5 rounded-md relative overflow-hidden ${budget.disposableIncome >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-md ${budget.disposableIncome >= 0 ? "bg-primary" : "bg-destructive"}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(Math.abs(budget.disposableIncome) / budget.totalIncome * 100, 2)}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
              />
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold z-10 ${budget.disposableIncome >= 0 ? "text-primary-foreground" : "text-destructive-foreground"}`}>
                {budget.disposableIncome >= 0 ? "+" : ""}{formatKr(budget.disposableIncome)} kr.
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
              {Math.round(Math.max(0, budget.disposableIncome) / budget.totalIncome * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Live Data Indicator ── */}
      {marketData && (() => {
        const live = hasLiveData(marketData);
        const liveItems: string[] = [];
        if (live.electricity) liveItems.push(`El: ${getLiveElPrice(marketData)?.toFixed(2)} kr/kWh`);
        if (live.mortgageRate) liveItems.push(`Rente: ${getLiveMortgageRate(marketData)}%`);
        if (live.income) {
          const areaIncome = getLiveIncome(marketData, profile.postalCode || "000");
          if (areaIncome) liveItems.push(`Gns. indkomst: ${formatKr(areaIncome)} kr.`);
        }
        if (liveItems.length === 0) return null;
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10"
          >
            <Radio className="w-3 h-3 text-primary animate-pulse flex-shrink-0" />
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <span className="text-[9px] font-semibold text-primary uppercase tracking-wider">Live data</span>
              {liveItems.map((item, i) => (
                <span key={i} className="text-[9px] text-muted-foreground">{item}</span>
              ))}
            </div>
          </motion.div>
        );
      })()}

      {/* ── 4 Buckets ── */}
      <div className="rounded-2xl border border-border p-4">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2.5">Pengenes fordeling</p>
        <div className="h-2.5 rounded-full overflow-hidden flex mb-3">
          {bucketEntries.map(([key, val]) => (
            <motion.div
              key={key}
              initial={{ width: 0 }}
              animate={{ width: `${totalBuckets > 0 ? (val / totalBuckets) * 100 : 25}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              style={{ backgroundColor: BUCKET_COLORS[key] }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {bucketEntries.map(([key, val]) => {
            const info = BUCKET_LABELS[key];
            const pct = totalBuckets > 0 ? Math.round((val / totalBuckets) * 100) : 0;
            return (
              <div key={key} className="text-center" title={info.tip}>
                <span className="text-[10px] font-medium" aria-hidden="true">{info.emoji} {info.label}</span>
                <p className="font-display font-bold text-xs tabular-nums">{pct}%</p>
                <p className="text-[9px] text-muted-foreground">{formatKr(val)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Savings Potential CTA ── */}
      {totalSavings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-4 border border-primary/20"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--primary) / 0.02))" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-primary/70 mb-0.5">Besparelsespotentiale</p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-black text-2xl text-primary">{formatKr(totalSavings)}</span>
                <span className="text-primary/70 text-sm">kr./md.</span>
              </div>
            </div>
            <button
              onClick={() => document.getElementById("handling")?.scrollIntoView({ behavior: "smooth" })}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
            >
              Se plan ↓
            </button>
          </div>
        </motion.div>
      )}

      <SocialProofNudge profile={profile} budget={budget} health={health} context="cockpit" />
    </div>
  );
}

function TruthRow({ icon, label, value, positive }: { icon: React.ReactNode; label: string; value: string; positive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex items-baseline justify-between">
        <span className="text-[10px] text-muted-foreground truncate">{label}</span>
        <span className={`font-display font-bold text-[11px] ${positive ? "text-foreground" : "text-destructive"}`}>{value}</span>
      </div>
    </div>
  );
}
