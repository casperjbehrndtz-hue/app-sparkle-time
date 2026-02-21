import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, AlertTriangle, TrendingUp, Lightbulb, Sparkles } from "lucide-react";
import { DisposableIncome } from "./DisposableIncome";
import { NuView } from "./NuView";
import { OptimeringView } from "./OptimeringView";
import { FremadView } from "./FremadView";
import { NaboeffektView } from "./NaboeffektView";
import { AIChatPanel } from "./AIChatPanel";
import { formatKr } from "@/lib/budgetCalculator";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  optimizations: OptimizingAction[];
  onReset: () => void;
}

const tabs = [
  { id: "nu", label: "Overblik" },
  { id: "fremad", label: "Fremad" },
  { id: "optimering", label: "Optimering" },
  { id: "naboeffekt", label: "Sammenlign" },
];

export function Dashboard({ profile, budget, optimizations, onReset }: Props) {
  const [activeTab, setActiveTab] = useState("nu");

  const totalSavings = optimizations.reduce((s, o) => s + o.besparelse_kr, 0);
  const expenseRatio = Math.round((budget.totalExpenses / budget.totalIncome) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <span className="font-display font-black text-lg text-primary">Kassen</span>
          <button onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted">
            <RotateCcw className="w-3 h-3" /> Ny beregning
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        <DisposableIncome amount={budget.disposableIncome} />

        {/* Insight cards */}
        {(totalSavings > 0 || expenseRatio > 75) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {totalSavings > 0 && (
              <button onClick={() => setActiveTab("optimering")}
                className="rounded-xl border border-border p-4 text-left hover:border-primary/20 transition-all group">
                <div className="flex items-center gap-2 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-kassen-gold" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-kassen-gold">Potentiale</span>
                </div>
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">Spar op til {formatKr(totalSavings)} kr./md.</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatKr(totalSavings * 12)} kr./år →</p>
              </button>
            )}
            {expenseRatio > 75 && (
              <button onClick={() => setActiveTab("nu")}
                className="rounded-xl border border-border p-4 text-left hover:border-destructive/20 transition-all group">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">Advarsel</span>
                </div>
                <p className="text-sm font-semibold">{expenseRatio}% går til faste udgifter</p>
                <p className="text-xs text-muted-foreground mt-0.5">Lille margin til opsparing →</p>
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}>
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>
            {activeTab === "nu" && <NuView budget={budget} profile={profile} />}
            {activeTab === "fremad" && <FremadView profile={profile} budget={budget} />}
            {activeTab === "optimering" && <OptimeringView profile={profile} budget={budget} optimizations={optimizations} />}
            {activeTab === "naboeffekt" && <NaboeffektView profile={profile} budget={budget} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-border py-6 text-center">
        <p className="text-[11px] text-muted-foreground/60">Beregnet på danske gennemsnitstal · Data gemmes lokalt</p>
      </footer>

      <AIChatPanel profile={profile} budget={budget} />
    </div>
  );
}
