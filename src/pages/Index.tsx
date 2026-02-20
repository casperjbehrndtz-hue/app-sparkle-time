import { useState, useEffect } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { computeBudget, generateOptimizations } from "@/lib/budgetCalculator";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

const STORAGE_KEY = "kassen_profile_v1";

const Index = () => {
  const [profile, setProfile] = useState<BudgetProfile | null>(null);
  const [budget, setBudget] = useState<ComputedBudget | null>(null);
  const [optimizations, setOptimizations] = useState<OptimizingAction[]>([]);

  // Load saved profile
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
    } catch {
      // ignore
    }
  }, []);

  const handleComplete = (p: BudgetProfile) => {
    const b = computeBudget(p);
    const opts = generateOptimizations(p, b);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setProfile(p);
    setBudget(b);
    setOptimizations(opts);
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
