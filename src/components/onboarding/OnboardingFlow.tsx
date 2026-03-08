import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, Plus, X, Check, ArrowRight, ArrowDown, Shield, Clock, Sparkles, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { computeBudget, formatKr } from "@/lib/budgetCalculator";
import { AILiveComment } from "./AILiveComment";
import heroCouple from "@/assets/hero-couple.jpg";
import featureAdvisor from "@/assets/feature-advisor.jpg";
import featureFamily from "@/assets/feature-family.jpg";
import {
  SUBSCRIPTIONS,
  FOOD,
  TRANSPORT,
  INSURANCE,
  UNION,
  FITNESS,
  getMortgageEstimate,
  getRentEstimate,
  getAndelEstimate,
  getPostalName,
  getEstimateSource,
  getPropertyValueEstimate,
} from "@/data/priceDatabase";
import type { BudgetProfile, OnboardingStep, CustomExpense, IncomeSource, PaymentFrequency } from "@/lib/types";
import { frequencyToMonthly, frequencyLabel } from "@/lib/types";

interface Props {
  onComplete: (profile: BudgetProfile) => void;
}

const STEPS: OnboardingStep[] = ["welcome", "household", "income", "housing", "children", "expenses", "review"];
function getStepIndex(step: OnboardingStep) { return STEPS.indexOf(step); }

const defaultProfile: BudgetProfile = {
  householdType: "solo", income: 30000, partnerIncome: 0, additionalIncome: [], postalCode: "",
  housingType: "lejer", hasMortgage: false, rentAmount: 8500, mortgageAmount: 0, propertyValue: 0, interestRate: 4.0,
  hasChildren: false, childrenAges: [],
  hasNetflix: false, hasSpotify: false, hasHBO: false, hasViaplay: false,
  hasAppleTV: false, hasDisney: false, hasAmazonPrime: false,
  hasCar: false, carAmount: TRANSPORT.car.price, carLoan: 2500, carFuel: 1500, carInsurance: 6000, carTax: 3600, carService: 4500,
  hasInternet: true,
  hasInsurance: false, insuranceAmount: INSURANCE.solo.price,
  hasUnion: false, unionAmount: UNION.default.price,
  hasFitness: false, fitnessAmount: FITNESS.default.price,
  hasPet: false, petAmount: 800,
  hasLoan: false, loanAmount: 1500,
  hasSavings: false, savingsAmount: 3000,
  foodAmount: 3500, leisureAmount: 1500, clothingAmount: 800, healthAmount: 350, restaurantAmount: 800,
  customExpenses: [],
};

