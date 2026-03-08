import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RotateCcw, FileText, BarChart3, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { DisposableIncome } from "./DisposableIncome";
import { NuView } from "./NuView";
import { OptimeringView } from "./OptimeringView";
import { FremadView } from "./FremadView";
import { NaboeffektView } from "./NaboeffektView";
import { HvadHvisView } from "./HvadHvisView";
import { HistorikView } from "./HistorikView";
import { ParSplitView } from "./ParSplitView";
import { StressTestView } from "./StressTestView";
import { AarshjulView } from "./AarshjulView";
import { AIChatPanel } from "./AIChatPanel";
import { BudgetReport } from "./BudgetReport";
import { ChartsView } from "./ChartsView";
import { ShareCard } from "./ShareCard";
import { MoneyFlowHero } from "./MoneyFlowHero";
import { ConfettiEffect } from "./ConfettiEffect";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SuiteNav } from "@/components/SuiteNav";
import { AppFooter } from "@/components/AppFooter";
import { calculateHealth, generateSmartSteps } from "@/lib/healthScore";
import { SubscriptionTracker } from "./SubscriptionTracker";
import type { BudgetProfile, ComputedBudget, OptimizingAction } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  optimizations: OptimizingAction[];
  onReset: () => void;
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

// ─── Section nav pill ─────────────────────────────────────
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

export function Dashboard({ profile, budget, optimizations, onReset }: Props) {
  const config = useWhiteLabel();
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [activeSection, setActiveSection] = useState("cockpit");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Memoize expensive calculations
  const health = useMemo(() => calculateHealth(profile, budget), [profile, budget]);
  const smartSteps = useMemo(() => generateSmartSteps(profile, budget, health), [profile, budget, health]);

  // Trigger confetti for great health scores
  useEffect(() => {
    if (health.score >= 75) {
      const timer = setTimeout(() => setConfettiTriggered(true), 800);
      return () => clearTimeout(timer);
    }
  }, [health.score]);

  const sections = useMemo(() => {
    const baseSections = [
      { id: "cockpit", label: t("tab.cockpit"), emoji: "🎯" },
      { id: "fremad", label: t("tab.forward"), emoji: "📈" },
      { id: "hvadvis", label: t("tab.whatIf"), emoji: "🔮" },
      { id: "stresstest", label: t("tab.stressTest"), emoji: "🔬" },
      { id: "aarshjul", label: t("tab.calendar"), emoji: "📅" },
      { id: "optimering", label: t("tab.optimize"), emoji: "⚡" },
      { id: "naboeffekt", label: t("tab.compare"), emoji: "👥" },
      { id: "historik", label: t("tab.history"), emoji: "📊" },
    ];
    return profile.householdType === "par"
      ? [...baseSections, { id: "parsplit", label: t("tab.coupleSplit"), emoji: "💑" }]
      : baseSections;
  }, [profile.householdType, t]);

  // Track active section via IntersectionObserver (fixed deps)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
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

  if (showReport) {
    return <BudgetReport profile={profile} budget={budget} health={health} onBack={() => setShowReport(false)} />;
  }

  if (showCharts) {
    return <ChartsView profile={profile} budget={budget} onBack={() => setShowCharts(false)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ConfettiEffect trigger={confettiTriggered} />
      <SuiteNav />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <span className="font-display font-black text-lg text-primary">{config.brandName}</span>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <LanguageToggle />
            <DarkModeToggle />
            <button onClick={() => setShowCharts(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted">
              <BarChart3 className="w-3 h-3" /> <span className="hidden sm:inline">{t("dash.charts")}</span><span className="sm:hidden">{t("dash.chartsShort")}</span>
            </button>
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted">
              <FileText className="w-3 h-3" /> {t("dash.report")}
            </button>
            <button onClick={onReset}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted">
              <RotateCcw className="w-3 h-3" /> <span className="hidden sm:inline">{t("dash.newCalc")}</span><span className="sm:hidden">{t("dash.resetShort")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Section nav */}
      <SectionNav sections={sections} activeSection={activeSection} />

      <main ref={scrollRef} className="max-w-2xl mx-auto px-5 py-6 space-y-16 flex-1 w-full">
        {/* Hero health score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DisposableIncome health={health} />
        </motion.div>

        {/* Scroll-based story sections with error boundaries */}
        <StorySection id="cockpit" title={t("tab.cockpit")} subtitle="Dit økonomiske overblik lige nu">
          <SectionErrorBoundary fallbackTitle="Cockpit">
            <div className="space-y-6">
              <MoneyFlowHero budget={budget} />
              <NuView budget={budget} profile={profile} health={health} smartSteps={smartSteps} />
            </div>
          </SectionErrorBoundary>
        </StorySection>

        <StorySection id="fremad" title={t("tab.forward")} subtitle="Se frem — formue, mål og tidslinje">
          <SectionErrorBoundary fallbackTitle="Fremad">
            <FremadView profile={profile} budget={budget} health={health} />
          </SectionErrorBoundary>
        </StorySection>

        <StorySection id="hvadvis" title={t("tab.whatIf")} subtitle="Simulér livsbegivenheder og se effekten">
          <SectionErrorBoundary fallbackTitle="Hvad hvis">
            <HvadHvisView profile={profile} budget={budget} health={health} />
          </SectionErrorBoundary>
        </StorySection>

        <StorySection id="stresstest" title={t("tab.stressTest")} subtitle="Hvor modstandsdygtig er din økonomi?">
          <SectionErrorBoundary fallbackTitle="Stress-test">
            <StressTestView profile={profile} budget={budget} />
          </SectionErrorBoundary>
        </StorySection>

        <StorySection id="aarshjul" title={t("tab.calendar")} subtitle="Årlige udgifter du skal forberede dig på">
          <SectionErrorBoundary fallbackTitle="Årshjul">
            <AarshjulView profile={profile} budget={budget} />
          </SectionErrorBoundary>
        </StorySection>

        <StorySection id="optimering" title={t("tab.optimize")} subtitle="Konkrete besparelsesforslag baseret på dine tal">
          <SectionErrorBoundary fallbackTitle="Optimering">
            <OptimeringView profile={profile} budget={budget} optimizations={optimizations} />
          </SectionErrorBoundary>
        </StorySection>

        <StorySection id="naboeffekt" title={t("tab.compare")} subtitle="Sammenlign med lignende husstande i dit område">
          <SectionErrorBoundary fallbackTitle="Naboeffekt">
            <NaboeffektView profile={profile} budget={budget} />
          </SectionErrorBoundary>
        </StorySection>

        <StorySection id="historik" title={t("tab.history")} subtitle="Se udviklingen over tid">
          <SectionErrorBoundary fallbackTitle="Historik">
            <HistorikView />
          </SectionErrorBoundary>
        </StorySection>

        {profile.householdType === "par" && (
          <StorySection id="parsplit" title={t("tab.coupleSplit")} subtitle="Fordeling af fælles udgifter">
            <SectionErrorBoundary fallbackTitle="Parsplit">
              <ParSplitView profile={profile} budget={budget} />
            </SectionErrorBoundary>
          </StorySection>
        )}

        {/* Share Card */}
        {showShareCard && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{t("dash.shareResult")}</h3>
              <button onClick={() => setShowShareCard(false)} className="text-xs text-muted-foreground hover:text-foreground">{t("dash.close")}</button>
            </div>
            <ShareCard health={health} totalIncome={budget.totalIncome} totalExpenses={budget.totalExpenses} />
          </motion.div>
        )}
      </main>

      <AppFooter />
      <AIChatPanel profile={profile} budget={budget} />
    </div>
  );
}
