import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, TrendingDown, Calendar, TrendingUp } from "lucide-react";
import { formatKr } from "@/lib/budgetCalculator";
import { getCheapestHours, getNeighborIncomeGap } from "@/lib/marketData";
import { useMarketData } from "@/hooks/useMarketData";
import { useLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import type { HealthMetrics } from "@/lib/healthScore";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  health: HealthMetrics;
}

interface Insight {
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  title: string;
  value: string;
  sub: string;
  borderColor: string;
}

function futureValue(monthly: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  return Math.round(monthly * ((Math.pow(1 + r, n) - 1) / r));
}

export function LossAversionInsights({ profile, budget, health }: Props) {
  const { data: marketData } = useMarketData();
  const locale = useLocale();
  const { t } = useI18n();
  const isNO = locale.code === "no";
  const lc = locale.currencyLocale;

  const insights = useMemo(() => {
    const result: Insight[] = [];

    // ── 1. Indkomst vs. nabolag (DST: sammenlign take-home med take-home) ──
    // DST disponibel indkomst ≈ after-tax income, same as budget.totalIncome
    const incomeGap = getNeighborIncomeGap(marketData, profile.postalCode || "", budget.totalIncome);
    if (incomeGap !== null) {
      const statSource = isNO ? "SSB" : "Danmarks Statistik";
      const neighborLabel = t("insights.neighborLabel").replace("{postal}", profile.postalCode || "");
      if (incomeGap < -1000) {
        result.push({
          icon: <TrendingDown className="w-4 h-4" />,
          badge: t("insights.incomeBadge"),
          badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
          title: t("insights.incomeBelow")
            .replace("{amount}", formatKr(Math.abs(incomeGap), lc))
            .replace("{postal}", profile.postalCode || ""),
          value: t("insights.incomeBelowValue")
            .replace("{amount}", formatKr(Math.abs(incomeGap) * 12, lc))
            .replace("{unit}", locale.currencyUnit),
          sub: t("insights.incomeBelowSub")
            .replace("{neighborLabel}", neighborLabel)
            .replace("{avg}", formatKr(budget.totalIncome - incomeGap, lc))
            .replace("{source}", statSource),
          borderColor: "border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10",
        });
      } else if (incomeGap > 2000) {
        result.push({
          icon: <TrendingUp className="w-4 h-4" />,
          badge: t("insights.incomeBadge"),
          badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          title: t("insights.incomeAbove")
            .replace("{amount}", formatKr(incomeGap, lc))
            .replace("{postal}", profile.postalCode || ""),
          value: t("insights.incomeAboveValue")
            .replace("{amount}", formatKr(incomeGap * 12, lc))
            .replace("{unit}", locale.currencyUnit),
          sub: t("insights.incomeAboveSub")
            .replace("{neighborLabel}", neighborLabel)
            .replace("{avg}", formatKr(budget.totalIncome - incomeGap, lc))
            .replace("{source}", statSource),
          borderColor: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/10",
        });
      }
    }

    // ── 2. Årsomkostning på abonnementer ─────────────────────────────────
    const streamMonthly =
      (profile.hasNetflix ? 149 : 0) +
      (profile.hasSpotify ? 109 : 0) +
      (profile.hasHBO ? 99 : 0) +
      (profile.hasViaplay ? 99 : 0) +
      (profile.hasDisney ? 99 : 0) +
      (profile.hasAppleTV ? 59 : 0) +
      (profile.hasAmazonPrime ? 89 : 0);

    if (streamMonthly >= 200) {
      const annualCost = streamMonthly * 12;
      const count = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime, profile.hasSpotify].filter(Boolean).length;
      result.push({
        icon: <Calendar className="w-4 h-4" />,
        badge: t("insights.subsBadge"),
        badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        title: t("insights.subsTitle")
          .replace("{count}", String(count))
          .replace("{amount}", formatKr(annualCost, lc)),
        value: `${formatKr(annualCost, lc)} ${t("unit.krYear")}`,
        sub: t("insights.subsSub")
          .replace("{netflix}", formatKr(149 * 12, lc))
          .replace("{viaplay}", formatKr(99 * 12, lc))
          .replace("{hbo}", formatKr(99 * 12, lc)),
        borderColor: "border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10",
      });
    }

    // ── 3. Opsparingstab — kun hvis lav opsparingsrate OG råd til mere ──
    // Vis IKKE hvis allerede god opsparingsrate (>= 10%)
    const hasMeaningfulSavings = health.savingsRate >= 10;
    if (!hasMeaningfulSavings && budget.disposableIncome > 1500) {
      const suggestedMonthly = Math.min(Math.round(budget.disposableIncome * 0.5 / 100) * 100, 3000);
      if (suggestedMonthly >= 500) {
        const in15years = futureValue(suggestedMonthly, 0.07, 15);
        result.push({
          icon: <TrendingDown className="w-4 h-4" />,
          badge: t("insights.savingsBadge"),
          badgeColor: "bg-red-500/10 text-red-700 dark:text-red-400",
          title: t("insights.savingsTitle")
            .replace("{amount}", formatKr(budget.disposableIncome, lc)),
          value: `${formatKr(in15years, lc)} ${locale.currencyUnit} ${t("unit.possible")}`,
          sub: t("insights.savingsSub")
            .replace("{monthly}", formatKr(suggestedMonthly, lc))
            .replace("{total}", formatKr(in15years, lc)),
          borderColor: "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/10",
        });
      }
    }

    // ── 4. Billigste el-timer i dag (live Elspot) ─────────────────────────
    const cheapHours = getCheapestHours(marketData, 4);
    if (cheapHours.length >= 2) {
      const cheapest = cheapHours[0];
      const currentHour = new Date().getHours();
      const isCheapNow = cheapHours.some(h => h.hour === currentHour);
      const hourlyAll = marketData?.electricity.hourlyToday ?? [];
      const mostExpensive = hourlyAll.length > 0
        ? [...hourlyAll].sort((a, b) => b.allInPrice - a.allInPrice)[0]
        : null;
      const saving = mostExpensive ? Math.round((mostExpensive.allInPrice - cheapest.allInPrice) * 100) / 100 : 0;
      const hoursStr = cheapHours.map(h => h.label).join(", ");

      result.push({
        icon: <Zap className="w-4 h-4" />,
        badge: isCheapNow ? t("insights.elCheapNowBadge") : t("insights.elCheapBadge"),
        badgeColor: isCheapNow ? "bg-primary/10 text-primary" : "bg-slate-500/10 text-slate-700 dark:text-slate-400",
        title: isCheapNow
          ? t("insights.elCheapNowTitle").replace("{price}", cheapest.allInPrice.toFixed(2))
          : t("insights.elScheduleTitle").replace("{hours}", hoursStr),
        value: `${cheapest.allInPrice.toFixed(2)} ${t("unit.krKwh")}`,
        sub: saving > 0
          ? t("insights.elSavingSub")
              .replace("{saving}", saving.toFixed(2))
              .replace("{cheap}", cheapest.allInPrice.toFixed(2))
              .replace("{expensive}", mostExpensive!.allInPrice.toFixed(2))
              .replace("{total}", (saving * 2).toFixed(1))
          : t("insights.elLiveSub"),
        borderColor: isCheapNow
          ? "border-primary/20 bg-primary/5"
          : "border-slate-200 bg-slate-50/50 dark:border-slate-700/30 dark:bg-slate-900/10",
      });
    }

    return result;
  }, [profile, budget, health, marketData, t, locale, isNO, lc]);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
        {t("insights.heading")}
      </p>
      {insights.map((insight, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`rounded-2xl border p-4 ${insight.borderColor}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${insight.badgeColor}`}>
                  {insight.icon}
                  {insight.badge}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground leading-snug mb-1">{insight.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.sub}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-display font-black text-base text-foreground tabular-nums">{insight.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
