import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Scale, ArrowLeftRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatKr } from "@/lib/budgetCalculator";
import { useLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

type SplitModel = "equal" | "proportional";

export function ParSplitView({ profile, budget }: Props) {
  const [model, setModel] = useState<SplitModel>("proportional");
  const locale = useLocale();
  const { t } = useI18n();
  const lc = locale.currencyLocale;

  const totalIncome = profile.income + profile.partnerIncome;
  const myShare = totalIncome > 0 ? profile.income / totalIncome : 0.5;
  const partnerShare = 1 - myShare;
  const totalExpenses = budget.totalExpenses;

  const splits = useMemo(() => {
    if (model === "equal") {
      return { my: totalExpenses / 2, partner: totalExpenses / 2 };
    }
    return { my: Math.round(totalExpenses * myShare), partner: Math.round(totalExpenses * partnerShare) };
  }, [model, totalExpenses, myShare, partnerShare]);

  const myRemaining = profile.income - splits.my;
  const partnerRemaining = profile.partnerIncome - splits.partner;

  const chartData = [
    { name: "Dig", udgifter: splits.my, rest: Math.max(0, myRemaining) },
    { name: "Partner", udgifter: splits.partner, rest: Math.max(0, partnerRemaining) },
  ];

  const fairnessDelta = myRemaining - partnerRemaining;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("couple.desc")}</p>

      {/* Model toggle */}
      <div className="flex rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setModel("equal")}
          className={`flex-1 py-3 text-xs font-medium transition-colors ${
            model === "equal" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scale className="w-3.5 h-3.5 inline mr-1.5" />
          50/50
        </button>
        <button
          onClick={() => setModel("proportional")}
          className={`flex-1 py-3 text-xs font-medium transition-colors ${
            model === "proportional" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1.5" />
          {t("couple.incomeBasedSplit")}
        </button>
      </div>

      {/* Income overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card border border-border p-4 text-center space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("couple.yourIncome")}</p>
          <p className="text-lg font-bold text-foreground">{formatKr(profile.income, lc)} {t("unit.currency")}</p>
          <p className="text-xs text-muted-foreground">{Math.round(myShare * 100)}% af total</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("couple.partnerIncome")}</p>
          <p className="text-lg font-bold text-foreground">{formatKr(profile.partnerIncome, lc)} {t("unit.currency")}</p>
          <p className="text-xs text-muted-foreground">{Math.round(partnerShare * 100)}% af total</p>
        </div>
      </div>

      {/* Split result */}
      <motion.div
        key={model}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5 space-y-4"
      >
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{t("couple.expenseDistribution")}</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center space-y-1">
            <Users className="w-4 h-4 mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">{t("couple.youPay")}</p>
            <p className="text-xl font-black text-foreground">{formatKr(splits.my, lc)} {t("unit.currency")}</p>
            <p className={`text-xs font-medium ${myRemaining >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatKr(myRemaining, lc)} {t("unit.currency")} {t("couple.remaining.suffix")}
            </p>
          </div>
          <div className="text-center space-y-1">
            <Users className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{t("couple.partnerPays")}</p>
            <p className="text-xl font-black text-foreground">{formatKr(splits.partner, lc)} {t("unit.currency")}</p>
            <p className={`text-xs font-medium ${partnerRemaining >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatKr(partnerRemaining, lc)} {t("unit.currency")} {t("couple.remaining.suffix")}
            </p>
          </div>
        </div>

        {/* Fairness indicator */}
        <div className={`text-center py-2 rounded-lg text-xs font-medium ${
          Math.abs(fairnessDelta) < 500
            ? "bg-primary/10 text-primary"
            : "bg-accent text-accent-foreground"
        }`}>
          {Math.abs(fairnessDelta) < 500
            ? "✓ " + t("couple.evenSplit")
            : fairnessDelta > 0
              ? t("couple.youHaveMore").replace("{amount}", formatKr(fairnessDelta, lc))
              : t("couple.partnerHasMore").replace("{amount}", formatKr(Math.abs(fairnessDelta), lc))
          }
        </div>
      </motion.div>

      {/* Bar chart */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{t("couple.visualization")}</h3>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" barCategoryGap="20%">
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} width={55} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [`${formatKr(v, lc)} ${t("unit.currency")}`, name === "udgifter" ? t("couple.expenses") : t("couple.remaining")]}
              />
              <Bar dataKey="udgifter" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="rest" stackId="a" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {model === "equal" && myShare !== 0.5 && (
        <p className="text-xs text-muted-foreground text-center italic">
          {"💡 "}{t("couple.tip")}
        </p>
      )}
    </div>
  );
}
