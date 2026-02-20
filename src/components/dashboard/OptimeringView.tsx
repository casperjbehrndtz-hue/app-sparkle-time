import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";
import { formatKr } from "@/lib/budgetCalculator";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  optimizations: OptimizingAction[];
}

const categoryEmoji: Record<string, string> = {
  Forsyning: "📱", Abonnementer: "📺", Mad: "🛒", Bolig: "🏡", Forsikring: "🛡️", Transport: "🚗",
};

const fadeUp = (i: number) => ({
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" as const } },
});

export function OptimeringView({ profile, budget, optimizations }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0);
  const totalSavings = optimizations.reduce((s, o) => s + o.besparelse_kr, 0);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <motion.div variants={fadeUp(0)} initial="hidden" animate="visible"
        className="rounded-2xl p-6 border border-primary/20"
        style={{ background: "linear-gradient(135deg, hsl(150 100% 65% / 0.08), hsl(213 100% 65% / 0.05))" }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-1">Samlet potentiale</p>
        <div className="flex items-end gap-2">
          <span className="font-display font-black text-4xl text-primary">{formatKr(totalSavings)}</span>
          <span className="text-primary/70 text-lg mb-1">kr./md.</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          = <strong className="text-foreground">{formatKr(totalSavings * 12)} kr./år</strong> ved at følge planen
        </p>
      </motion.div>

      {/* Actions */}
      <div className="space-y-3">
        {optimizations.map((opt, i) => (
          <motion.div key={opt.rank} variants={fadeUp(i + 1)} initial="hidden" animate="visible"
            className="rounded-2xl bg-card border border-border overflow-hidden"
          >
            <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full text-left p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="font-display font-black text-primary text-sm">{opt.rank}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-muted-foreground">{categoryEmoji[opt.category] || "💡"} {opt.category}</span>
                  <span className="font-display font-bold text-primary text-sm">+{formatKr(opt.besparelse_kr)} kr.</span>
                </div>
                <p className="font-semibold text-sm">{opt.handling}</p>
              </div>
              {expanded === i ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />}
            </button>
            {expanded === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-4 border-t border-border/50 pt-3">
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{opt.beskrivelse}</p>
                <a href={opt.cta_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-all"
                >
                  {opt.cta_tekst} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Benchmark */}
      <motion.div variants={fadeUp(optimizations.length + 2)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Danmarks Statistik benchmark</p>
        {[
          { label: "DK-gennemsnit", amount: profile.householdType === "par" ? 12500 : 7200, isAvg: true },
          { label: "Jeres rådighedsbeløb", amount: budget.disposableIncome, isAvg: false },
        ].map((item) => (
          <div key={item.label} className="mb-3 last:mb-0">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={`font-bold ${item.isAvg ? "text-muted-foreground" : budget.disposableIncome > 12500 ? "text-primary" : "text-kassen-gold"}`}>
                {formatKr(item.amount)} kr.
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${item.isAvg ? "bg-muted-foreground/40" : "bg-primary"}`}
                style={{ width: `${Math.min((item.amount / 20000) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
