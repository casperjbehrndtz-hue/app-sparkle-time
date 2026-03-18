import { useMemo } from "react";
import { motion } from "framer-motion";
import { formatKr } from "@/lib/budgetCalculator";
import { EditableAmount } from "./EditableAmount";
import { SankeyDiagramV2 } from "./SankeyDiagramV2";
import { Wallet, Activity, Shield, Zap, AlertTriangle, TrendingUp, Radio, FileText, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { SocialProofNudge } from "./SocialProofNudge";
import { LossAversionInsights } from "./LossAversionInsights";
import { INCOME_MAPPINGS } from "@/lib/fieldMappings";
import { useMarketData } from "@/hooks/useMarketData";
import { hasLiveData, getLiveIncome, getLiveElPrice, getLiveMortgageRate } from "@/lib/marketData";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";
import type { HealthMetrics } from "@/lib/healthScore";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  health: HealthMetrics;
  smartSteps: { icon: string; text: string; priority: "high" | "medium" | "low" }[];
  optimizations: OptimizingAction[];
  onProfileChange: (profile: BudgetProfile) => void;
}


export function CockpitSection({ profile, budget, health, smartSteps, optimizations, onProfileChange }: Props) {
  const { t } = useI18n();
  const locale = useLocale();
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

  // Alerts
  const alerts = useMemo(() => {
    const a: { level: "critical" | "warning" | "insight"; message: string }[] = [];
    if (budget.disposableIncome < 0) a.push({ level: "critical", message: t("cockpit.alert.overBudget").replace("{amount}", formatKr(Math.abs(budget.disposableIncome), locale.currencyLocale)) });
    if (health.debtRatio > 35) a.push({ level: "warning", message: t("cockpit.alert.housingHigh").replace("{pct}", String(health.debtRatio)) });
    const streamCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime].filter(Boolean).length;
    if (streamCount >= 4) a.push({ level: "warning", message: t("cockpit.alert.streamingMany").replace("{count}", String(streamCount)) });
    if (health.savingsRate >= 20 && budget.disposableIncome > 3000) a.push({ level: "insight", message: t("cockpit.alert.savingsStrong").replace("{pct}", String(health.savingsRate)) });
    return a;
  }, [profile, budget, health, t, locale]);

  const totalSavings = optimizations.reduce((s, o) => s + o.besparelse_kr, 0);

  return (
    <div className="space-y-4">
      {/* ── Row 1: Health Score + Truths ── */}
      <div className="rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80" className="drop-shadow-sm" role="img" aria-label={`${score}/100 — ${label}`}>
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
            <TruthRow icon={<Wallet className="w-3 h-3" />} label={t("health.freedom")} value={`${formatKr(truths.freeCashFlow, locale.currencyLocale)} ${t("currency")}`} positive={truths.freeCashFlow > 5000} />
            <TruthRow icon={<Activity className="w-3 h-3" />} label={t("health.baseline")} value={`${formatKr(truths.monthlyBaseline, locale.currencyLocale)} ${t("currency")}`} positive={true} />
            <TruthRow icon={<Shield className="w-3 h-3" />} label={t("health.buffer")} value={truths.bufferScore} positive={health.bufferMonths >= 3} />
          </div>
        </div>

        {/* Income → Expenses → Free — EDITABLE */}
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{t("cockpit.income")}</p>
              <div className="font-display font-bold text-base text-primary">
                <EditableAmount
                  value={profile.income}
                  onChange={(v) => updateField("income", v)}
                  min={INCOME_MAPPINGS.income.min}
                  max={INCOME_MAPPINGS.income.max}
                  step={INCOME_MAPPINGS.income.step}
                  localeCode={locale.currencyLocale}
                  className="font-display font-bold text-base text-primary"
                />
              </div>
              {isPar && (
                <div className="mt-1.5 pt-1.5 border-t border-primary/10">
                  <p className="text-[8px] text-muted-foreground mb-0.5">{t("cockpit.partner")}</p>
                  <EditableAmount
                    value={profile.partnerIncome}
                    onChange={(v) => updateField("partnerIncome", v)}
                    min={INCOME_MAPPINGS.partnerIncome.min}
                    max={INCOME_MAPPINGS.partnerIncome.max}
                    step={INCOME_MAPPINGS.partnerIncome.step}
                    localeCode={locale.currencyLocale}
                    className="font-display font-bold text-sm text-primary/70"
                  />
                </div>
              )}
              <p className="text-[9px] text-muted-foreground mt-1 tabular-nums">{t("cockpit.total")}: {formatKr(budget.totalIncome, locale.currencyLocale)} {t("currency")}</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex-1 p-3 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{t("cockpit.expenses")}</p>
                <p className="font-display font-bold text-base text-foreground">{formatKr(budget.totalExpenses, locale.currencyLocale)} {t("currency")}</p>
              </div>
              <div className={`flex-1 p-3 rounded-xl border ${budget.disposableIncome >= 0 ? "bg-primary/5 border-primary/15" : "bg-destructive/5 border-destructive/15"}`}>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{t("cockpit.disposable")}</p>
                <p className={`font-display font-bold text-lg ${budget.disposableIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                  {budget.disposableIncome >= 0 ? "+" : ""}{formatKr(budget.disposableIncome, locale.currencyLocale)} {t("currency")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div className="space-y-1.5" role="list" aria-label={t("cockpit.alertsLabel")}>
          {alerts.map((alert, i) => (
            <motion.div
              key={i}
              role="listitem"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-xl p-3 flex items-center gap-2.5 border-l-4 border text-xs ${
                alert.level === "critical"
                  ? "bg-destructive/10 border-l-destructive border-destructive/30 text-destructive font-semibold"
                  : alert.level === "warning"
                  ? "bg-nemt-gold/5 border-l-nemt-gold border-nemt-gold/20 text-nemt-gold"
                  : "bg-primary/5 border-l-primary border-primary/20 text-primary"
              }`}
            >
              {alert.level === "critical" ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-label={t("cockpit.critical")} />
                : alert.level === "warning" ? <Zap className="w-3.5 h-3.5 flex-shrink-0" aria-label={t("cockpit.warning")} />
                : <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" aria-label={t("cockpit.insight")} />}
              <span className="font-medium">{alert.message}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Sankey pengestrøm ── */}
      <SankeyDiagramV2 budget={budget} profile={profile} />

      {/* ── Live Data Indicator ── */}
      {marketData && (() => {
        const live = hasLiveData(marketData);
        const liveItems: string[] = [];
        if (live.electricity) liveItems.push(t("cockpit.live.electricity").replace("{price}", getLiveElPrice(marketData)?.toFixed(2) ?? ""));
        if (live.mortgageRate) liveItems.push(t("cockpit.live.rate").replace("{rate}", String(getLiveMortgageRate(marketData))));
        if (live.income) {
          const areaIncome = getLiveIncome(marketData, profile.postalCode || "000");
          if (areaIncome) liveItems.push(t("cockpit.live.income").replace("{amount}", formatKr(areaIncome, locale.currencyLocale)));
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
              <p className="text-[10px] font-semibold tracking-widest uppercase text-primary/70 mb-0.5">{t("cockpit.savingsPotential")}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-black text-2xl text-primary">{formatKr(totalSavings, locale.currencyLocale)}</span>
                <span className="text-primary/70 text-sm">{t("perMonth")}</span>
              </div>
            </div>
            <button
              onClick={() => document.getElementById("handling")?.scrollIntoView({ behavior: "smooth" })}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
            >
              {t("cockpit.seePlan")}
            </button>
          </div>
        </motion.div>
      )}

      {/* Social insights */}
      <div className="rounded-2xl border border-border p-4 space-y-3">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{t("cockpit.insights")}</p>
        <SocialProofNudge profile={profile} budget={budget} health={health} />
        <LossAversionInsights profile={profile} budget={budget} health={health} />
      </div>

      {/* ── Payslip CTA ── */}
      <a
        href="/lonseddel"
        className="group flex items-center gap-3 rounded-2xl p-4 border border-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 hover:border-primary/30 transition-all"
      >
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">{t("payslip.ctaTitle")}</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{t("payslip.ctaDesc")}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </a>
    </div>
  );
}


function TruthRow({ icon, label, value, positive, positiveLabel, negativeLabel }: { icon: React.ReactNode; label: string; value: string; positive: boolean; positiveLabel?: string; negativeLabel?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
        {icon}
        <span className="sr-only">{positive ? (positiveLabel ?? "OK") : (negativeLabel ?? "!")}</span>
      </div>
      <div className="flex-1 min-w-0 flex items-baseline justify-between">
        <span className="text-[10px] text-muted-foreground truncate">{label}</span>
        <span className={`font-display font-bold text-[11px] ${positive ? "text-foreground" : "text-destructive"}`}>{value}</span>
      </div>
    </div>
  );
}
