import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, AlertTriangle, TrendingUp, Lightbulb } from "lucide-react";
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
  { id: "nu", label: "Nu", icon: "📊" },
  { id: "fremad", label: "Fremad", icon: "🔮" },
  { id: "optimering", label: "Optimering", icon: "✨" },
  { id: "naboeffekt", label: "Naboer", icon: "📍" },
];

function QuickInsightCard({
  icon: Icon,
  iconColor,
  badge,
  badgeColor,
  title,
  value,
  onClick,
}: {
  icon: typeof AlertTriangle;
  iconColor: string;
  badge: string;
  badgeColor: string;
  title: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="w-full rounded-2xl border border-border/40 bg-card/60 p-4 text-left hover:border-border/70 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <p className="text-sm font-semibold mb-0.5">{title}</p>
      <p className="text-xs text-muted-foreground">{value}</p>
    </motion.button>
  );
}

export function Dashboard({ profile, budget, optimizations, onReset }: Props) {
  const [activeTab, setActiveTab] = useState("nu");

  const totalSavings = optimizations.reduce((s, o) => s + o.besparelse_kr, 0);
  const expenseRatio = Math.round((budget.totalExpenses / budget.totalIncome) * 100);
  const streamingCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime].filter(Boolean).length;

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-display font-black text-xl gradient-text-green">Kassen</span>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/30"
          >
            <RotateCcw className="w-3 h-3" /> Start forfra
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-8 space-y-5">
        {/* Disposable income – always visible */}
        <DisposableIncome amount={budget.disposableIncome} />

        {/* Quick insight cards */}
        <div className="grid grid-cols-2 gap-3">
          {totalSavings > 0 && (
            <QuickInsightCard
              icon={Lightbulb}
              iconColor="text-kassen-gold"
              badge="Potentiale"
              badgeColor="bg-kassen-gold/10 text-kassen-gold border-kassen-gold/20"
              title={`Spar op til ${formatKr(totalSavings)} kr./md.`}
              value={`${formatKr(totalSavings * 12)} kr./år med ${optimizations.length} tiltag`}
              onClick={() => setActiveTab("optimering")}
            />
          )}
          {expenseRatio > 75 && (
            <QuickInsightCard
              icon={AlertTriangle}
              iconColor="text-destructive"
              badge="Advarsel"
              badgeColor="bg-destructive/10 text-destructive border-destructive/20"
              title={`${expenseRatio}% går til udgifter`}
              value="Kun lille margin til opsparing og uforudsete udgifter"
              onClick={() => setActiveTab("nu")}
            />
          )}
          {streamingCount >= 3 && (
            <QuickInsightCard
              icon={TrendingUp}
              iconColor="text-secondary"
              badge="Observation"
              badgeColor="bg-secondary/10 text-secondary border-secondary/20"
              title={`${streamingCount} streamingtjenester`}
              value="Overlap koster dig unødvendige penge hver måned"
              onClick={() => setActiveTab("optimering")}
            />
          )}
          {profile.housingType === "ejer" && budget.disposableIncome < 8000 && (
            <QuickInsightCard
              icon={AlertTriangle}
              iconColor="text-kassen-gold"
              badge="Renteeksponering"
              badgeColor="bg-kassen-gold/10 text-kassen-gold border-kassen-gold/20"
              title="Sårbar ved rentestigning"
              value="Se hvad 2% stigning koster dig i Fremad-tabben"
              onClick={() => setActiveTab("fremad")}
            />
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-2xl bg-card/60 border border-border/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative text-sm">{tab.icon}</span>
              <span className="relative hidden sm:inline">{tab.label}</span>
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

      {/* Footer */}
      <footer className="border-t border-border/20 py-6 text-center">
        <p className="text-xs text-muted-foreground/40">
          Beregnet på danske gennemsnitstal · Data gemmes lokalt på din enhed
        </p>
      </footer>

      {/* AI Chat */}
      <AIChatPanel profile={profile} budget={budget} />
    </div>
  );
}
