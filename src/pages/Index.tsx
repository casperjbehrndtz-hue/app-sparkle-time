import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
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
import { decodeProfile, resolveShortLink, type ShareMeta } from "@/lib/budgetShare";
import { SharedBudgetBanner } from "@/components/SharedBudgetBanner";
import { useI18n } from "@/lib/i18n";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

const STORAGE_KEY = "nb_profile_v2";

const Index = () => {
  const config = useWhiteLabel();
  const locale = useLocale();
  const { t } = useI18n();
  const { shareId } = useParams<{ shareId?: string }>();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isDemo = searchParams.get("demo") === "true";
  const sharedParam = searchParams.get("b");
  const { user, loading: authLoading, saveProfile: saveToCloud, loadProfile: loadFromCloud } = useAuth();
  const { data: marketData } = useMarketData();
  const [profile, setProfile] = useState<BudgetProfile | null>(() => {
    // Sync init from localStorage so returning users skip WelcomePage immediately
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return parseProfile(JSON.parse(saved));
    } catch {}
    return null;
  });
  // "landing" = first visit, "home" = navigated from dashboard, null = app flow
  const [landingView, setLandingView] = useState<"landing" | "home" | null>("landing");
  const [showWelcome, setShowWelcome] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<BudgetProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState<BudgetProfile | null>(null);
  const [sharedProfile, setSharedProfile] = useState<BudgetProfile | null>(null);
  const [sharedMeta, setSharedMeta] = useState<ShareMeta>({});

  // Decode shared budget from URL param (?b=...) or short link (/s/:shareId)
  useEffect(() => {
    if (sharedParam) {
      decodeProfile(sharedParam).then((result) => {
        if (result) {
          setSharedProfile(result.profile);
          setSharedMeta(result.meta);
        }
      });
    } else if (shareId) {
      resolveShortLink(shareId).then((payload) => {
        if (!payload) return;
        decodeProfile(payload).then((result) => {
          if (result) {
            setSharedProfile(result.profile);
            setSharedMeta(result.meta);
          }
        });
      });
    }
  }, [sharedParam, shareId]);

  // Pre-fill from payslip upload (sessionStorage handoff from /lonseddel)
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem("nb_payslip_prefill");
      if (!prefill) return;
      sessionStorage.removeItem("nb_payslip_prefill");
      const partial = JSON.parse(prefill) as Partial<BudgetProfile>;
      if (partial.income && partial.income > 0) {
        setEditingProfile(partial as BudgetProfile);
        setLandingView(null);
      }
    } catch {}
  }, []);

  const sharedBudget = useMemo<ComputedBudget | null>(
    () => sharedProfile ? computeBudget(sharedProfile, marketData, locale) : null,
    [sharedProfile, marketData, locale]
  );
  const sharedOptimizations = useMemo<OptimizingAction[]>(
    () => (sharedProfile && sharedBudget) ? generateOptimizations(sharedProfile, sharedBudget, locale) : [],
    [sharedProfile, sharedBudget, locale]
  );

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
    root.style.setProperty("--nemt-green", config.theme.primary);
    if (config.theme.accent) root.style.setProperty("--accent", config.theme.accent);
    if (config.displayFont) root.style.setProperty("--font-display", config.displayFont);
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--nemt-green");
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
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setEditingProfile(null);
  };

  const handleEditProfile = () => {
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

  // Shared budget preview: read-only dashboard, no localStorage mutation
  if (sharedParam && sharedProfile && sharedBudget) {
    const noop = () => {};
    return (
      <>
        <SharedBudgetBanner profile={sharedProfile} budget={sharedBudget} meta={sharedMeta} />
        <Dashboard
          profile={sharedProfile}
          budget={sharedBudget}
          optimizations={sharedOptimizations}
          onReset={noop}
          onProfileChange={noop}
          onEditProfile={noop}
        />
      </>
    );
  }

  // Forside — vises når bruger klikker "Hjem" fra dashboard, eller ingen profil
  if (landingView && (landingView === "home" || (!profile && !editingProfile))) {
    return (
      <WelcomePage
        onStart={() => setLandingView(null)}
        hasExistingProfile={!!profile}
        onGoToApp={() => setLandingView(null)}
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
        onHome={() => setLandingView("home")}
      />
    );
  }

  return <OnboardingFlow onComplete={handleComplete} initialProfile={editingProfile ?? undefined} />;
};

export default Index;