// ─── Cinematic transitions ────────────────────────────────
const pageVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? 60 : -60,
    scale: 0.96,
    filter: "blur(4px)",
  }),
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? -40 : 40,
    scale: 0.98,
    filter: "blur(2px)",
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Live Budget Bar ──────────────────────────────────────
function LiveBudgetBar({ income, expenses, step }: { income: number; expenses: number; step: OnboardingStep }) {
  const idx = getStepIndex(step);
  if (idx < 2) return null;

  const remaining = income - expenses;
  const pct = income > 0 ? Math.max(0, Math.min(100, (remaining / income) * 100)) : 0;
  const expPct = income > 0 ? Math.min(100, (expenses / income) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border px-5 py-3 safe-area-bottom"
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Til overs</span>
            <motion.span
              key={remaining}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-display font-black text-lg ${remaining > 5000 ? "text-primary" : remaining > 0 ? "text-kassen-gold" : "text-destructive"}`}
            >
              {formatKr(remaining)} kr.
            </motion.span>
          </div>
          <span className="text-[10px] text-muted-foreground">{Math.round(pct)}% af indkomst</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden flex">
          <motion.div
            className="h-full bg-destructive/60 rounded-l-full"
            animate={{ width: `${expPct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className={`h-full rounded-r-full ${remaining > 5000 ? "bg-primary" : remaining > 0 ? "bg-kassen-gold" : "bg-destructive"}`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Step number indicator ────────────────────────────────
function StepIndicator({ step }: { step: OnboardingStep }) {
  const idx = getStepIndex(step);
  if (idx <= 0) return null;
  const total = STEPS.length - 1; // exclude welcome

  return (
    <div className="flex items-center gap-2">
      {STEPS.slice(1).map((s, i) => (
        <motion.div
          key={s}
          className={`h-1 rounded-full transition-colors duration-300 ${
            i < idx ? "bg-primary" : i === idx ? "bg-primary" : "bg-border"
          }`}
          animate={{ width: i === idx ? 24 : i < idx ? 16 : 8 }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}

// ─── Cinematic option card ────────────────────────────────
function BigChoice({ active, onClick, icon, label, sub }: {
  active: boolean; onClick: () => void; icon: string; label: string; sub?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-6 sm:p-8 rounded-2xl border-2 text-center transition-all duration-300 ${
        active
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border hover:border-primary/30 hover:shadow-md"
      }`}
    >
      <motion.div
        animate={{ scale: active ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="text-5xl sm:text-6xl mb-3"
      >
        {icon}
      </motion.div>
      <div className="font-display font-bold text-lg sm:text-xl">{label}</div>
      {sub && <div className="text-sm text-muted-foreground mt-1">{sub}</div>}
      {active && (
        <motion.div
          layoutId="bigcheck"
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Check className="w-4 h-4 text-primary-foreground" />
        </motion.div>
      )}
    </motion.button>
  );
}

// ─── Cinematic slider with big number ─────────────────────
function BigSlider({ value, onChange, label, min = 0, max = 100000, step = 500, suffix = "kr." }: {
  value: number; onChange: (v: number) => void; label: string; min?: number; max?: number; step?: number; suffix?: string;
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  
  useEffect(() => { setLocalValue(String(value)); }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    const num = Number(raw);
    if (!isNaN(num) && raw !== "") onChange(Math.max(min, Math.min(max, num)));
  };

  const handleBlur = () => {
    const num = Number(localValue);
    if (isNaN(num) || localValue === "") { setLocalValue(String(value)); }
    else { const clamped = Math.max(min, Math.min(max, num)); onChange(clamped); setLocalValue(String(clamped)); }
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="flex items-baseline justify-center gap-2">
        <input
          type="number"
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="bg-transparent font-display font-black text-4xl sm:text-5xl text-center focus:outline-none no-spin w-48 sm:w-56 text-foreground"
        />
        <span className="text-lg text-muted-foreground font-display">{suffix}</span>
      </div>
      <Slider
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{formatKr(min)} {suffix}</span>
        <span>{formatKr(max)} {suffix}</span>
      </div>
    </div>
  );
}

// ─── Toggle row (kept but polished) ───────────────────────
function ToggleRow({ active, onClick, icon, label, sublabel, amount, onAmountChange }: {
  active: boolean; onClick: () => void; icon: string; label: string; sublabel?: string;
  amount?: number; onAmountChange?: (v: number) => void;
}) {
  return (
    <div className={`rounded-2xl border-2 transition-all duration-200 ${active ? "border-primary/40 bg-primary/[0.03] shadow-sm" : "border-border hover:border-border"}`}>
      <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-[14px] block">{label}</span>
          {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        </div>
        <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
          active ? "border-primary bg-primary" : "border-muted-foreground/25"
        }`}>
          {active && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
        </div>
      </button>
      {active && onAmountChange && amount !== undefined && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
            <input type="number" value={amount} onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
              className="flex-1 bg-transparent text-sm font-semibold focus:outline-none no-spin w-20" />
            <span className="text-xs text-muted-foreground">kr./md.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Continue button (cinematic) ──────────────────────────
function ContinueButton({ onClick, disabled, label = "Fortsæt" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-8 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
    >
      {label} <ArrowRight className="w-4 h-4" />
    </motion.button>
  );
}

// ─── Main ──────────────────────────────────────────────────

export function OnboardingFlow({ onComplete }: Props) {
  const config = useWhiteLabel();
  const { t, lang } = useI18n();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [direction, setDirection] = useState(1);
  const [profile, setProfile] = useState<BudgetProfile>(defaultProfile);
  const [childAgeInputs, setChildAgeInputs] = useState<number[]>([3]);
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState(0);
  const [customFreq, setCustomFreq] = useState<PaymentFrequency>("monthly");
  const contentRef = useRef<HTMLDivElement>(null);

  const isPar = profile.householdType === "par";
  const update = useCallback((partial: Partial<BudgetProfile>) => {
    setProfile((p) => ({ ...p, ...partial }));
  }, []);

  // Compute live budget
  const liveBudget = getStepIndex(step) >= 2 ? computeBudget(profile) : null;

  const goNext = () => {
    setDirection(1);
    const idx = getStepIndex(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => {
    setDirection(-1);
    const idx = getStepIndex(step);
    if (idx > 1) setStep(STEPS[idx - 1]);
  };

  // ─── WELCOME ─────────────────────────────
  if (step === "welcome") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Nav */}
        <nav className="bg-hero-navy px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
            <span className="font-display font-black text-lg sm:text-xl text-white">{config.brandName}</span>
            <div className="flex items-center gap-3 sm:gap-6">
              <button onClick={() => document.getElementById('produkter')?.scrollIntoView({ behavior: 'smooth' })} className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors cursor-pointer bg-transparent border-none">{t("nav.products")}</button>
              <button onClick={() => document.getElementById('saadan-virker-det')?.scrollIntoView({ behavior: 'smooth' })} className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors cursor-pointer bg-transparent border-none">{t("nav.howItWorks")}</button>
              <LanguageToggle />
              <button onClick={() => { setDirection(1); setStep("household"); }}
                className="px-4 sm:px-5 py-2 rounded-lg bg-white text-hero-navy text-sm font-semibold hover:bg-white/90 transition-colors">
                {t("hero.cta")}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="bg-hero-navy">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <h1 className="font-display font-black text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.1] tracking-tight text-white mb-4 sm:mb-5">
                {t("hero.title")}<br />
                <span className="text-white">{t("hero.titleHighlight")}</span>
              </h1>
              <p className="text-white/60 text-sm sm:text-base md:text-lg leading-relaxed mb-6 sm:mb-8 max-w-md">{t("hero.subtitle")}</p>
              <button onClick={() => { setDirection(1); setStep("household"); }}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-hero-navy text-sm font-bold hover:bg-white/90 transition-all shadow-lg shadow-black/20">
                {t("hero.cta")} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="hidden md:block">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
                <img src={heroCouple} alt={t("hero.imageAlt")} className="w-full h-full object-cover" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trust badges */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="border-b border-border bg-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-10">
            {[
              { icon: <Shield className="w-4 h-4 text-muted-foreground" />, text: t("trust.danish") },
              { icon: <Clock className="w-4 h-4 text-muted-foreground" />, text: t("trust.time") },
              { icon: <Sparkles className="w-4 h-4 text-muted-foreground" />, text: t("trust.private") },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-2 text-sm text-muted-foreground">{b.icon}<span>{b.text}</span></div>
            ))}
          </div>
        </motion.div>

        {/* How it works */}
        <section id="saadan-virker-det" className="bg-background py-10 sm:py-16 scroll-mt-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-foreground mb-3">{t("howItWorks.title")}</h2>
            <p className="text-muted-foreground text-base mb-12 max-w-md mx-auto">{t("howItWorks.subtitle")}</p>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
              {config.hero.stats.map((stat) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
                  <div className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section id="produkter" className="bg-muted/30 py-10 sm:py-16 scroll-mt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-4 sm:gap-5">
              <div className="rounded-2xl overflow-hidden md:row-span-2 shadow-lg h-48 sm:h-auto">
                <img src={featureAdvisor} alt={t("feature.bankReport")} className="w-full h-full object-cover" />
              </div>
              <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <span className="text-2xl">🔍</span>
                <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">{t("feature.findHidden")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("feature.findHiddenDesc")}</p>
              </div>
              <div className="rounded-2xl overflow-hidden md:row-span-2 shadow-lg h-48 sm:h-auto">
                <img src={featureFamily} alt={t("feature.compare")} className="w-full h-full object-cover" />
              </div>
              <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <span className="text-2xl">🤖</span>
                <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">{t("feature.aiInsight")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("feature.aiInsightDesc")}</p>
              </div>
              <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <span className="text-2xl">📊</span>
                <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">{t("feature.compare")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("feature.compareDesc")}</p>
              </div>
              <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <span className="text-2xl">🏦</span>
                <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">{t("feature.bankReport")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("feature.bankReportDesc")}</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        {config.testimonials && config.testimonials.length > 0 && (
          <section className="bg-background py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8 text-center font-semibold">{t("testimonials.title")}</p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                {config.testimonials.map((testimonial) => (
                  <motion.div key={testimonial.name} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="rounded-2xl border border-border/60 p-6 bg-background shadow-sm">
                    <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(s => <span key={s} className="text-kassen-gold text-sm">★</span>)}</div>
                    <p className="text-sm text-foreground leading-relaxed mb-4">"{testimonial.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{testimonial.name.charAt(0)}</div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{testimonial.name}</p>
                        <p className="text-[11px] text-muted-foreground">{testimonial.location}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="bg-hero-navy py-20">
          <div className="max-w-lg mx-auto px-6 text-center">
            <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">{t("bottomCta.title")}</h2>
            <p className="text-white/60 text-sm mb-8">{t("bottomCta.subtitle")}</p>
            <button onClick={() => { setDirection(1); setStep("household"); }}
              className="px-10 py-4 rounded-xl bg-white text-hero-navy font-bold text-base hover:bg-white/90 transition-all shadow-xl shadow-black/20">
              {t("hero.cta")} <ArrowRight className="w-4 h-4 inline ml-1.5" />
            </button>
            <p className="text-white/40 text-[11px] mt-5">{t("bottomCta.noLogin")}</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-foreground/[0.03] border-t border-border py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
              <div>
                <span className="font-display font-black text-base text-foreground">{config.brandName}</span>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t("footer.tagline")}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">{t("footer.product")}</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>{t("footer.budgetCalc")}</li>
                  <li>{t("feature.aiInsight")}</li>
                  <li>{t("footer.neighborComp")}</li>
                  <li>{t("feature.bankReport")}</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">{t("footer.info")}</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>{t("footer.privacy")}</li>
                  <li>{t("footer.terms")}</li>
                  <li>{t("footer.contact")}</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
              {config.footer?.disclaimerText && <p className="text-[10px] text-muted-foreground">{config.footer.disclaimerText}</p>}
              <p className="text-[10px] text-muted-foreground">{config.footer?.text || `© 2026 ${config.brandName}`}</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ─── ONBOARDING STEPS (cinematic full-screen) ───────────

  const renderStepContent = () => {
    switch (step) {
      case "household":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <h1 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-foreground">{t("step.household.title")}</h1>
              <p className="text-muted-foreground text-sm sm:text-base">{t("step.household.subtitle")}</p>
            </motion.div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-md">
              {[
                { type: "solo" as const, emoji: "🧍", label: t("step.household.solo"), sub: t("step.household.soloSub") },
                { type: "par" as const, emoji: "👫", label: t("step.household.couple"), sub: t("step.household.coupleSub") },
              ].map((opt) => (
                <BigChoice
                  key={opt.type}
                  active={profile.householdType === opt.type}
                  onClick={() => {
                    const isPairChoice = opt.type === "par";
                    const baseFood = isPairChoice ? 6000 : 3500;
                    const childCount = profile.hasChildren ? profile.childrenAges.length : 0;
                    update({
                      householdType: opt.type,
                      partnerIncome: opt.type === "solo" ? 0 : profile.partnerIncome || 28000,
                      insuranceAmount: isPairChoice ? INSURANCE.par.price : INSURANCE.solo.price,
                      foodAmount: baseFood + (FOOD.per_child * childCount),
                      leisureAmount: isPairChoice ? 2500 : 1500,
                      clothingAmount: isPairChoice ? 1200 : 800,
                      healthAmount: isPairChoice ? 500 : 350,
                      restaurantAmount: isPairChoice ? 1500 : 800,
                    });
                    setTimeout(() => goNext(), 300);
                  }}
                  icon={opt.emoji} label={opt.label} sub={opt.sub}
                />
              ))}
            </div>
          </div>
        );

      case "income": {
        const totalAdditional = profile.additionalIncome.reduce((sum, s) => sum + frequencyToMonthly(s.amount, s.frequency), 0);
        const addIncomeSource = () => update({ additionalIncome: [...profile.additionalIncome, { label: "", amount: 0, frequency: "monthly" }] });
        const updateIncomeSource = (idx: number, partial: Partial<IncomeSource>) => {
          const updated = profile.additionalIncome.map((s, i) => i === idx ? { ...s, ...partial } : s);
          update({ additionalIncome: updated });
        };
        const removeIncomeSource = (idx: number) => update({ additionalIncome: profile.additionalIncome.filter((_, i) => i !== idx) });

        return (
          <div className="space-y-8 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">
                {isPar ? t("step.income.titleCouple") : t("step.income.titleSolo")}
              </h1>
              <p className="text-muted-foreground text-sm">{t("step.income.subtitle")}</p>
            </motion.div>

            <BigSlider value={profile.income} onChange={(v) => update({ income: v })}
              label={isPar ? t("step.income.myIncomePar") : t("step.income.myIncome")} min={10000} max={80000} step={500} />

            {isPar && (
              <BigSlider value={profile.partnerIncome} onChange={(v) => update({ partnerIncome: v })}
                label={t("step.income.partnerIncome")} min={0} max={80000} step={500} />
            )}

            {/* Additional income */}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.income.otherIncome")}</h3>
              {profile.additionalIncome.map((src, i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-2 mb-2">
                  <div className="flex gap-2">
                    <input type="text" value={src.label} onChange={(e) => updateIncomeSource(i, { label: e.target.value })}
                      placeholder={t("step.income.placeholder")}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30" />
                    <button onClick={() => removeIncomeSource(i)}
                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 bg-muted rounded-lg px-3 py-2 flex-1">
                      <input type="number" value={src.amount || ""} onChange={(e) => updateIncomeSource(i, { amount: Number(e.target.value) || 0 })}
                        placeholder={t("step.income.amount")} className="flex-1 bg-transparent text-sm font-semibold focus:outline-none no-spin w-16" />
                      <span className="text-xs text-muted-foreground">{t("currency")}</span>
                    </div>
                    <select value={src.frequency} onChange={(e) => updateIncomeSource(i, { frequency: e.target.value as PaymentFrequency })}
                      className="bg-background border border-border rounded-lg px-2 py-2 text-xs focus:outline-none">
                      <option value="monthly">{t("freq.monthly")}</option>
                      <option value="quarterly">{t("freq.quarterly")}</option>
                      <option value="biannual">{t("freq.biannual")}</option>
                      <option value="annual">{t("freq.annual")}</option>
                    </select>
                  </div>
                </div>
              ))}
              <button onClick={addIncomeSource}
                className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors">
                <Plus className="w-3.5 h-3.5" /> {t("step.income.addSource")}
              </button>
            </div>

            {/* Total */}
            <motion.div layout className="rounded-2xl bg-primary/5 border border-primary/20 p-5 text-center">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{t("step.income.total")}</span>
              <motion.div key={profile.income + (isPar ? profile.partnerIncome : 0) + totalAdditional}
                initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                className="font-display font-black text-2xl text-primary mt-1">
                {formatKr(profile.income + (isPar ? profile.partnerIncome : 0) + totalAdditional)} {t("currency")}
              </motion.div>
            </motion.div>

            <AILiveComment profile={profile} step="income" />
            <ContinueButton onClick={goNext} disabled={profile.income < 1000} label={t("continue")} />
          </div>
        );
      }

      case "housing": {
        const postalName = profile.postalCode.length === 4 ? getPostalName(profile.postalCode) : null;
        const sourceNote = profile.postalCode.length === 4 ? getEstimateSource(profile.housingType) : null;

        const handlePostalChange = (val: string) => {
          const clean = val.replace(/\D/g, "").slice(0, 4);
          update({ postalCode: clean });
          if (clean.length === 4) {
            if (profile.housingType === "ejer") update({ postalCode: clean, mortgageAmount: getMortgageEstimate(clean), propertyValue: getPropertyValueEstimate(clean) });
            else if (profile.housingType === "andel") update({ postalCode: clean, rentAmount: getAndelEstimate(clean, isPar) });
            else update({ postalCode: clean, rentAmount: getRentEstimate(clean, isPar) });
          }
        };

        const handleHousingType = (type: "lejer" | "ejer" | "andel") => {
          if (type === "ejer") {
            const propVal = profile.postalCode.length === 4 ? getPropertyValueEstimate(profile.postalCode) : 2500000;
            const mortVal = profile.postalCode.length === 4 ? getMortgageEstimate(profile.postalCode) : 8500;
            update({ housingType: type, hasMortgage: true, mortgageAmount: mortVal, propertyValue: propVal, interestRate: 4.0 });
          } else if (type === "andel") {
            update({ housingType: type, hasMortgage: true, mortgageAmount: profile.mortgageAmount || 3500, propertyValue: 0, interestRate: 0 });
            if (profile.postalCode.length === 4) update({ housingType: type, hasMortgage: true, rentAmount: getAndelEstimate(profile.postalCode, isPar), mortgageAmount: profile.mortgageAmount || 3500 });
          } else {
            update({ housingType: type, hasMortgage: false, propertyValue: 0, interestRate: 0 });
            if (profile.postalCode.length === 4) update({ housingType: type, hasMortgage: false, rentAmount: getRentEstimate(profile.postalCode, isPar) });
          }
        };

        return (
          <div className="space-y-8 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">{t("step.housing.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("step.housing.subtitle")}</p>
            </motion.div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { type: "lejer" as const, emoji: "🏢", label: t("step.housing.renter") },
                { type: "andel" as const, emoji: "🏘️", label: t("step.housing.coop") },
                { type: "ejer" as const, emoji: "🏡", label: t("step.housing.owner") },
              ].map((opt) => (
                <BigChoice key={opt.type} active={profile.housingType === opt.type}
                  onClick={() => handleHousingType(opt.type)} icon={opt.emoji} label={opt.label} />
              ))}
            </div>

            {/* Postal code */}
            <div>
              <label className="text-sm text-muted-foreground block mb-2">{t("step.housing.postalCode")}</label>
              <input type="text" inputMode="numeric" maxLength={4} value={profile.postalCode}
                onChange={(e) => handlePostalChange(e.target.value)}
                placeholder={t("step.housing.postalPlaceholder")}
                className="w-full bg-background border-2 border-border rounded-2xl px-5 py-4 text-lg font-display font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/30" />
              {postalName && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-primary font-medium mt-2 text-center">📍 {postalName}</motion.p>
              )}
            </div>

            {/* Housing-specific fields */}
            {profile.housingType === "lejer" && (
              <BigSlider value={profile.rentAmount} onChange={(v) => update({ rentAmount: v })} label={t("step.housing.rent")} min={2000} max={25000} step={250} />
            )}
            {profile.housingType === "andel" && (
              <div className="space-y-6">
                <BigSlider value={profile.rentAmount} onChange={(v) => update({ rentAmount: v })} label={t("step.housing.coopFee")} min={1000} max={15000} step={250} />
                <BigSlider value={profile.mortgageAmount} onChange={(v) => update({ mortgageAmount: v })} label={t("step.housing.coopLoan")} min={0} max={15000} step={250} />
              </div>
            )}
            {profile.housingType === "ejer" && (
              <div className="space-y-6">
                <BigSlider value={profile.mortgageAmount} onChange={(v) => update({ mortgageAmount: v })} label={t("step.housing.mortgage")} min={2000} max={30000} step={250} />
                <BigSlider value={profile.propertyValue} onChange={(v) => update({ propertyValue: v })} label={t("step.housing.propertyValue")} min={500000} max={10000000} step={100000} />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">{t("step.housing.interestRate")}</span>
                    <span className="font-display font-bold text-xl">{profile.interestRate.toFixed(1)}%</span>
                  </div>
                  <Slider min={0.5} max={8} step={0.25} value={[profile.interestRate]} onValueChange={([v]) => update({ interestRate: v })} className="w-full" />
                </div>
              </div>
            )}

            {sourceNote && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5 rounded-2xl bg-primary/[0.04] border border-primary/10 px-4 py-3">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{sourceNote}{postalName ? ` (${postalName})` : ""}. Ret beløbet ovenfor hvis det ikke passer.</p>
              </motion.div>
            )}
            <AILiveComment profile={profile} step="housing" />
            <ContinueButton onClick={goNext} label={t("continue")} />
          </div>
        );
      }

      case "children":
        return (
          <div className="space-y-8 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">
                {isPar ? t("step.children.titleCouple") : t("step.children.titleSolo")}
              </h1>
              <p className="text-muted-foreground text-sm">{t("step.children.subtitle")}</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <BigChoice active={!profile.hasChildren} onClick={() => { update({ hasChildren: false, childrenAges: [] }); setChildAgeInputs([]); }} icon="✌️" label={t("step.children.no")} />
              <BigChoice active={profile.hasChildren} onClick={() => { update({ hasChildren: true }); if (childAgeInputs.length === 0) setChildAgeInputs([3]); }} icon="👶" label={t("step.children.yes")} />
            </div>

            {profile.hasChildren && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("step.children.age")}</p>
                {childAgeInputs.map((age, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-14">{t("step.children.child")} {i + 1}</span>
                    <select value={age}
                      onChange={(e) => { const na = [...childAgeInputs]; na[i] = Number(e.target.value); setChildAgeInputs(na); update({ childrenAges: na }); }}
                      className="flex-1 bg-background border-2 border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {Array.from({ length: 18 }, (_, j) => <option key={j} value={j}>{j} {t("step.children.years")}</option>)}
                    </select>
                    {childAgeInputs.length > 1 && (
                      <button onClick={() => { const na = childAgeInputs.filter((_, idx) => idx !== i); setChildAgeInputs(na); update({ childrenAges: na }); }}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {childAgeInputs.length < 5 && (
                  <button onClick={() => { const na = [...childAgeInputs, 3]; setChildAgeInputs(na); update({ childrenAges: na }); }}
                    className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> {t("step.children.add")}
                  </button>
                )}
              </motion.div>
            )}
            <ContinueButton onClick={() => {
              if (profile.hasChildren && childAgeInputs.length > 0) update({ childrenAges: childAgeInputs });
              goNext();
            }} label={t("continue")} />
          </div>
        );

      case "expenses": {
        const addCustom = () => {
          if (customLabel.trim() && customAmount > 0) {
            update({ customExpenses: [...profile.customExpenses, { label: customLabel.trim(), amount: customAmount, frequency: customFreq }] });
            setCustomLabel(""); setCustomAmount(0); setCustomFreq("monthly");
          }
        };

        return (
          <div className="space-y-8 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">{t("step.expenses.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("step.expenses.subtitle")}</p>
            </motion.div>

            {/* Streaming */}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.expenses.streaming")}</h3>
              <div className="space-y-1.5">
                {[
                  { key: "hasNetflix" as const, icon: "🎬", label: "Netflix", sub: `${SUBSCRIPTIONS.netflix.price} ${t("perMonth")}` },
                  { key: "hasSpotify" as const, icon: "🎵", label: "Spotify", sub: `${isPar ? SUBSCRIPTIONS.spotify.price_par : SUBSCRIPTIONS.spotify.price_solo} ${t("perMonth")}` },
                  { key: "hasHBO" as const, icon: "🎭", label: "HBO Max", sub: `${SUBSCRIPTIONS.hbo.price} ${t("perMonth")}` },
                  { key: "hasViaplay" as const, icon: "⚽", label: "Viaplay", sub: `${SUBSCRIPTIONS.viaplay.price} ${t("perMonth")}` },
                  { key: "hasDisney" as const, icon: "✨", label: "Disney+", sub: `${SUBSCRIPTIONS.disney.price} ${t("perMonth")}` },
                  { key: "hasAppleTV" as const, icon: "🍎", label: "Apple TV+", sub: `${SUBSCRIPTIONS.appleTV.price} ${t("perMonth")}` },
                  { key: "hasAmazonPrime" as const, icon: "📦", label: "Amazon Prime", sub: `${SUBSCRIPTIONS.amazonPrime.price} ${t("perMonth")}` },
                ].map((s) => (
                  <ToggleRow key={s.key} active={!!profile[s.key]} onClick={() => update({ [s.key]: !profile[s.key] } as any)}
                    icon={s.icon} label={s.label} sublabel={s.sub} />
                ))}
              </div>
            </div>

            {/* Transport */}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.expenses.transport")}</h3>
              <ToggleRow active={profile.hasCar} onClick={() => update({ hasCar: !profile.hasCar })}
                icon="🚗" label={t("step.expenses.car")} sublabel={profile.hasCar ? `${formatKr(profile.carLoan + profile.carFuel + Math.round(profile.carInsurance/12) + Math.round(profile.carTax/12) + Math.round(profile.carService/6))} ${t("perMonth")}` : t("step.expenses.carLoan")} />
              {profile.hasCar && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-2 space-y-1.5 ml-2 border-l-2 border-primary/10 pl-4">
                  {[
                    { key: "carLoan", label: t("step.expenses.carLoan"), freq: t("perMonth") },
                    { key: "carFuel", label: t("step.expenses.fuel"), freq: t("perMonth") },
                    { key: "carInsurance", label: t("step.expenses.carInsurance"), freq: t("perYear") },
                    { key: "carTax", label: t("step.expenses.carTax"), freq: t("perYear") },
                    { key: "carService", label: t("step.expenses.carService"), freq: t("perHalfYear") },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                      <span className="text-xs text-muted-foreground">{f.label}</span>
                      <div className="flex items-center gap-1">
                        <input type="number" value={(profile as any)[f.key]} onChange={(e) => update({ [f.key]: Number(e.target.value) || 0 } as any)}
                          className="bg-transparent text-sm font-semibold text-right focus:outline-none no-spin w-16" />
                        <span className="text-[10px] text-muted-foreground">{f.freq}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Insurance etc */}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.expenses.insuranceUnion")}</h3>
              <div className="space-y-1.5">
                <ToggleRow active={profile.hasInsurance} onClick={() => update({ hasInsurance: !profile.hasInsurance })}
                  icon="🛡️" label={t("step.expenses.insurance")} sublabel={t("step.expenses.insuranceSub")}
                  amount={profile.insuranceAmount} onAmountChange={(v) => update({ insuranceAmount: v })} />
                <ToggleRow active={profile.hasUnion} onClick={() => update({ hasUnion: !profile.hasUnion })}
                  icon="🏛️" label={t("step.expenses.union")}
                  amount={profile.unionAmount} onAmountChange={(v) => update({ unionAmount: v })} />
                <ToggleRow active={profile.hasFitness} onClick={() => update({ hasFitness: !profile.hasFitness })}
                  icon="💪" label={t("step.expenses.fitness")}
                  amount={profile.fitnessAmount} onAmountChange={(v) => update({ fitnessAmount: v })} />
              </div>
            </div>

            {/* Pets, loans, savings */}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.expenses.petsLoans")}</h3>
              <div className="space-y-1.5">
                <ToggleRow active={profile.hasPet} onClick={() => update({ hasPet: !profile.hasPet })}
                  icon="🐕" label={t("step.expenses.pet")} sublabel={t("step.expenses.petSub")}
                  amount={profile.petAmount} onAmountChange={(v) => update({ petAmount: v })} />
                <ToggleRow active={profile.hasLoan} onClick={() => update({ hasLoan: !profile.hasLoan })}
                  icon="💰" label={t("step.expenses.loan")} sublabel={t("step.expenses.loanSub")}
                  amount={profile.loanAmount} onAmountChange={(v) => update({ loanAmount: v })} />
                <ToggleRow active={profile.hasSavings} onClick={() => update({ hasSavings: !profile.hasSavings })}
                  icon="🏦" label={t("step.expenses.savings")} sublabel={t("step.expenses.savingsSub")}
                  amount={profile.savingsAmount} onAmountChange={(v) => update({ savingsAmount: v })} />
              </div>
            </div>

            {/* Custom */}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.expenses.custom")}</h3>
              {profile.customExpenses.map((ce, i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl border border-primary/15 bg-primary/[0.02] px-4 py-2.5 mb-1.5">
                  <div>
                    <span className="text-sm font-medium">{ce.label}</span>
                    {ce.frequency && ce.frequency !== "monthly" && <span className="text-[10px] text-muted-foreground ml-1">({frequencyLabel(ce.frequency)})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatKr(frequencyToMonthly(ce.amount, ce.frequency || "monthly"))} {t("perMonth")}</span>
                    <button onClick={() => update({ customExpenses: profile.customExpenses.filter((_, idx) => idx !== i) })}
                      className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder={t("step.expenses.customPlaceholder")}
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30" />
                <input type="number" value={customAmount || ""} onChange={(e) => setCustomAmount(Number(e.target.value) || 0)}
                  placeholder={t("currency")}
                  className="w-20 bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none no-spin placeholder:text-muted-foreground/30" />
                <select value={customFreq} onChange={(e) => setCustomFreq(e.target.value as PaymentFrequency)}
                  className="bg-background border border-border rounded-xl px-1.5 py-2.5 text-[11px] focus:outline-none">
                  <option value="monthly">{t("freq.monthlyShort")}</option>
                  <option value="quarterly">{t("freq.quarterShort")}</option>
                  <option value="biannual">{t("freq.halfYearShort")}</option>
                  <option value="annual">{t("freq.yearShort")}</option>
                </select>
                <button onClick={addCustom} disabled={!customLabel.trim() || customAmount <= 0}
                  className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center disabled:opacity-20"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            <AILiveComment profile={profile} step="expenses" />
            <ContinueButton onClick={goNext} label={t("step.expenses.seeOverview")} />
          </div>
        );
      }

      case "review": {
        const budget = computeBudget(profile);
        const allExpenses = [...budget.fixedExpenses, ...budget.variableExpenses];
        const expenseRatio = Math.round((budget.totalExpenses / budget.totalIncome) * 100);
        const isHealthy = budget.disposableIncome > 8000;
        const isWarning = budget.disposableIncome > 3000;

        const variableFields: { key: keyof BudgetProfile; label: string; icon: string }[] = [
          { key: "foodAmount", label: t("step.review.food"), icon: "🛒" },
          { key: "restaurantAmount", label: t("step.review.restaurant"), icon: "🍕" },
          { key: "leisureAmount", label: t("step.review.leisure"), icon: "🎭" },
          { key: "clothingAmount", label: t("step.review.clothing"), icon: "👕" },
          { key: "healthAmount", label: t("step.review.health"), icon: "🏥" },
        ];

        return (
          <div className="space-y-8 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">{t("step.review.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("step.review.subtitle")}</p>
            </motion.div>

            {/* Hero disposable */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center py-10 rounded-3xl border-2 border-border relative overflow-hidden">
              <div className={`absolute inset-0 opacity-[0.04] ${isHealthy ? "bg-primary" : isWarning ? "bg-kassen-gold" : "bg-destructive"}`} />
              <div className="relative">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.review.disposable")}</p>
                <motion.div key={budget.disposableIncome} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-baseline justify-center gap-1">
                  <span className={`font-display font-black text-5xl sm:text-6xl ${isHealthy ? "text-primary" : isWarning ? "text-kassen-gold" : "text-destructive"}`}>
                    {formatKr(budget.disposableIncome)}
                  </span>
                  <span className="text-muted-foreground font-display text-xl">{t("currency")}</span>
                </motion.div>
                <p className="text-sm text-muted-foreground mt-3">
                  {isHealthy ? `✅ ${t("step.review.good")}` : isWarning ? `⚠️ ${t("step.review.tight")}` : `🚨 ${t("step.review.warning")}`}
                </p>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t("step.review.income"), amount: budget.totalIncome, color: "text-primary" },
                { label: t("step.review.expenses"), amount: budget.totalExpenses, color: "text-destructive" },
                { label: t("step.review.share"), amount: expenseRatio, color: "text-muted-foreground", suffix: "%" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border-2 border-border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`font-display font-bold text-base ${s.color}`}>
                    {s.suffix ? `${s.amount}${s.suffix}` : `${formatKr(s.amount)}`}
                  </p>
                </div>
              ))}
            </div>

            {/* Variable expenses */}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> {t("step.review.variableExpenses")}
              </h3>
              <div className="space-y-1.5">
                {variableFields.map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center justify-between rounded-2xl border-2 border-primary/15 bg-primary/[0.02] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{icon}</span>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded-xl px-3 py-1.5">
                      <input type="number" value={profile[key] as number}
                        onChange={(e) => update({ [key]: Number(e.target.value) || 0 } as any)}
                        className="bg-transparent text-sm font-semibold text-right focus:outline-none no-spin w-16" />
                      <span className="text-[10px] text-muted-foreground">{t("perMonth")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fixed expenses summary */}
            <div className="rounded-2xl border-2 border-border divide-y divide-border">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">{t("step.review.fixedExpenses")}</span>
                <span className="text-sm font-display font-bold">{formatKr(budget.fixedExpenses.reduce((s, e) => s + e.amount, 0))} {t("currency")}</span>
              </div>
              {budget.fixedExpenses.map((e, i) => (
                <div key={i} className="px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{e.label}</span>
                  <span className="text-xs font-medium tabular-nums">{formatKr(e.amount)} {t("currency")}</span>
                </div>
              ))}
            </div>

            <ContinueButton onClick={() => onComplete(profile)} label={t("step.review.seeDashboard")} />
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ─── Cinematic step shell ───────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {getStepIndex(step) > 1 ? (
            <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 px-1">
              <ChevronLeft className="w-4 h-4" /> {t("nav.back")}
            </button>
          ) : <div />}
          <StepIndicator step={step} />
          <span className="font-display font-black text-sm text-primary">{config.brandName}</span>
        </div>
      </header>

      {/* Content */}
      <div ref={contentRef} className="flex-1 px-5 py-8 overflow-y-auto" style={{ paddingBottom: liveBudget ? "5rem" : "2rem" }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Live budget bar */}
      {liveBudget && (
        <LiveBudgetBar
          income={liveBudget.totalIncome}
          expenses={liveBudget.totalExpenses}
          step={step}
        />
      )}
    </div>
  );
}
