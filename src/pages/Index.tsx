import { useState, useEffect } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { AIWelcomeInsight } from "@/components/onboarding/AIWelcomeInsight";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { computeBudget, generateOptimizations } from "@/lib/budgetCalculator";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { submitPriceObservations } from "@/lib/crowdsourcedPrices";
import { saveSnapshot } from "@/lib/snapshots";
import { calculateHealth } from "@/lib/healthScore";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

const STORAGE_KEY = "kassen_profile_v2";

const Index = () => {
  const config = useWhiteLabel();
  const [profile, setProfile] = useState<BudgetProfile | null>(null);
  const [budget, setBudget] = useState<ComputedBudget | null>(null);
  const [optimizations, setOptimizations] = useState<OptimizingAction[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<BudgetProfile | null>(null);
  const [pendingBudget, setPendingBudget] = useState<ComputedBudget | null>(null);

  // Apply white-label theme as CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", config.theme.primary);
    root.style.setProperty("--primary-foreground", config.theme.primaryForeground);
    root.style.setProperty("--ring", config.theme.primary);
    root.style.setProperty("--kassen-green", config.theme.primary);
    if (config.theme.accent) {
      root.style.setProperty("--accent", config.theme.accent);
    }
    if (config.displayFont) {
      root.style.setProperty("--font-display", config.displayFont);
    }
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--kassen-green");
    };
  }, [config]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p: BudgetProfile = JSON.parse(saved);
        const b = computeBudget(p);
        const opts = generateOptimizations(p, b);
        setProfile(p);
        setBudget(b);
        setOptimizations(opts);
      }
    } catch { /* ignore */ }
  }, []);

  const handleComplete = (p: BudgetProfile) => {
    const b = computeBudget(p);
    // Show welcome insight screen before dashboard
    setPendingProfile(p);
    setPendingBudget(b);
    setShowWelcome(true);
  };

  const handleWelcomeContinue = () => {
    if (!pendingProfile || !pendingBudget) return;
    const opts = generateOptimizations(pendingProfile, pendingBudget);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingProfile));
    setProfile(pendingProfile);
    setBudget(pendingBudget);
    setOptimizations(opts);
    setShowWelcome(false);
    // Save snapshot for history tracking
    const health = calculateHealth(pendingProfile, pendingBudget);
    saveSnapshot(pendingBudget, health.score);
    // Submit anonymous price data
    submitPriceObservations(pendingProfile);
    setPendingProfile(null);
    setPendingBudget(null);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setBudget(null);
    setOptimizations([]);
  };

  // AI Welcome Insight screen
  if (showWelcome && pendingProfile && pendingBudget) {
    return (
      <AIWelcomeInsight
        profile={pendingProfile}
        budget={pendingBudget}
        onContinue={handleWelcomeContinue}
      />
    );
  }

  if (profile && budget) {
    return (
      <Dashboard
        profile={profile}
        budget={budget}
        optimizations={optimizations}
        onReset={handleReset}
      />
    );
  }

  return <OnboardingFlow onComplete={handleComplete} />;
};

export default Index;
