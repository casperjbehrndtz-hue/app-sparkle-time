import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, TrendingDown, Award } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatKr } from "@/lib/budgetCalculator";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import type { HealthMetrics } from "@/lib/healthScore";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  health: HealthMetrics;
  context?: "cockpit" | "optimize" | "forward" | "compare";
}

interface Nudge {
  icon: React.ReactNode;
  text: string;
  type: "positive" | "warning" | "neutral";
}

export function SocialProofNudge({ profile, budget, health, context = "cockpit" }: Props) {
  const { t } = useI18n();
  const isPar = profile.householdType === "par";

  const nudges = useMemo(() => {
    const result: Nudge[] = [];

    // Savings rate comparison
    const avgSavingsRate = isPar ? 12 : 8; // Danish averages
    const userSavingsRate = health.savingsRate;
    if (userSavingsRate > avgSavingsRate) {
      result.push({
        icon: <Award className="w-3.5 h-3.5 text-emerald-500" />,
        text: t("nudge.savingsAbove").replace("{pct}", `${Math.round(userSavingsRate)}%`).replace("{avg}", `${avgSavingsRate}%`),
        type: "positive",
      });
    } else if (userSavingsRate < avgSavingsRate * 0.5) {
      result.push({
        icon: <TrendingDown className="w-3.5 h-3.5 text-amber-500" />,
        text: t("nudge.savingsBelow").replace("{avg}", `${avgSavingsRate}%`),
        type: "warning",
      });
    }

    // Streaming comparison
    const streamCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime].filter(Boolean).length;
    if (streamCount >= 3) {
      result.push({
        icon: <Users className="w-3.5 h-3.5 text-blue-500" />,
        text: t("nudge.streaming").replace("{count}", `${streamCount}`),
        type: "warning",
      });
    }

    // Food spending comparison
    const avgFood = isPar ? 5500 : 3200;
    if (profile.foodAmount > avgFood * 1.2) {
      const pctOver = Math.round(((profile.foodAmount - avgFood) / avgFood) * 100);
      result.push({
        icon: <TrendingUp className="w-3.5 h-3.5 text-amber-500" />,
        text: t("nudge.foodAbove").replace("{pct}", `${pctOver}%`),
        type: "warning",
      });
    } else if (profile.foodAmount < avgFood * 0.85) {
      result.push({
        icon: <Award className="w-3.5 h-3.5 text-emerald-500" />,
        text: t("nudge.foodBelow"),
        type: "positive",
      });
    }

    // Disposable income percentile
    const avgDisposable = isPar ? 8500 : 4200;
    if (budget.disposableIncome > avgDisposable * 1.5) {
      const percentile = Math.min(95, Math.round(70 + (budget.disposableIncome - avgDisposable) / avgDisposable * 20));
      result.push({
        icon: <Award className="w-3.5 h-3.5 text-emerald-500" />,
        text: t("nudge.topPercentile").replace("{pct}", `${percentile}`),
        type: "positive",
      });
    }

    // Housing cost ratio
    const housingCost = (profile.housingType === "ejer" ? profile.mortgageAmount : profile.rentAmount) || 0;
    const housingRatio = housingCost / budget.totalIncome * 100;
    if (housingRatio > 33) {
      result.push({
        icon: <TrendingUp className="w-3.5 h-3.5 text-red-500" />,
        text: t("nudge.housingHigh").replace("{pct}", `${Math.round(housingRatio)}%`),
        type: "warning",
      });
    }

    // Health score comparison
    if (health.score >= 75) {
      result.push({
        icon: <Award className="w-3.5 h-3.5 text-emerald-500" />,
        text: t("nudge.healthTop"),
        type: "positive",
      });
    }

    // Context-specific filtering
    if (context === "optimize") return result.filter((n) => n.type === "warning").slice(0, 2);
    if (context === "forward") return result.filter((n) => n.type === "positive").slice(0, 2);
    return result.slice(0, 3);
  }, [profile, budget, health, isPar, context, t]);

  if (nudges.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
      {nudges.map((nudge, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
            nudge.type === "positive" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : nudge.type === "warning" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "bg-muted text-muted-foreground"
          }`}>
          {nudge.icon}
          <span>{nudge.text}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
