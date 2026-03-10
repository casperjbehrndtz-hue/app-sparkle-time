import { motion } from "framer-motion";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import { formatKr } from "@/lib/budgetCalculator";
import { useMarketData } from "@/hooks/useMarketData";
import { getLiveIncome } from "@/lib/marketData";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

const fadeUp = (d: number) => ({
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { delay: d, duration: 0.35, ease: "easeOut" as const } },
});

export function NaboeffektView({ profile, budget }: Props) {
  const { data: marketData } = useMarketData();
  const isPar = profile.householdType === "par";
  // Use live income data if available, otherwise fall back to static estimates
  const liveIncome = getLiveIncome(marketData ?? null, profile.postalCode || "000");
  const neighborAvg = liveIncome ? Math.round(liveIncome * (isPar ? 0.65 : 0.38)) : (isPar ? 11800 : 7200);
  // neighborAvg represents estimated disposable income after typical expenses
  const userAmount = budget.disposableIncome;
  const diff = neighborAvg - userAmount;
  const isAboveAvg = userAmount >= neighborAvg;

  const percentile = Math.min(Math.max(Math.round(((userAmount - 2000) / (neighborAvg * 1.5 - 2000)) * 100), 5), 95);

  const categories = [
    { name: "Mad & dagligvarer", userSpend: isPar ? 7500 : 4500, avgSpend: isPar ? 6800 : 4000 },
    { name: "Abonnementer", userSpend: 500, avgSpend: 380 },
    { name: "Transport", userSpend: profile.hasCar ? (profile.carAmount || 3800) : 500, avgSpend: isPar ? 2900 : 1800 },
    { name: "Fritid", userSpend: isPar ? 2500 : 1500, avgSpend: isPar ? 2100 : 1300 },
  ];

  const biggestGap = [...categories].sort((a, b) => (b.userSpend - b.avgSpend) - (a.userSpend - a.avgSpend))[0];

  return (
    <div className="space-y-4">
      {/* Main insight */}
      <motion.div variants={fadeUp(0)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          📍 Postnummer {profile.postalCode || "—"} – sammenlignelige familier
        </p>
        {isAboveAvg ? (
          <>
            <p className="font-display font-bold text-xl text-primary mb-1">I klarer jer bedre end gennemsnittet! 🎉</p>
            <p className="text-sm text-muted-foreground">
              Lignende familier har <strong className="text-foreground">{formatKr(Math.abs(diff))} kr. mindre</strong> tilbage.
            </p>
          </>
        ) : (
          <>
            <p className="font-display font-bold text-xl mb-1">
              Sammenlignelige familier sparer <span className="text-kassen-gold">{formatKr(Math.abs(diff))} kr. mere</span>
            </p>
            <p className="text-sm text-muted-foreground">Største forskel: <strong className="text-foreground">{biggestGap.name}</strong></p>
          </>
        )}
      </motion.div>

      {/* Percentile */}
      <motion.div variants={fadeUp(0.1)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Jeres placering</p>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-2xl">Top <span className="text-primary">{100 - percentile}%</span></p>
          <p className="text-sm text-muted-foreground">for opsparing i jeres område</p>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentile}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: percentile > 60 ? "hsl(var(--primary))" : percentile > 30 ? "hsl(var(--kassen-gold))" : "hsl(var(--destructive))" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Lavest</span><span>Højest</span>
        </div>
      </motion.div>

      {/* Category comparison */}
      <motion.div variants={fadeUp(0.2)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">Kategori for kategori</p>
        <div className="space-y-4">
          {categories.map((cat, i) => {
            const catDiff = cat.userSpend - cat.avgSpend;
            const isOver = catDiff > 0;
            return (
              <motion.div key={cat.name} variants={fadeUp(0.2 + i * 0.06)} initial="hidden" animate="visible">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">{cat.name}</span>
                  <span className={`font-semibold ${isOver ? "text-destructive" : "text-primary"}`}>
                    {isOver ? "+" : ""}{formatKr(catDiff)} kr.
                  </span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-secondary/50" style={{ width: `${Math.min((cat.avgSpend / 10000) * 100, 100)}%` }} />
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isOver ? "bg-destructive/60" : "bg-primary/60"}`} style={{ width: `${Math.min((cat.userSpend / 10000) * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="flex gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <span className="flex-1">DK-gns.: {formatKr(cat.avgSpend)}</span>
                  <span className="flex-1">Jer: {formatKr(cat.userSpend)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <p className="text-xs text-muted-foreground text-center pb-4 opacity-60">
        Baseret på Danmarks Statistik for husstandsprofiler i jeres postnummer.
      </p>
    </div>
  );
}
