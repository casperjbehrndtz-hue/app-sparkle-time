import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { DisposableIncome } from "./DisposableIncome";
import { NuView } from "./NuView";
import { OptimeringView } from "./OptimeringView";
import { FremadView } from "./FremadView";
import { NaboeffektView } from "./NaboeffektView";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  optimizations: OptimizingAction[];
  onReset: () => void;
}

const tabs = [
  { id: "nu", label: "Nu", icon: "📊" },
  { id: "fremad", label: "Fremad", icon: "🔮" },
  { id: "optimering", label: "Optimering", icon: "✨" },
  { id: "naboeffekt", label: "Naboer", icon: "📍" },
];

export function Dashboard({ profile, budget, optimizations, onReset }: Props) {
  const [activeTab, setActiveTab] = useState("nu");

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-display font-black text-xl gradient-text-green">Kassen</span>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50"
          >
            <RotateCcw className="w-3 h-3" /> Start forfra
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-8 space-y-6">
        {/* Disposable income – always visible */}
        <DisposableIncome amount={budget.disposableIncome} />

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-2xl bg-card border border-border/60">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {activeTab === "nu" && <NuView budget={budget} profile={profile} />}
            {activeTab === "fremad" && <FremadView profile={profile} budget={budget} />}
            {activeTab === "optimering" && <OptimeringView profile={profile} budget={budget} optimizations={optimizations} />}
            {activeTab === "naboeffekt" && <NaboeffektView profile={profile} budget={budget} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
