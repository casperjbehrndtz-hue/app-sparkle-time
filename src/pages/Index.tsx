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
import { useAuth } from "@/hooks/useAuth";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

const STORAGE_KEY = "kassen_profile_v2";

const Index = () => {
  const config = useWhiteLabel();
  const { user, loading: authLoading, saveProfile: saveToCloud, loadProfile: loadFromCloud } = useAuth();
  const [profile, setProfile] = useState<BudgetProfile | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<BudgetProfile | null>(null);

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

  // Apply white-label theme
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", config.theme.primary);
    root.style.setProperty("--primary-foreground", config.theme.primaryForeground);
    root.style.setProperty("--ring", config.theme.primary);
    root.style.setProperty("--kassen-green", config.theme.primary);
    if (config.theme.accent) root.style.setProperty("--accent", config.theme.accent);
    if (config.displayFont) root.style.setProperty("--font-display", config.displayFont);
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--kassen-green");
    };
  }, [config]);

  // Load profile: cloud first, then localStorage
  useEffect(() => {
    if (authLoading) return;

    const loadData = async () => {
      // Try cloud if logged in
      if (user) {
        const cloudProfile = await loadFromCloud();
        if (cloudProfile) {
          setProfile(cloudProfile);
          return;
        }
      }
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const validated = parseProfile(JSON.parse(saved));
          if (validated) {
            setProfile(validated);
            // Sync to cloud if logged in
            if (user) saveToCloud(validated);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    };
    loadData();
  }, [user, authLoading]);

  const handleComplete = (p: BudgetProfile) => {
    setPendingProfile(p);
    setShowWelcome(true);
  };

  const handleWelcomeContinue = () => {
    if (!pendingProfile || !pendingBudget) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingProfile));
    setProfile(pendingProfile);
    setShowWelcome(false);
    const health = calculateHealth(pendingProfile, pendingBudget);
    saveSnapshot(pendingBudget, health.score);
    submitPriceObservations(pendingProfile);
    // Save to cloud
    if (user) saveToCloud(pendingProfile);
    setPendingProfile(null);
  };

  const handleProfileChange = (updated: BudgetProfile) => {
    setProfile(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (user) saveToCloud(updated);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  };

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
