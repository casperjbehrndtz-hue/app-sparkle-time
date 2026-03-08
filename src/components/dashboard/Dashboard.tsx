import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, FileText, BarChart3 } from "lucide-react";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { DisposableIncome } from "./DisposableIncome";
import { NuView } from "./NuView";
import { OptimeringView } from "./OptimeringView";
import { FremadView } from "./FremadView";
import { NaboeffektView } from "./NaboeffektView";
import { HvadHvisView } from "./HvadHvisView";
import { HistorikView } from "./HistorikView";
import { ParSplitView } from "./ParSplitView";
import { AIChatPanel } from "./AIChatPanel";
import { BudgetReport } from "./BudgetReport";
import { ChartsView } from "./ChartsView";
import { ShareCard } from "./ShareCard";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { SuiteNav } from "@/components/SuiteNav";
import { AppFooter } from "@/components/AppFooter";
import { formatKr } from "@/lib/budgetCalculator";
import { calculateHealth, generateSmartSteps } from "@/lib/healthScore";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  optimizations: OptimizingAction[];
  onReset: () => void;
}

const baseTabs = [
  { id: "nu", label: "Cockpit" },
  { id: "fremad", label: "Fremad" },
  { id: "hvadvis", label: "Hvad hvis" },
  { id: "optimering", label: "Optimering" },
  { id: "naboeffekt", label: "Sammenlign" },
  { id: "historik", label: "Historik" },
];

export function Dashboard({ profile, budget, optimizations, onReset }: Props) {
  const config = useWhiteLabel();
  const [activeTab, setActiveTab] = useState("nu");
  const [showReport, setShowReport] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  const health = calculateHealth(profile, budget);
  const smartSteps = generateSmartSteps(profile, budget, health);

  const tabs = profile.householdType === "par"
    ? [...baseTabs, { id: "parsplit", label: "Parsplit" }]
    : baseTabs;

  if (showReport) {
    return <BudgetReport profile={profile} budget={budget} health={health} onBack={() => setShowReport(false)} />;
  }

  if (showCharts) {
    return <ChartsView profile={profile} budget={budget} onBack={() => setShowCharts(false)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SuiteNav />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <span className="font-display font-black text-lg text-primary">{config.brandName}</span>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <DarkModeToggle />
            <button onClick={() => setShowCharts(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted">
              <BarChart3 className="w-3 h-3" /> <span className="hidden sm:inline">Diagrammer</span><span className="sm:hidden">Grafer</span>
            </button>
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted">
              <FileText className="w-3 h-3" /> Rapport
            </button>
            <button onClick={onReset}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted">
              <RotateCcw className="w-3 h-3" /> <span className="hidden sm:inline">Ny beregning</span><span className="sm:hidden">Nulstil</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5 flex-1">
        <DisposableIncome health={health} />

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
            {activeTab === "nu" && <NuView budget={budget} profile={profile} health={health} smartSteps={smartSteps} />}
            {activeTab === "fremad" && <FremadView profile={profile} budget={budget} health={health} />}
            {activeTab === "hvadvis" && <HvadHvisView profile={profile} budget={budget} health={health} />}
            {activeTab === "optimering" && <OptimeringView profile={profile} budget={budget} optimizations={optimizations} />}
            {activeTab === "naboeffekt" && <NaboeffektView profile={profile} budget={budget} />}
            {activeTab === "historik" && <HistorikView />}
            {activeTab === "parsplit" && profile.householdType === "par" && <ParSplitView profile={profile} budget={budget} />}
          </motion.div>
        </AnimatePresence>

        {/* Share Card Preview (toggleable) */}
        {showShareCard && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Del dit resultat</h3>
              <button onClick={() => setShowShareCard(false)} className="text-xs text-muted-foreground hover:text-foreground">Luk</button>
            </div>
            <ShareCard health={health} totalIncome={budget.totalIncome} totalExpenses={budget.totalExpenses} />
          </motion.div>
        )}
      </main>

      <AppFooter />

      <AIChatPanel profile={profile} budget={budget} />
    </div>
  );
}
