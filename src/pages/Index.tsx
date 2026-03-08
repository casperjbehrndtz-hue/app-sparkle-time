import { useState, useEffect, useMemo } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { AIWelcomeInsight } from "@/components/onboarding/AIWelcomeInsight";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { computeBudget, generateOptimizations } from "@/lib/budgetCalculator";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { submitPriceObservations } from "@/lib/crowdsourcedPrices";
import { saveSnapshot } from "@/lib/snapshots";
import { calculateHealth } from "@/lib/healthScore";
import { parseProfile } from "@/lib/profileSchema";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

const STORAGE_KEY = "kassen_profile_v2";

const Index = () => {
  const config = useWhiteLabel();
  const [profile, setProfile] = useState<BudgetProfile | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<BudgetProfile | null>(null);

  // Memoize expensive computations
  const budget = useMemo<ComputedBudget | null>(
    () => profile ? computeBudget(profile) : null,
    [profile]
  );
  const optimizations = useMemo<OptimizingAction[]>(
    () => (profile && budget) ? generateOptimizations(profile, budget) : [],
    [profile, budget]
  );

  const pendingBudget = useMemo<ComputedBudget | null>(
    () => pendingProfile ? computeBudget(pendingProfile) : null,
    [pendingProfile]
  );

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

  // Load from localStorage with Zod validation
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const raw = JSON.parse(saved);
        const validated = parseProfile(raw);
        if (validated) {
          setProfile(validated);
        } else {
          // Corrupted data — remove it
          console.warn("[Index] Corrupted profile data removed from localStorage");
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const handleComplete = (p: BudgetProfile) => {
    setPendingProfile(p);
    setShowWelcome(true);
  };

  const handleWelcomeContinue = () => {
    if (!pendingProfile || !pendingBudget) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingProfile));
    setProfile(pendingProfile);
    setShowWelcome(false);
    // Save snapshot for history tracking
    const health = calculateHealth(pendingProfile, pendingBudget);
    saveSnapshot(pendingBudget, health.score);
    // Submit anonymous price data
    submitPriceObservations(pendingProfile);
    setPendingProfile(null);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
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
