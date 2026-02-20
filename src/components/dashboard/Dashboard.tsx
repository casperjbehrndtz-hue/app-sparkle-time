import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  { id: "nu", label: "Nu", emoji: "📊" },
  { id: "fremad", label: "Fremad", emoji: "🔮" },
  { id: "optimering", label: "Optimering", emoji: "✨" },
  { id: "naboeffekt", label: "Naboer", emoji: "📍" },
];

export function Dashboard({ profile, budget, optimizations, onReset }: Props) {
  const [activeTab, setActiveTab] = useState("nu");

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="font-display font-black text-2xl gradient-text-green">Kassen</span>
        <button onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Start forfra
        </button>
      </div>

      {/* Disposable income – always visible */}
      <div className="mb-6">
        <DisposableIncome amount={budget.disposableIncome} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/40 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-base mb-0.5">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {activeTab === "nu" && <NuView budget={budget} />}
          {activeTab === "fremad" && <FremadView profile={profile} budget={budget} />}
          {activeTab === "optimering" && <OptimeringView profile={profile} budget={budget} optimizations={optimizations} />}
          {activeTab === "naboeffekt" && <NaboeffektView profile={profile} budget={budget} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
