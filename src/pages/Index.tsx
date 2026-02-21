import { useState, useEffect } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { computeBudget, generateOptimizations } from "@/lib/budgetCalculator";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { submitPriceObservations } from "@/lib/crowdsourcedPrices";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

const STORAGE_KEY = "kassen_profile_v2";

const Index = () => {
  const config = useWhiteLabel();
  const [profile, setProfile] = useState<BudgetProfile | null>(null);
  const [budget, setBudget] = useState<ComputedBudget | null>(null);
  const [optimizations, setOptimizations] = useState<OptimizingAction[]>([]);

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
      // Reset on unmount
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
    const opts = generateOptimizations(p, b);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setProfile(p);
    setBudget(b);
    setOptimizations(opts);
    // Submit anonymous price data to improve estimates for everyone
    submitPriceObservations(p);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setBudget(null);
    setOptimizations([]);
  };

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
