import { motion } from "framer-motion";
import { Shield, Wallet, Activity, ArrowLeft, Printer, Share2 } from "lucide-react";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import type { HealthMetrics } from "@/lib/healthScore";
import { formatKr } from "@/lib/budgetCalculator";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  health: HealthMetrics;
  onBack: () => void;
}

export function BudgetReport({ profile, budget, health, onBack }: Props) {
  const config = useWhiteLabel();
  const { t } = useI18n();
  const locale = useLocale();
  const isPar = profile.householdType === "par";

  const scoreColor = health.score >= 75 ? "text-primary" : health.score >= 55 ? "text-nemt-gold" : "text-destructive";
  const ringColor = health.score >= 75 ? "hsl(152, 55%, 40%)" : health.score >= 55 ? "hsl(38, 85%, 50%)" : "hsl(0, 72%, 51%)";
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (health.score / 100) * circumference;

  const now = new Date();
  const dateStr = now.toLocaleDateString(locale.currencyLocale, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      {/* Print-hidden toolbar */}
      <div className="print:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("report.back")}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: `${config.brandName} – ${t("report.title")}`, text: `Health Score: ${health.score}/100 | ${t("health.freedom")}: ${formatKr(health.truths.freeCashFlow, locale.currencyLocale)} ${t("perMonth")}`, url: window.location.href });
                }
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
            >
              <Share2 className="w-3.5 h-3.5" /> {t("report.share")}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> {t("report.print")}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-6 print:py-4 print:space-y-4">
        {/* Report Header */}
        <div className="text-center space-y-1">
          <span className="font-display font-black text-2xl text-primary">{config.brandName}</span>
          <p className="text-xs text-muted-foreground">{t("report.title")} · {dateStr}</p>
          <p className="text-xs text-muted-foreground/60">{isPar ? t("report.couple") : t("report.solo")} · {t("report.postalCode")} {profile.postalCode || "—"}</p>
        </div>

        {/* Health Score Hero */}
        <div className="rounded-2xl border border-border p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="relative flex-shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={radius} fill="none" stroke="hsl(150, 8%, 91%)" strokeWidth="5" />
              <circle
                cx="44" cy="44" r={radius}
                fill="none" stroke={ringColor} strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 44 44)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-display font-black text-xl ${scoreColor}`}>{health.score}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{health.label}</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <h2 className="font-display font-bold text-lg">{t("report.health")}</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatBox icon={<Wallet className="w-3 h-3" />} label={t("health.freedom")} value={`${formatKr(health.truths.freeCashFlow, locale.currencyLocale)} ${t("currency")}`} />
              <StatBox icon={<Activity className="w-3 h-3" />} label={t("health.baseline")} value={`${formatKr(health.truths.monthlyBaseline, locale.currencyLocale)} ${t("currency")}`} />
              <StatBox icon={<Shield className="w-3 h-3" />} label={t("report.buffer")} value={t("report.bufferMonths").replace("{n}", String(health.bufferMonths))} />
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label={t("report.monthlyIncome")} value={`${formatKr(budget.totalIncome, locale.currencyLocale)} ${t("currency")}`} />
          <MetricCard label={t("report.totalExpenses")} value={`${formatKr(budget.totalExpenses, locale.currencyLocale)} ${t("currency")}`} negative />
          <MetricCard label={t("report.savingsRate")} value={`${health.savingsRate}%`} good={health.savingsRate >= 15} />
          <MetricCard label={t("report.housingRatio")} value={`${health.debtRatio}%`} good={health.debtRatio <= 35} />
        </div>

        {/* Expense Breakdown */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 bg-muted/30 flex items-center justify-between">
            <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{t("report.expenseBreakdown")}</h3>
            <span className="text-sm font-display font-bold text-destructive">{formatKr(budget.totalExpenses, locale.currencyLocale)} {t("currency")}</span>
          </div>
          <div className="divide-y divide-border">
            <div className="px-5 py-2 bg-muted/10">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{t("report.fixedExpenses")}</span>
            </div>
            {budget.fixedExpenses.map((exp, i) => (
              <div key={`f-${i}`} className="px-5 py-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{exp.label}</span>
                <span className="text-sm font-medium tabular-nums">{formatKr(exp.amount, locale.currencyLocale)} {t("currency")}</span>
              </div>
            ))}
            <div className="px-5 py-2 bg-muted/10">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{t("report.variableExpenses")}</span>
            </div>
            {budget.variableExpenses.map((exp, i) => (
              <div key={`v-${i}`} className="px-5 py-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{exp.label}</span>
                <span className="text-sm font-medium tabular-nums">{formatKr(exp.amount, locale.currencyLocale)} {t("currency")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Income breakdown for couples */}
        {isPar && (
          <div className="rounded-xl border border-border p-5">
            <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("report.incomeDist")}</h3>
            <div className="h-3 rounded-full overflow-hidden bg-muted flex mb-2">
              <div className="h-full bg-primary rounded-l-full" style={{ width: `${(profile.income / budget.totalIncome) * 100}%` }} />
              <div className="h-full bg-nemt-blue rounded-r-full" style={{ width: `${(profile.partnerIncome / budget.totalIncome) * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("report.you")}: {formatKr(profile.income, locale.currencyLocale)} {t("currency")} ({Math.round((profile.income / budget.totalIncome) * 100)}%)</span>
              <span>{t("report.partner")}: {formatKr(profile.partnerIncome, locale.currencyLocale)} {t("currency")} ({Math.round((profile.partnerIncome / budget.totalIncome) * 100)}%)</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 border-t border-border space-y-1">
          <span className="font-display font-black text-sm text-primary">{config.brandName}</span>
          <p className="text-[10px] text-muted-foreground">{t("report.generated").replace("{date}", dateStr)}</p>
          <p className="text-[10px] text-muted-foreground/50">{config.footer?.text || t("report.disclaimer")}</p>
        </div>
      </main>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">{icon}<span className="text-[10px]">{label}</span></div>
      <span className="font-display font-bold text-sm">{value}</span>
    </div>
  );
}

function MetricCard({ label, value, negative, good }: { label: string; value: string; negative?: boolean; good?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-4 text-center">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">{label}</p>
      <span className={`font-display font-bold text-lg ${
        negative ? "text-destructive" : good !== undefined ? (good ? "text-primary" : "text-nemt-gold") : "text-foreground"
      }`}>
        {value}
      </span>
    </div>
  );
}
