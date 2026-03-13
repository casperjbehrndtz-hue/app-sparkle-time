import { useState, useEffect, useMemo } from "react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { WelcomePage } from "@/components/onboarding/WelcomePage";
import { AIWelcomeInsight } from "@/components/onboarding/AIWelcomeInsight";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { DemoBanner } from "@/components/DemoBanner";
import { computeBudget, generateOptimizations } from "@/lib/budgetCalculator";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useLocale } from "@/lib/locale";
import { submitPriceObservations } from "@/lib/crowdsourcedPrices";
import { saveSnapshot } from "@/lib/snapshots";
import { calculateHealth } from "@/lib/healthScore";
import { parseProfile } from "@/lib/profileSchema";
import { useAuth } from "@/hooks/useAuth";
import { useMarketData } from "@/hooks/useMarketData";
import { demoProfile } from "@/lib/demoData";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

const STORAGE_KEY = "kassen_profile_v2";

const Index = () => {
  const config = useWhiteLabel();
  const locale = useLocale();
  const isDemo = new URLSearchParams(window.location.search).get("demo") === "true";
  const { user, loading: authLoading, saveProfile: saveToCloud, loadProfile: loadFromCloud } = useAuth();
  const { data: marketData } = useMarketData();
  const [profile, setProfile] = useState<BudgetProfile | null>(null);
  const [showHome, setShowHome] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<BudgetProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState<BudgetProfile | null>(null);

  // Demo mode: compute budget from demoProfile
  const demoBudget = useMemo<ComputedBudget | null>(
    () => isDemo ? computeBudget(demoProfile, marketData, locale) : null,
    [isDemo, marketData, locale]
  );
  const demoOptimizations = useMemo<OptimizingAction[]>(
    () => (isDemo && demoBudget) ? generateOptimizations(demoProfile, demoBudget, locale) : [],
    [isDemo, demoBudget, locale]
  );

  const budget = useMemo<ComputedBudget | null>(
    () => profile ? computeBudget(profile, marketData, locale) : null,
    [profile, marketData, locale]
  );
  const optimizations = useMemo<OptimizingAction[]>(
    () => (profile && budget) ? generateOptimizations(profile, budget, locale) : [],
    [profile, budget, locale]
  );
  const pendingBudget = useMemo<ComputedBudget | null>(
    () => pendingProfile ? computeBudget(pendingProfile, marketData, locale) : null,
    [pendingProfile, marketData, locale]
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
      if (user) {
        const cloudProfile = await loadFromCloud();
        if (cloudProfile) {
          setProfile(cloudProfile);
          return;
        }
      }
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const validated = parseProfile(JSON.parse(saved));
          if (validated) {
            setProfile(validated);
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
    setEditingProfile(null);
    const health = calculateHealth(pendingProfile, pendingBudget);
    saveSnapshot(pendingBudget, health.score);
    submitPriceObservations(pendingProfile);
    if (user) saveToCloud(pendingProfile);
    setPendingProfile(null);
  };

  const handleProfileChange = (updated: BudgetProfile) => {
    setProfile(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (user) saveToCloud(updated);
  };

  const handleReset = () => {
    if (!window.confirm("Er du sikker? Dette sletter dit nuværende budget og starter forfra.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setEditingProfile(null);
  };

  const handleEditProfile = () => {
    if (!window.confirm("Vil du redigere dine oplysninger? Dine nuværende data bruges som udgangspunkt.")) return;
    // Go back to onboarding with current profile pre-filled
    setEditingProfile(profile);
    setProfile(null);
  };

  // Demo mode: skip onboarding, show dashboard with sample data
  if (isDemo && demoBudget) {
    const noop = () => {};
    return (
      <>
        <DemoBanner brandName={config.brandName} />
        <Dashboard
          profile={demoProfile}
          budget={demoBudget}
          optimizations={demoOptimizations}
          onReset={noop}
          onProfileChange={noop}
          onEditProfile={noop}
        />
      </>
    );
  }

  // Forside — vises når bruger klikker "Hjem" fra dashboard, eller ingen profil
  if (showHome || (showLanding && !profile && !authLoading && !editingProfile)) {
    return (
      <WelcomePage
        onStart={() => { setShowHome(false); setShowLanding(false); }}
        hasExistingProfile={!!profile}
        onGoToApp={() => setShowHome(false)}
      />
    );
  }

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
        onProfileChange={handleProfileChange}
        onEditProfile={handleEditProfile}
        onHome={() => setShowHome(true)}
      />
    );
  }

  return <OnboardingFlow onComplete={handleComplete} initialProfile={editingProfile ?? undefined} />;
};

export default Index;
