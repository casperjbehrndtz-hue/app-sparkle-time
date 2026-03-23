import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";

const WelcomePage = lazy(() => import("@/components/onboarding/WelcomePage").then(m => ({ default: m.WelcomePage })));
const OnboardingFlow = lazy(() => import("@/components/onboarding/OnboardingFlow").then(m => ({ default: m.OnboardingFlow })));
const AIWelcomeInsight = lazy(() => import("@/components/onboarding/AIWelcomeInsight").then(m => ({ default: m.AIWelcomeInsight })));
const Dashboard = lazy(() => import("@/components/dashboard/Dashboard").then(m => ({ default: m.Dashboard })));
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
  // Skip landing if coming from Lonseddel/Pengetjek with prefill data
  const [landingView, setLandingView] = useState<"landing" | "home" | null>(() => {
    if (sessionStorage.getItem("nb_payslip_prefill") || sessionStorage.getItem("nb_pengetjek_prefill")) {
      return null;
    }
    return "landing";
  });
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

  // Pre-fill from payslip and/or pengetjek (sessionStorage handoff)
  // Payslip provides: income, tax context, pension, industry/region
  // Pengetjek provides: actual spending amounts, subscription toggles
  // When both exist, merge with payslip income taking priority
  useEffect(() => {
    try {
      const payslipRaw = sessionStorage.getItem("nb_payslip_prefill");
      const pengetjekRaw = sessionStorage.getItem("nb_pengetjek_prefill");
      if (!payslipRaw && !pengetjekRaw) return;

      if (payslipRaw) sessionStorage.removeItem("nb_payslip_prefill");
      if (pengetjekRaw) sessionStorage.removeItem("nb_pengetjek_prefill");

      const payslipData = payslipRaw ? JSON.parse(payslipRaw) as Partial<BudgetProfile> : {};
      const pengetjekData = pengetjekRaw ? JSON.parse(pengetjekRaw) as Partial<BudgetProfile> : {};

      // Merge: pengetjek spending first, then payslip income/tax on top
      // Payslip income is more accurate (exact netto), pengetjek spending is real
      const partial: Partial<BudgetProfile> = { ...pengetjekData, ...payslipData };

      // But for spending categories, prefer pengetjek (actual data) over payslip (which doesn't have it)
      if (pengetjekData.foodAmount) partial.foodAmount = pengetjekData.foodAmount;
      if (pengetjekData.restaurantAmount) partial.restaurantAmount = pengetjekData.restaurantAmount;
      if (pengetjekData.leisureAmount) partial.leisureAmount = pengetjekData.leisureAmount;
      if (pengetjekData.clothingAmount) partial.clothingAmount = pengetjekData.clothingAmount;
      if (pengetjekData.healthAmount) partial.healthAmount = pengetjekData.healthAmount;

      // Merge subscription toggles (union of both sources)
      if (pengetjekData.hasNetflix) partial.hasNetflix = true;
      if (pengetjekData.hasSpotify) partial.hasSpotify = true;
      if (pengetjekData.hasHBO) partial.hasHBO = true;
      if (pengetjekData.hasViaplay) partial.hasViaplay = true;
      if (pengetjekData.hasDisney) partial.hasDisney = true;
      if (pengetjekData.hasAppleTV) partial.hasAppleTV = true;
      if (pengetjekData.hasAmazonPrime) partial.hasAmazonPrime = true;
      if (pengetjekData.hasFitness) partial.hasFitness = true;

      if (partial.income && partial.income > 0) {
        const defaultProfile: BudgetProfile = {
          householdType: "solo", income: 35000, partnerIncome: 0, additionalIncome: [], postalCode: "",
          housingType: "lejer", hasMortgage: false, rentAmount: 9000, mortgageAmount: 0, propertyValue: 0, interestRate: 4.0,
          hasChildren: false, childrenAges: [],
          hasNetflix: false, hasSpotify: false, hasHBO: false, hasViaplay: false,
          hasAppleTV: false, hasDisney: false, hasAmazonPrime: false,
          hasCar: false, carAmount: 3500, carLoan: 2000, carFuel: 1200, carInsurance: 5500, carTax: 3600, carService: 2500,
          hasInternet: true,
          hasInsurance: false, insuranceAmount: 0,
          hasUnion: false, unionAmount: 500,
          hasFitness: false, fitnessAmount: 349,
          hasPet: false, petAmount: 800,
          hasLoan: false, loanAmount: 1500,
          hasSavings: false, savingsAmount: 3000,
          foodAmount: 4000, leisureAmount: 1500, clothingAmount: 800, healthAmount: 350, restaurantAmount: 800,
          customExpenses: [],
        };
        setEditingProfile({ ...defaultProfile, ...partial });
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
    // Clear any stale onboarding session to prevent conflicts
    try { localStorage.removeItem("nb_onboarding_wip"); } catch {}
    setEditingProfile(profile);
    setProfile(null);
  };

  // Demo mode: skip onboarding, show dashboard with sample data
  if (isDemo && demoBudget) {
    const noop = () => {};
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <DemoBanner brandName={config.brandName} />
        <Dashboard
          profile={demoProfile}
          budget={demoBudget}
          optimizations={demoOptimizations}
          onReset={noop}
          onProfileChange={noop}
          onEditProfile={noop}
        />
      </Suspense>
    );
  }

  // Shared budget preview: read-only dashboard, no localStorage mutation
  if (sharedParam && sharedProfile && sharedBudget) {
    const noop = () => {};
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <SharedBudgetBanner profile={sharedProfile} budget={sharedBudget} meta={sharedMeta} />
        <Dashboard
          profile={sharedProfile}
          budget={sharedBudget}
          optimizations={sharedOptimizations}
          onReset={noop}
          onProfileChange={noop}
          onEditProfile={noop}
        />
      </Suspense>
    );
  }

  // Forside — vises når bruger klikker "Hjem" fra dashboard, eller ingen profil
  if (landingView && (landingView === "home" || (!profile && !editingProfile))) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <WelcomePage
          onStart={() => setLandingView(null)}
          hasExistingProfile={!!profile}
          onGoToApp={() => setLandingView(null)}
        />
      </Suspense>
    );
  }

  if (showWelcome && pendingProfile && pendingBudget) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <AIWelcomeInsight
          profile={pendingProfile}
          budget={pendingBudget}
          onContinue={handleWelcomeContinue}
        />
      </Suspense>
    );
  }

  if (profile && budget) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <Dashboard
          profile={profile}
          budget={budget}
          optimizations={optimizations}
          onReset={handleReset}
          onProfileChange={handleProfileChange}
          onEditProfile={handleEditProfile}
          onHome={() => setLandingView("home")}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <OnboardingFlow onComplete={handleComplete} initialProfile={editingProfile ?? undefined} />
    </Suspense>
  );
};

export default Index;
