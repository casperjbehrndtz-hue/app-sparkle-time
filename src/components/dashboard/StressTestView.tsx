import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, Zap, Briefcase, ShieldAlert, Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatKr } from "@/lib/budgetCalculator";
import { calculateHealth } from "@/lib/healthScore";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

interface Scenario {
  id: string;
  icon: React.ReactNode;
  severity: "moderate" | "severe" | "extreme";
}

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }) };

export function StressTestView({ profile, budget }: Props) {
  const { t } = useI18n();
  const [inflationRate, setInflationRate] = useState(5);
  const [rateHike, setRateHike] = useState(2);
  const [incomeDrop, setIncomeDrop] = useState(30);

  const scenarios = useMemo(() => {
    const isPar = profile.householdType === "par";
    const totalIncome = budget.totalIncome;
    const fixedTotal = budget.fixedExpenses.reduce((s, e) => s + e.amount, 0);
    const variableTotal = budget.variableExpenses.reduce((s, e) => s + e.amount, 0);

    // 1. Inflation scenario
    const inflatedVariable = Math.round(variableTotal * (1 + inflationRate / 100));
    const inflatedFixed = Math.round(fixedTotal * (1 + (inflationRate * 0.4) / 100)); // fixed rises slower
    const inflationDisposable = totalIncome - inflatedFixed - inflatedVariable;
    const inflationSurvivalMonths = inflationDisposable > 0
      ? null // can survive indefinitely
      : Math.max(0, Math.floor((profile.savingsAmount * 12) / Math.abs(inflationDisposable)));

    // 2. Rate hike scenario (affects mortgage/rent)
    const mortgageIncrease = profile.housingType === "ejer"
      ? Math.round(profile.mortgageAmount * (rateHike / 100) * 10) // rough: 1% rate = ~10% payment increase
      : profile.housingType === "andel" && profile.mortgageAmount > 0
        ? Math.round(profile.mortgageAmount * (rateHike / 100) * 8)
        : 0;
    const rateDisposable = budget.disposableIncome - mortgageIncrease;

    // 3. Job loss / income drop
    const lostIncome = Math.round(totalIncome * (incomeDrop / 100));
    const jobLossDisposable = totalIncome - lostIncome - budget.totalExpenses;
    const dagpenge = isPar ? 19800 : 19800; // 2026 max dagpengesats
    const withDagpenge = dagpenge + (totalIncome - lostIncome) - budget.totalExpenses;
    const jobLossMonths = jobLossDisposable < 0
      ? Math.max(0, Math.floor((profile.hasSavings ? profile.savingsAmount * 6 : 0) / Math.abs(jobLossDisposable)))
      : null;

    // 4. Combined worst-case
    const worstDisposable = (totalIncome - lostIncome) - (inflatedFixed + inflatedVariable) - mortgageIncrease;
    const worstMonths = worstDisposable < 0
      ? Math.max(0, Math.floor((profile.hasSavings ? profile.savingsAmount * 6 : 0) / Math.abs(worstDisposable)))
      : null;

    return {
      inflation: { delta: inflationDisposable - budget.disposableIncome, disposable: inflationDisposable, survivalMonths: inflationSurvivalMonths },
      rateHike: { delta: -mortgageIncrease, disposable: rateDisposable, increase: mortgageIncrease },
      jobLoss: { delta: jobLossDisposable - budget.disposableIncome, disposable: jobLossDisposable, withDagpenge, months: jobLossMonths, lostAmount: lostIncome },
      combined: { disposable: worstDisposable, months: worstMonths },
    };
  }, [profile, budget, inflationRate, rateHike, incomeDrop]);

  const resilienceScore = useMemo(() => {
    let score = 100;
    if (scenarios.inflation.disposable < 0) score -= 30;
    else if (scenarios.inflation.disposable < 2000) score -= 15;
    if (scenarios.rateHike.disposable < 0) score -= 25;
    else if (scenarios.rateHike.disposable < 2000) score -= 10;
    if (scenarios.jobLoss.disposable < 0) score -= 25;
    if (scenarios.combined.disposable < 0) score -= 20;
    return Math.max(0, Math.min(100, score));
  }, [scenarios]);

  const resilienceColor = resilienceScore >= 70 ? "text-emerald-500" : resilienceScore >= 40 ? "text-amber-500" : "text-red-500";
  const resilienceBg = resilienceScore >= 70 ? "bg-emerald-500/10" : resilienceScore >= 40 ? "bg-amber-500/10" : "bg-red-500/10";

  return (
    <div className="space-y-5">
      {/* Resilience Score */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-5 ${resilienceBg} border border-border`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-5 h-5 ${resilienceColor}`} />
            <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{t("stress.resilience")}</span>
          </div>
          <span className={`text-3xl font-black font-display ${resilienceColor}`}>{resilienceScore}/100</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {resilienceScore >= 70 ? t("stress.resilienceGood") : resilienceScore >= 40 ? t("stress.resilienceOk") : t("stress.resilienceBad")}
        </p>
      </motion.div>

      {/* Scenario 1: Inflation */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold">{t("stress.inflation")}</h3>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">{t("stress.moderate")}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t("stress.inflationDesc")}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium w-8">{inflationRate}%</span>
          <input type="range" min={2} max={15} value={inflationRate} onChange={(e) => setInflationRate(+e.target.value)}
            className="flex-1 accent-amber-500 h-1.5" />
        </div>
        <div className="flex justify-between items-center bg-muted/50 rounded-xl p-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("stress.newDisposable")}</span>
            <p className={`text-lg font-bold ${scenarios.inflation.disposable < 0 ? "text-red-500" : "text-foreground"}`}>
              {formatKr(scenarios.inflation.disposable)} {t("currency")}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("stress.impact")}</span>
            <p className="text-lg font-bold text-red-500">{formatKr(scenarios.inflation.delta)} {t("currency")}</p>
          </div>
        </div>
      </motion.div>

      {/* Scenario 2: Rate hike */}
      {(profile.housingType === "ejer" || (profile.housingType === "andel" && profile.mortgageAmount > 0)) && (
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold">{t("stress.rateHike")}</h3>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-medium">{t("stress.severe")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("stress.rateHikeDesc")}</p>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium w-12">+{rateHike}%</span>
            <input type="range" min={0.5} max={5} step={0.5} value={rateHike} onChange={(e) => setRateHike(+e.target.value)}
              className="flex-1 accent-orange-500 h-1.5" />
          </div>
          <div className="flex justify-between items-center bg-muted/50 rounded-xl p-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("stress.mortgageUp")}</span>
              <p className="text-lg font-bold text-red-500">+{formatKr(scenarios.rateHike.increase)} {t("perMonth")}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("stress.newDisposable")}</span>
              <p className={`text-lg font-bold ${scenarios.rateHike.disposable < 0 ? "text-red-500" : "text-foreground"}`}>
                {formatKr(scenarios.rateHike.disposable)} {t("currency")}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Scenario 3: Job loss */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold">{t("stress.jobLoss")}</h3>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium">{t("stress.extreme")}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t("stress.jobLossDesc")}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium w-12">-{incomeDrop}%</span>
          <input type="range" min={10} max={100} step={5} value={incomeDrop} onChange={(e) => setIncomeDrop(+e.target.value)}
            className="flex-1 accent-red-500 h-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-xl p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("stress.withoutHelp")}</span>
            <p className={`text-lg font-bold ${scenarios.jobLoss.disposable < 0 ? "text-red-500" : "text-foreground"}`}>
              {formatKr(scenarios.jobLoss.disposable)} {t("currency")}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("stress.withDagpenge")}</span>
            <p className={`text-lg font-bold ${scenarios.jobLoss.withDagpenge < 0 ? "text-red-500" : "text-foreground"}`}>
              {formatKr(scenarios.jobLoss.withDagpenge)} {t("currency")}
            </p>
          </div>
        </div>
        {scenarios.jobLoss.months !== null && (
          <div className="flex items-center gap-2 bg-red-500/10 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">
              {t("stress.survivalTime")}: <strong>{scenarios.jobLoss.months} {t("stress.months")}</strong> {t("stress.withSavings")}
            </p>
          </div>
        )}
      </motion.div>

      {/* Combined worst-case */}
      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
        className="rounded-2xl border-2 border-red-500/30 bg-red-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold">{t("stress.worstCase")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("stress.worstCaseDesc")}</p>
        <div className="flex justify-between items-center bg-background/50 rounded-xl p-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("stress.newDisposable")}</span>
            <p className={`text-2xl font-black ${scenarios.combined.disposable < 0 ? "text-red-500" : "text-foreground"}`}>
              {formatKr(scenarios.combined.disposable)} {t("currency")}
            </p>
          </div>
          {scenarios.combined.months !== null && (
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("stress.survivalTime")}</span>
              <p className="text-2xl font-black text-red-500">{scenarios.combined.months} {t("stress.monthsShort")}</p>
            </div>
          )}
        </div>
      </motion.div>

      <p className="text-[10px] text-muted-foreground text-center">{t("stress.disclaimer")}</p>
    </div>
  );
}
