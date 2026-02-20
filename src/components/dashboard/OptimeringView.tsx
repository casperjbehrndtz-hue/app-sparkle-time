import { useState } from "react";
import { motion } from "framer-motion";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";
import { formatKr } from "@/lib/budgetCalculator";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  optimizations: OptimizingAction[];
}

const categoryEmoji: Record<string, string> = {
  Forsyning: "📱",
  Abonnementer: "📺",
  Mad: "🛒",
  Bolig: "🏡",
  Forsikring: "🛡️",
  Transport: "🚗",
};

export function OptimeringView({ profile, budget, optimizations }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0);
  const totalSavings = optimizations.reduce((s, o) => s + o.besparelse_kr, 0);

  const container = (i: number) => ({
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" as const },
    },
  });

  return (
    <div className="space-y-4">
      {/* Hero savings banner */}
      <motion.div
        variants={container(0)}
        initial="hidden"
        animate="visible"
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, hsl(150 100% 65% / 0.12), hsl(213 100% 65% / 0.08))",
          border: "1px solid hsl(150 100% 65% / 0.2)",
        }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase text-kassen-green/70 mb-1">
          Samlet potentiale
        </p>
        <div className="flex items-end gap-2">
          <span className="font-display font-black text-4xl text-kassen-green">
            {formatKr(totalSavings)}
          </span>
          <span className="text-kassen-green/70 text-lg mb-1">kr./md.</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          = <strong className="text-foreground">{formatKr(totalSavings * 12)} kr. om året</strong> ved at følge planen herunder
        </p>
      </motion.div>

      {/* Action cards */}
      <div className="space-y-3">
        {optimizations.map((opt, i) => (
          <motion.div
            key={opt.rank}
            variants={container(i + 1)}
            initial="hidden"
            animate="visible"
            className="glass-card rounded-2xl overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full text-left p-4 flex items-start gap-4"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-kassen-green/15 flex items-center justify-center">
                <span className="font-display font-black text-kassen-green text-sm">
                  {opt.rank}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {categoryEmoji[opt.category] || "💡"} {opt.category}
                  </span>
                  <span className="font-display font-bold text-kassen-green text-sm">
                    +{formatKr(opt.besparelse_kr)} kr./md.
                  </span>
                </div>
                <p className="font-display font-semibold text-base">{opt.handling}</p>
              </div>
            </button>

            {expanded === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4 border-t border-border/50 pt-3"
              >
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {opt.beskrivelse}
                </p>
                <a
                  href={opt.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-kassen-green/15 border border-kassen-green/30 text-kassen-green text-sm font-semibold hover:bg-kassen-green/25 transition-all"
                >
                  {opt.cta_tekst}
                </a>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* DS benchmark */}
      <motion.div
        variants={container(optimizations.length + 2)}
        initial="hidden"
        animate="visible"
        className="glass-card rounded-2xl p-5"
      >
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Danmarks Statistik benchmark
        </p>
        <div className="space-y-3">
          {[
            {
              label: "Gennemsnitlig dansk husstand",
              amount: profile.householdType === "par" ? 12500 : 7200,
              isAvg: true,
            },
            {
              label: "Jeres rådighedsbeløb",
              amount: budget.disposableIncome,
              isAvg: false,
            },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`font-bold ${item.isAvg ? "text-muted-foreground" : item.amount > 12500 ? "text-kassen-green" : "text-kassen-gold"}`}>
                  {formatKr(item.amount)} kr.
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.isAvg ? "bg-muted-foreground/50" : "bg-kassen-green"}`}
                  style={{
                    width: `${Math.min((item.amount / 20000) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
