import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, FileText, LogIn, LogOut, ChevronDown, Cloud } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { CockpitSection } from "./CockpitSection";
import { OptimeringView } from "./OptimeringView";
import { FremadView } from "./FremadView";
import { InlineChartsSection } from "./InlineChartsSection";
import { AIChatPanel } from "./AIChatPanel";
import { BudgetReport } from "./BudgetReport";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SuiteNav } from "@/components/SuiteNav";
import { AppFooter } from "@/components/AppFooter";
import { calculateHealth, generateSmartSteps } from "@/lib/healthScore";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

// Lazy-load advanced views
import { NaboeffektView } from "./NaboeffektView";
import { HvadHvisView } from "./HvadHvisView";
import { HistorikView } from "./HistorikView";
import { ParSplitView } from "./ParSplitView";
import { StressTestView } from "./StressTestView";
import { AarshjulView } from "./AarshjulView";
import { SubscriptionTracker } from "./SubscriptionTracker";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  optimizations: OptimizingAction[];
  onReset: () => void;
  onProfileChange: (profile: BudgetProfile) => void;
  onEditProfile: () => void;
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
function SectionNav({ sections, activeSection }: { sections: { id: string; label: string; emoji: string }[]; activeSection: string }) {
  return (
    <div className="sticky top-[57px] z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 overflow-x-auto scrollbar-hide">
      <div className="max-w-2xl mx-auto px-5 py-2 flex gap-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeSection === s.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <span>{s.emoji}</span> {s.label}
          </button>
        ))}
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

export function Dashboard({ profile, budget, optimizations, onReset, onProfileChange, onEditProfile }: Props) {
  const config = useWhiteLabel();
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [activeSection, setActiveSection] = useState("cockpit");

  const health = useMemo(() => calculateHealth(profile, budget), [profile, budget]);
  const smartSteps = useMemo(() => generateSmartSteps(profile, budget, health), [profile, budget, health]);

  const sections = [
    { id: "cockpit", label: "Cockpit", emoji: "🎯" },
    { id: "overblik", label: "Overblik", emoji: "📊" },
    { id: "handling", label: "Handling", emoji: "⚡" },
    { id: "fremad", label: "Fremtid", emoji: "📈" },
    { id: "dybde", label: "Dybdegående", emoji: "🔬" },
  ];

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
      sections.forEach((s) => {
        const el = document.getElementById(s.id);
        if (el) observer.observe(el);
      });
    }, 500);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [sections]);

  if (showReport) return <BudgetReport profile={profile} budget={budget} health={health} onBack={() => { setShowReport(false); window.scrollTo(0, 0); }} />;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      <SuiteNav />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <span className="font-display font-black text-lg text-primary">{config.brandName}</span>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <LanguageToggle />
            <DarkModeToggle />
            <button onClick={onEditProfile}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-primary hover:text-primary/80 transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-primary/5 font-semibold">
              <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Ret oplysninger</span>
            </button>
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted">
              <FileText className="w-3 h-3" /> {t("dash.report")}
            </button>
            {user ? (
              <button onClick={signOut}
                className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted">
                <LogOut className="w-3 h-3" /> <span className="hidden sm:inline">Log ud</span>
              </button>
            ) : (
              <Link to="/login"
                className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted font-semibold">
                <LogIn className="w-3 h-3" /> <span className="hidden sm:inline">Log ind</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <SectionNav sections={sections} activeSection={activeSection} />

      {/* Login CTA for unauthenticated users */}
      {!user && (
        <div className="max-w-2xl mx-auto px-5 pt-4">
          <Link to="/login"
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary/5 border border-primary/15 text-sm text-primary hover:bg-primary/10 transition-colors">
            <Cloud className="w-3.5 h-3.5" />
            <span>Log ind for at gemme dit budget på tværs af enheder</span>
          </Link>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-12 flex-1 w-full">

        {/* ━━━ Section 1: COCKPIT — everything at a glance ━━━ */}
        <StorySection id="cockpit" title="Cockpit" subtitle="Dit økonomiske overblik — alt på ét sted.">
          <SectionErrorBoundary fallbackTitle="Cockpit">
            <CockpitSection
              profile={profile}
              budget={budget}
              health={health}
              smartSteps={smartSteps}
              optimizations={optimizations}
              onProfileChange={onProfileChange}
            />
          </SectionErrorBoundary>
        </StorySection>

        {/* ━━━ Section 2: OVERBLIK — visual deep-dive ━━━ */}
        <StorySection id="overblik" title="Overblik" subtitle="Hvor går dine penge hen? Se det hele i ét blik.">
          <SectionErrorBoundary fallbackTitle="Overblik">
            <InlineChartsSection profile={profile} budget={budget} />
          </SectionErrorBoundary>
        </StorySection>

        {/* ━━━ Section 3: HANDLING — what to do ━━━ */}
        <StorySection id="handling" title="Handling" subtitle="Konkrete besparelsesforslag baseret på dine tal.">
          <SectionErrorBoundary fallbackTitle="Handling">
            <OptimeringView profile={profile} budget={budget} optimizations={optimizations} />
          </SectionErrorBoundary>
        </StorySection>

        {/* ━━━ Section 4: FREMTID — projections ━━━ */}
        <StorySection id="fremad" title="Fremtid" subtitle="Se frem — formue, mål og tidslinje.">
          <SectionErrorBoundary fallbackTitle="Fremtid">
            <FremadView profile={profile} budget={budget} health={health} />
          </SectionErrorBoundary>
        </StorySection>

        {/* ━━━ Section 5: DYBDEGÅENDE — collapsible advanced ━━━ */}
        <section id="dybde" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="font-display font-black text-xl sm:text-2xl text-foreground">Dybdegående</h2>
            <p className="text-sm text-muted-foreground mt-1">Avancerede analyser og simulationer.</p>
          </div>

          <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
            <AdvancedSection id="hvadvis-inner" title="Hvad hvis?" emoji="🔮">
              <HvadHvisView profile={profile} budget={budget} health={health} />
            </AdvancedSection>

            <AdvancedSection id="stresstest-inner" title="Stress-test" emoji="🔬">
              <StressTestView profile={profile} budget={budget} />
            </AdvancedSection>

            <AdvancedSection id="aarshjul-inner" title="Årshjul" emoji="📅">
              <AarshjulView profile={profile} budget={budget} />
            </AdvancedSection>

            <AdvancedSection id="abonnementer-inner" title="Abonnementer" emoji="💳">
              <SubscriptionTracker profile={profile} />
            </AdvancedSection>

            <AdvancedSection id="naboeffekt-inner" title="Sammenlign" emoji="👥">
              <NaboeffektView profile={profile} budget={budget} />
            </AdvancedSection>

            <AdvancedSection id="historik-inner" title="Historik" emoji="📊">
              <HistorikView />
            </AdvancedSection>

            {profile.householdType === "par" && (
              <AdvancedSection id="parsplit-inner" title="Par-fordeling" emoji="💑">
                <ParSplitView profile={profile} budget={budget} />
              </AdvancedSection>
            )}
          </div>
        </section>
      </main>

      <AppFooter />
      <AIChatPanel profile={profile} budget={budget} />
    </div>
  );
}
