import { useState, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, FileText, LogIn, LogOut, ChevronDown, Cloud, RotateCcw, Gauge, BarChart3, Zap, TrendingUp, Microscope, ArrowUp } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShareBudgetDialog } from "./ShareBudgetDialog";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { usePartnerTracking } from "@/hooks/usePartnerTracking";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { CockpitSection } from "./CockpitSection";
import { OptimeringView } from "./OptimeringView";
import { FremadView } from "./FremadView";
import { InlineChartsSection } from "./InlineChartsSection";
import { AIChatPanel } from "./AIChatPanel";
import { GuidedSavingSession } from "./GuidedSavingSession";
import { ProfileEditSheet } from "./ProfileEditSheet";
import { BudgetReport } from "./BudgetReport";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";

import { AppFooter } from "@/components/AppFooter";
import { calculateHealth, generateSmartSteps } from "@/lib/healthScore";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

// Lazy-load advanced views (only rendered on click inside collapsible sections)
const NaboeffektView = lazy(() => import("./NaboeffektView").then(m => ({ default: m.NaboeffektView })));
const HvadHvisView = lazy(() => import("./HvadHvisView").then(m => ({ default: m.HvadHvisView })));
const HistorikView = lazy(() => import("./HistorikView").then(m => ({ default: m.HistorikView })));
const ParSplitView = lazy(() => import("./ParSplitView").then(m => ({ default: m.ParSplitView })));
const StressTestView = lazy(() => import("./StressTestView").then(m => ({ default: m.StressTestView })));
const AarshjulView = lazy(() => import("./AarshjulView").then(m => ({ default: m.AarshjulView })));
const SubscriptionTracker = lazy(() => import("./SubscriptionTracker").then(m => ({ default: m.SubscriptionTracker })));

// Skeleton fallback for lazy-loaded sections
function LazyFallback() {
  return (
    <div className="animate-pulse space-y-3 py-4">
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-32 bg-muted rounded-xl" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  );
}

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  optimizations: OptimizingAction[];
  onReset: () => void;
  onProfileChange: (profile: BudgetProfile) => void;
  onEditProfile: () => void;
  onHome?: () => void;
}

// ─── Scroll section wrapper ──────────────────────────────
function StorySection({ id, title, subtitle, children, delay = 0 }: {
  id: string; title: string; subtitle?: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className="scroll-mt-20"
    >
      <div className="mb-5">
        <h2 className="font-display font-black text-xl sm:text-2xl text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </motion.section>
  );
}

// ─── Section nav ─────────────────────────────────────
function SectionNav({ sections, activeSection, ariaLabel }: { sections: { id: string; label: string; icon: React.ReactNode }[]; activeSection: string; ariaLabel: string }) {
  return (
    <div className="sticky top-[57px] z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="relative">
        {/* Fade-out gradients to hint at overflow */}
        <div className="pointer-events-none absolute left-0 inset-y-0 w-6 bg-gradient-to-r from-background/80 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 inset-y-0 w-6 bg-gradient-to-l from-background/80 to-transparent z-10" />
        <div
          className="max-w-2xl mx-auto px-5 py-2 flex gap-1 overflow-x-auto scrollbar-hide"
          role="navigation"
          aria-label={ariaLabel}
        >
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              aria-current={activeSection === s.id ? "true" : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeSection === s.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span aria-hidden="true">{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Collapsible advanced section ────────────────────
function AdvancedSection({ id, title, emoji, children }: { id: string; title: string; emoji: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div id={id} className="scroll-mt-20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <span className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors">{title}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6">
              <SectionErrorBoundary fallbackTitle={title}>
                {children}
              </SectionErrorBoundary>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Dashboard({ profile, budget, optimizations, onReset, onProfileChange, onEditProfile, onHome }: Props) {
  const config = useWhiteLabel();
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const { track } = usePartnerTracking(config.brandKey ?? "nemtbudget");
  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "true";
  const [showReport, setShowReport] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showGuidedSession, setShowGuidedSession] = useState(false);
  const [activeSection, setActiveSection] = useState("cockpit");
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Track scroll position for back-to-top button
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track dashboard view for B2B partners
  useEffect(() => { track("dashboard_view"); }, []);

  const health = useMemo(() => calculateHealth(profile, budget), [profile, budget]);
  const smartSteps = useMemo(() => generateSmartSteps(profile, budget, health), [profile, budget, health]);

  const sections = useMemo(() => [
    { id: "cockpit", label: t("nav.cockpit"), icon: <Gauge className="w-3.5 h-3.5" /> },
    { id: "overblik", label: t("nav.overview"), icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "handling", label: t("nav.action"), icon: <Zap className="w-3.5 h-3.5" /> },
    { id: "fremad", label: t("nav.future"), icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "dybde", label: t("nav.advanced"), icon: <Microscope className="w-3.5 h-3.5" /> },
  ], [t]);

  const sectionIds = ["cockpit", "overblik", "handling", "fremad", "dybde"];

  // Track active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0.1 }
    );
    const timer = setTimeout(() => {
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 500);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, []);

  if (showReport) return <BudgetReport profile={profile} budget={budget} health={health} onBack={() => { setShowReport(false); window.scrollTo(0, 0); }} />;

  return (
    <div id="main-content" className="min-h-screen bg-background flex flex-col pb-safe">
      <h1 className="sr-only">{t("dash.title")}</h1>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <button onClick={onHome} className="font-display font-black text-lg text-primary hover:text-primary/70 transition-colors bg-transparent border-none cursor-pointer p-0">{config.brandName}</button>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <LanguageToggle />
            <DarkModeToggle />
            <button onClick={() => setShowEditSheet(true)}
              className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-primary/5 font-semibold min-w-[44px] min-h-[44px]">
              <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">{t("dash.editInfo")}</span>
            </button>
            <ShareBudgetDialog profile={profile} budget={budget} />
            <button onClick={() => setShowReport(true)}
              className="flex items-center justify-center gap-1 sm:gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted min-w-[44px] min-h-[44px]">
              <FileText className="w-3 h-3" /> {t("dash.report")}
            </button>
            <button onClick={() => setConfirmAction({ title: t("confirm.resetBudget"), description: t("confirm.resetBudget"), onConfirm: onReset })}
              title={t("dash.startOver")}
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-destructive/5 min-w-[44px] min-h-[44px]">
              <RotateCcw className="w-3 h-3" /> <span className="hidden sm:inline">{t("dash.reset")}</span>
            </button>
            {user ? (
              <button onClick={signOut}
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted min-w-[44px] min-h-[44px]">
                <LogOut className="w-3 h-3" /> <span className="hidden sm:inline">{t("dash.logOut")}</span>
              </button>
            ) : (
              <Link to="/login"
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted font-semibold min-w-[44px] min-h-[44px]">
                <LogIn className="w-3 h-3" /> <span className="hidden sm:inline">{t("dash.logIn")}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <SectionNav sections={sections} activeSection={activeSection} ariaLabel={t("dash.sectionTabs")} />

      {/* Financial disclaimer */}
      <div className="max-w-2xl mx-auto px-5 pt-3">
        <p className="text-[10px] text-muted-foreground/60 text-center">
          {t("dash.disclaimer")}{" "}
          <Link to="/vilkaar" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">{t("dash.termsLink")}</Link>
        </p>
      </div>

      {/* Login CTA for unauthenticated users */}
      {!user && (
        <div className="max-w-2xl mx-auto px-5 pt-4">
          <Link to="/login"
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary/5 border border-primary/15 text-sm text-primary hover:bg-primary/10 transition-colors">
            <Cloud className="w-3.5 h-3.5" />
            <span>{t("dash.cloudSync")}</span>
          </Link>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-12 flex-1 w-full">

        {/* ━━━ Section 1: COCKPIT — everything at a glance ━━━ */}
        <StorySection id="cockpit" title={t("section.cockpit")} subtitle={t("section.cockpitSub")}>
          <SectionErrorBoundary fallbackTitle="Cockpit">
            <CockpitSection
              profile={profile}
              budget={budget}
              health={health}
              smartSteps={smartSteps}
              optimizations={optimizations}
              onProfileChange={onProfileChange}
            />
            {/* ── Guided session entry ── */}
            <button
              onClick={() => setShowGuidedSession(true)}
              className="w-full mt-2 py-3.5 rounded-2xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all flex items-center justify-center gap-2.5 group"
            >
              <span className="text-lg">✨</span>
              <div className="text-left">
                <p className="text-sm font-bold text-primary">{t("dash.aiTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("dash.aiSubtitle")}</p>
              </div>
              <span className="ml-auto text-primary/50 group-hover:text-primary transition-colors text-lg">→</span>
            </button>
          </SectionErrorBoundary>
        </StorySection>

        {/* ━━━ Section 2: OVERBLIK — visual deep-dive ━━━ */}
        <StorySection id="overblik" title={t("section.overview")} subtitle={t("section.overviewSub")}>
          <SectionErrorBoundary fallbackTitle="Overblik">
            <InlineChartsSection profile={profile} budget={budget} />
          </SectionErrorBoundary>
        </StorySection>

        {/* ━━━ Section 3: HANDLING — what to do ━━━ */}
        <StorySection id="handling" title={t("section.action")} subtitle={t("section.actionSub")}>
          <SectionErrorBoundary fallbackTitle="Handling">
            <OptimeringView profile={profile} budget={budget} optimizations={optimizations} />
          </SectionErrorBoundary>
        </StorySection>

        {/* ━━━ Section 4: FREMTID — projections ━━━ */}
        <StorySection id="fremad" title={t("section.future")} subtitle={t("section.futureSub")}>
          <SectionErrorBoundary fallbackTitle="Fremtid">
            <FremadView profile={profile} budget={budget} health={health} />
          </SectionErrorBoundary>
        </StorySection>

        {/* ━━━ Section 5: DYBDEGÅENDE — collapsible advanced ━━━ */}
        <section id="dybde" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="font-display font-black text-xl sm:text-2xl text-foreground">{t("section.advanced")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("section.advancedSub")}</p>
          </div>

          <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
            <AdvancedSection id="hvadvis-inner" title={t("tab.whatIf") + "?"} emoji="🔮">
              <Suspense fallback={<LazyFallback />}>
                <HvadHvisView profile={profile} budget={budget} health={health} />
              </Suspense>
            </AdvancedSection>

            <AdvancedSection id="stresstest-inner" title={t("tab.stressTest")} emoji="🔬">
              <Suspense fallback={<LazyFallback />}>
                <StressTestView profile={profile} budget={budget} />
              </Suspense>
            </AdvancedSection>

            <AdvancedSection id="aarshjul-inner" title={t("tab.calendar")} emoji="📅">
              <Suspense fallback={<LazyFallback />}>
                <AarshjulView profile={profile} budget={budget} />
              </Suspense>
            </AdvancedSection>

            <AdvancedSection id="abonnementer-inner" title={t("dash.subscriptions")} emoji="💳">
              <Suspense fallback={<LazyFallback />}>
                <SubscriptionTracker profile={profile} />
              </Suspense>
            </AdvancedSection>

            <AdvancedSection id="naboeffekt-inner" title={t("tab.compare")} emoji="👥">
              <Suspense fallback={<LazyFallback />}>
                <NaboeffektView profile={profile} budget={budget} />
              </Suspense>
            </AdvancedSection>

            <AdvancedSection id="historik-inner" title={t("tab.history")} emoji="📊">
              <Suspense fallback={<LazyFallback />}>
                <HistorikView />
              </Suspense>
            </AdvancedSection>

            {profile.householdType === "par" && (
              <AdvancedSection id="parsplit-inner" title={t("tab.coupleSplit")} emoji="💑">
                <Suspense fallback={<LazyFallback />}>
                  <ParSplitView profile={profile} budget={budget} />
                </Suspense>
              </AdvancedSection>
            )}
          </div>
        </section>
      </main>

      {!isEmbed && <AppFooter />}
      <AIChatPanel profile={profile} budget={budget} />
      <ProfileEditSheet
        open={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        profile={profile}
        onSave={onProfileChange}
      />
      <AnimatePresence>
        {showGuidedSession && (
          <GuidedSavingSession
            profile={profile}
            budget={budget}
            onClose={() => setShowGuidedSession(false)}
            onProfileChange={onProfileChange}
          />
        )}
      </AnimatePresence>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>Annullér</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null); }}>Bekræft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Back to top button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 left-6 z-50 p-2.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors shadow-md"
            aria-label="Tilbage til toppen"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
