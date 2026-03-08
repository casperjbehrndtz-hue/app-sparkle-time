import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, X, Check, ArrowRight, Shield, Clock, Sparkles, ChevronRight, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { computeBudget, formatKr } from "@/lib/budgetCalculator";
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

// ─── Sub-components ────────────────────────────────────────

function ProgressBar({ step }: { step: OnboardingStep }) {
  const idx = getStepIndex(step);
  if (idx <= 0) return null;
  const total = STEPS.length - 1;
  return (
    <div className="flex gap-1.5">
      {STEPS.slice(1).map((s, i) => (
        <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-border">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: i < idx ? "100%" : "0%" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      ))}
    </div>
  );
}

function StepShell({ step, title, subtitle, onBack, children, liveAmount }: {
  step: OnboardingStep; title: string; subtitle?: string; onBack?: () => void; children: React.ReactNode; liveAmount?: number | null;
}) {
  const config = useWhiteLabel();
  const { t } = useI18n();
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-5 pt-4 pb-3">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between">
            {onBack ? (
              <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 px-1">
                <ChevronLeft className="w-4 h-4" /> {t("nav.back")}
              </button>
            ) : <div />}
            <span className="font-display font-black text-base text-primary">{config.brandName}</span>
            {liveAmount != null ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("nav.back")}</span>
                <span className={`font-display font-bold text-sm ${liveAmount > 5000 ? "text-primary" : liveAmount > 0 ? "text-kassen-gold" : "text-destructive"}`}>
                  {formatKr(liveAmount)}
                </span>
              </div>
            ) : <div />}
          </div>
          <ProgressBar step={step} />
        </div>
      </div>
      <div className="flex-1 px-5 py-8 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-display font-bold text-xl md:text-2xl text-foreground">{title}</h2>
            {subtitle && <p className="text-muted-foreground text-sm mt-1 mb-6">{subtitle}</p>}
            {!subtitle && <div className="mb-6" />}
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ContinueButton({ onClick, disabled, label = "Fortsæt" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
    >
      {label} <ArrowRight className="w-4 h-4" />
    </motion.button>
  );
}

function OptionCard({ active, onClick, icon, label, sub }: {
  active: boolean; onClick: () => void; icon: string; label: string; sub?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-5 rounded-xl border text-center transition-all duration-150 ${
        active
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/30 hover:bg-muted/30"
      }`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="font-semibold text-[15px]">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      {active && (
        <motion.div layoutId="check" className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </motion.div>
      )}
    </motion.button>
  );
}

function ToggleRow({ active, onClick, icon, label, sublabel, amount, onAmountChange }: {
  active: boolean; onClick: () => void; icon: string; label: string; sublabel?: string;
  amount?: number; onAmountChange?: (v: number) => void;
}) {
  return (
    <div className={`rounded-xl border transition-all duration-150 ${active ? "border-primary/40 bg-primary/[0.03]" : "border-border hover:border-border"}`}>
      <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-[14px] block">{label}</span>
          {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        </div>
        <div className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all ${
          active ? "border-primary bg-primary" : "border-muted-foreground/25"
        }`}>
          {active && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
        </div>
      </button>
      {active && onAmountChange && amount !== undefined && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
              className="flex-1 bg-transparent text-sm font-semibold focus:outline-none no-spin w-20"
            />
            <span className="text-xs text-muted-foreground">kr./md.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SliderInput({ value, onChange, label, min = 0, max = 100000, step = 500 }: {
  value: number; onChange: (v: number) => void; label: string; min?: number; max?: number; step?: number;
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    const num = Number(raw);
    if (!isNaN(num) && raw !== "") {
      onChange(Math.max(min, Math.min(max, num)));
    }
  };

  const handleBlur = () => {
    const num = Number(localValue);
    if (isNaN(num) || localValue === "") {
      setLocalValue(String(value));
    } else {
      const clamped = Math.max(min, Math.min(max, num));
      onChange(clamped);
      setLocalValue(String(clamped));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-baseline gap-1 bg-muted rounded-lg px-3 py-1.5">
          <input
            type="number"
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="bg-transparent font-display font-bold text-lg w-[5.5rem] text-right focus:outline-none no-spin"
          />
          <span className="text-xs text-muted-foreground">kr.</span>
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
        <span>{formatKr(min)} kr.</span>
        <span>{formatKr(max)} kr.</span>
      </div>
    </div>
  );
}

function AiTip({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5 rounded-xl bg-primary/[0.04] border border-primary/10 px-4 py-3"
    >
      <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </motion.div>
  );
}

// ─── Main ──────────────────────────────────────────────────

export function OnboardingFlow({ onComplete }: Props) {
  const config = useWhiteLabel();
  const { t, lang } = useI18n();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [profile, setProfile] = useState<BudgetProfile>(defaultProfile);
  const [childAgeInputs, setChildAgeInputs] = useState<number[]>([3]);
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState(0);
  const [customFreq, setCustomFreq] = useState<PaymentFrequency>("monthly");
  const [liveDisposable, setLiveDisposable] = useState<number | null>(null);

  const isPar = profile.householdType === "par";
  const update = useCallback((partial: Partial<BudgetProfile>) => {
    setProfile((p) => ({ ...p, ...partial }));
  }, []);

  useEffect(() => {
    if (getStepIndex(step) >= 3) {
      const b = computeBudget(profile);
      setLiveDisposable(b.disposableIncome);
    }
  }, [profile, step]);

  const goNext = () => { const idx = getStepIndex(step); if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]); };
  const goBack = () => { const idx = getStepIndex(step); if (idx > 1) setStep(STEPS[idx - 1]); };

  // ─── WELCOME ─────────────────────────────
   if (step === "welcome") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Nav — dark */}
        <nav className="bg-hero-navy px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
            <span className="font-display font-black text-lg sm:text-xl text-white">{config.brandName}</span>
            <div className="flex items-center gap-3 sm:gap-6">
              <button onClick={() => document.getElementById('produkter')?.scrollIntoView({ behavior: 'smooth' })} className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors cursor-pointer bg-transparent border-none">Produkter</button>
              <button onClick={() => document.getElementById('saadan-virker-det')?.scrollIntoView({ behavior: 'smooth' })} className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors cursor-pointer bg-transparent border-none">Sådan virker det</button>
              <button
                onClick={() => setStep("household")}
                className="px-4 sm:px-5 py-2 rounded-lg bg-white text-hero-navy text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                {config.hero.ctaLabel}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero — dark navy */}
        <section className="bg-hero-navy">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-display font-black text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.1] tracking-tight text-white mb-4 sm:mb-5">
                {config.hero.title}<br />
                <span className="text-white">{config.hero.titleHighlight}</span>
              </h1>
              <p className="text-white/60 text-sm sm:text-base md:text-lg leading-relaxed mb-6 sm:mb-8 max-w-md">
                {config.hero.subtitle}
              </p>
              <button
                onClick={() => setStep("household")}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-white text-hero-navy text-sm font-semibold hover:bg-white/90 transition-all shadow-lg shadow-black/20"
              >
                {config.hero.ctaLabel} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Right side — hero image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="hidden md:block"
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
                <img src={heroCouple} alt="Par der planlægger økonomi sammen" className="w-full h-full object-cover" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trust badges bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="border-b border-border bg-background"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-10">
            {[
              { icon: <Shield className="w-4 h-4 text-muted-foreground" />, text: "Bygget til dansk finanslovgivning" },
              { icon: <Clock className="w-4 h-4 text-muted-foreground" />, text: "Udfyldt på 3 minutter" },
              { icon: <Sparkles className="w-4 h-4 text-muted-foreground" />, text: "100% privat · Data gemmes lokalt" },
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                {badge.icon}
                <span>{badge.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats section — "Sådan virker det" */}
        <section id="saadan-virker-det" className="bg-background py-10 sm:py-16 scroll-mt-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-foreground mb-3">
              Få overblik over din økonomi
            </h2>
            <p className="text-muted-foreground text-base mb-12 max-w-md mx-auto">
              Få hjælp til din økonomi og det, der er vigtigt for dig, din familie og din bolig.
            </p>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
              {config.hero.stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <div className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature cards — "Produkter" */}
        <section id="produkter" className="bg-muted/30 py-10 sm:py-16 scroll-mt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-4 sm:gap-5"
            >
              {/* Card 1 — image */}
              <div className="rounded-2xl overflow-hidden md:row-span-2 shadow-lg h-48 sm:h-auto">
                <img src={featureAdvisor} alt="Rådgivning" className="w-full h-full object-cover" />
              </div>
              {/* Card 2 — text */}
              <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <span className="text-2xl">🔍</span>
                <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">Find skjulte udgifter</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Vi gennemgår streaming, forsikring og transport — og viser hvad der æder dit budget.</p>
              </div>
              {/* Card 3 — image */}
              <div className="rounded-2xl overflow-hidden md:row-span-2 shadow-lg h-48 sm:h-auto">
                <img src={featureFamily} alt="Familie økonomi" className="w-full h-full object-cover" />
              </div>
              {/* Card 4 — text */}
              <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <span className="text-2xl">🤖</span>
                <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">AI-indsigt</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Analyse af dine tal og udgiftsmønstre.</p>
              </div>
              {/* Card 5 — text */}
              <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <span className="text-2xl">📊</span>
                <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">Sammenlign med andre</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Se din økonomi i forhold til lignende familier i dit område.</p>
              </div>
              {/* Card 6 — text */}
              <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <span className="text-2xl">🏦</span>
                <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">Bankmøde-rapport</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Tag en professionel rapport med til din bankrådgiver.</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Social proof — with stars */}
        {config.testimonials && config.testimonials.length > 0 && (
          <section className="bg-background py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8 text-center font-semibold">Hvad andre siger</p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                {config.testimonials.map((t) => (
                  <motion.div
                    key={t.name}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="rounded-2xl border border-border/60 p-6 bg-background shadow-sm"
                  >
                    <div className="flex gap-0.5 mb-3">
                      {[1,2,3,4,5].map(s => <span key={s} className="text-kassen-gold text-sm">★</span>)}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-4">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground">{t.location}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA — solid white button */}
        <section className="bg-hero-navy py-20">
          <div className="max-w-lg mx-auto px-6 text-center">
            <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">Klar til at komme i gang?</h2>
            <p className="text-white/60 text-sm mb-8">Det tager kun 3 minutter — og koster ingenting.</p>
            <button
              onClick={() => setStep("household")}
              className="px-10 py-4 rounded-xl bg-white text-hero-navy font-bold text-base hover:bg-white/90 transition-all shadow-xl shadow-black/20"
            >
              {config.hero.ctaLabel} <ArrowRight className="w-4 h-4 inline ml-1.5" />
            </button>
            <p className="text-white/40 text-[11px] mt-5">Ingen login · Ingen data deles · Alt gemmes lokalt</p>
          </div>
        </section>

        {/* Footer — expanded */}
        <footer className="bg-foreground/[0.03] border-t border-border py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
              <div>
                <span className="font-display font-black text-base text-foreground">{config.brandName}</span>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Få det fulde overblik over din økonomi. Gratis, privat og bygget til danske forhold.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Produkt</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="hover:text-foreground transition-colors cursor-default">Budgetberegner</li>
                  <li className="hover:text-foreground transition-colors cursor-default">AI-indsigt</li>
                  <li className="hover:text-foreground transition-colors cursor-default">Nabo-sammenligning</li>
                  <li className="hover:text-foreground transition-colors cursor-default">Bankmøde-rapport</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Information</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="hover:text-foreground transition-colors cursor-default">Privatlivspolitik</li>
                  <li className="hover:text-foreground transition-colors cursor-default">Vilkår & betingelser</li>
                  <li className="hover:text-foreground transition-colors cursor-default">Kontakt</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
              {config.footer?.disclaimerText && (
                <p className="text-[10px] text-muted-foreground">{config.footer.disclaimerText}</p>
              )}
              <p className="text-[10px] text-muted-foreground">
                {config.footer?.text || `© 2026 ${config.brandName}. Alle rettigheder forbeholdes.`}
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ─── HOUSEHOLD ───────────────────────────
  if (step === "household") {
    return (
      <StepShell step={step} title="Hvem er med i husstanden?" subtitle="Vi tilpasser alle estimater til jeres situation.">
        <div className="grid grid-cols-2 gap-3">
          {[
            { type: "solo" as const, emoji: "🧍", label: "Kun mig", sub: "Enlig husstand" },
            { type: "par" as const, emoji: "👫", label: "Vi er to", sub: "Par / samboende" },
          ].map((opt) => (
            <OptionCard
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
                setTimeout(() => setStep("income"), 200);
              }}
              icon={opt.emoji} label={opt.label} sub={opt.sub}
            />
          ))}
        </div>
      </StepShell>
    );
  }

  // ─── INCOME ──────────────────────────────
  if (step === "income") {
    const totalAdditional = profile.additionalIncome.reduce((sum, s) => sum + frequencyToMonthly(s.amount, s.frequency), 0);
    const addIncomeSource = () => {
      update({ additionalIncome: [...profile.additionalIncome, { label: "", amount: 0, frequency: "monthly" }] });
    };
    const updateIncomeSource = (idx: number, partial: Partial<IncomeSource>) => {
      const updated = profile.additionalIncome.map((s, i) => i === idx ? { ...s, ...partial } : s);
      update({ additionalIncome: updated });
    };
    const removeIncomeSource = (idx: number) => {
      update({ additionalIncome: profile.additionalIncome.filter((_, i) => i !== idx) });
    };

    return (
      <StepShell step={step} title={isPar ? "Hvad er jeres indkomst?" : "Hvad er din indkomst?"} subtitle="Månedlig udbetalt efter skat." onBack={goBack}>
        <div className="space-y-8">
          <SliderInput
            value={profile.income} onChange={(v) => update({ income: v })}
            label={isPar ? "Din indkomst" : "Månedlig indkomst"} min={10000} max={80000} step={500}
          />
          {isPar && (
            <SliderInput
              value={profile.partnerIncome} onChange={(v) => update({ partnerIncome: v })}
              label="Partners indkomst" min={0} max={80000} step={500}
            />
          )}

          {/* Additional income sources */}
          <div>
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Øvrig indkomst</h3>
            {profile.additionalIncome.length > 0 && (
              <div className="space-y-2 mb-3">
                {profile.additionalIncome.map((src, i) => (
                  <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex gap-2">
                      <input type="text" value={src.label} onChange={(e) => updateIncomeSource(i, { label: e.target.value })}
                        placeholder="F.eks. Bonus, SU, børnepenge"
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30" />
                      <button onClick={() => removeIncomeSource(i)}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1 bg-muted rounded-lg px-3 py-2 flex-1">
                        <input type="number" value={src.amount || ""} onChange={(e) => updateIncomeSource(i, { amount: Number(e.target.value) || 0 })}
                          placeholder="Beløb"
                          className="flex-1 bg-transparent text-sm font-semibold focus:outline-none no-spin w-16" />
                        <span className="text-xs text-muted-foreground">kr.</span>
                      </div>
                      <select value={src.frequency} onChange={(e) => updateIncomeSource(i, { frequency: e.target.value as PaymentFrequency })}
                        className="bg-background border border-border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="monthly">Månedlig</option>
                        <option value="quarterly">Kvartalsvis</option>
                        <option value="biannual">Halvårlig</option>
                        <option value="annual">Årlig</option>
                      </select>
                    </div>
                    {src.frequency !== "monthly" && src.amount > 0 && (
                      <p className="text-[11px] text-muted-foreground">= {formatKr(frequencyToMonthly(src.amount, src.frequency))} kr./md.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={addIncomeSource}
              className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Tilføj indkomstkilde
            </button>
          </div>

          <div className="rounded-xl bg-muted/50 border border-border p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Samlet indkomst</span>
            <span className="font-display font-bold text-lg text-primary">
              {formatKr(profile.income + (isPar ? profile.partnerIncome : 0) + totalAdditional)} kr.
            </span>
          </div>
          <AiTip text={isPar 
            ? `Gennemsnitlig husstandsindkomst for par i Danmark er ca. 52.000 kr./md. efter skat.`
            : `Gennemsnitlig indkomst for enlige i Danmark er ca. 27.000 kr./md. efter skat.`
          } />
          <ContinueButton onClick={goNext} disabled={profile.income < 1000} />
        </div>
      </StepShell>
    );
  }

  // ─── HOUSING ─────────────────────────────
  if (step === "housing") {
    const postalName = profile.postalCode.length === 4 ? getPostalName(profile.postalCode) : null;
    const sourceNote = profile.postalCode.length === 4 ? getEstimateSource(profile.housingType) : null;

    const handlePostalChange = (val: string) => {
      const clean = val.replace(/\D/g, "").slice(0, 4);
      update({ postalCode: clean });
      if (clean.length === 4) {
        if (profile.housingType === "ejer") {
          update({ postalCode: clean, mortgageAmount: getMortgageEstimate(clean), propertyValue: getPropertyValueEstimate(clean) });
        } else if (profile.housingType === "andel") {
          update({ postalCode: clean, rentAmount: getAndelEstimate(clean, isPar) });
        } else {
          update({ postalCode: clean, rentAmount: getRentEstimate(clean, isPar) });
        }
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
      <StepShell step={step} title="Boligsituation" subtitle="Vi estimerer ud fra postnummer — justér frit." onBack={goBack} liveAmount={liveDisposable}>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: "lejer" as const, emoji: "🏢", label: "Lejer" },
              { type: "andel" as const, emoji: "🏘️", label: "Andel" },
              { type: "ejer" as const, emoji: "🏡", label: "Ejer" },
            ].map((opt) => (
              <OptionCard
                key={opt.type}
                active={profile.housingType === opt.type}
                onClick={() => handleHousingType(opt.type)}
                icon={opt.emoji} label={opt.label}
              />
            ))}
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-2">Postnummer</label>
            <input
              type="text" inputMode="numeric" maxLength={4}
              value={profile.postalCode}
              onChange={(e) => handlePostalChange(e.target.value)}
              placeholder="F.eks. 2100"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/30"
            />
            {postalName && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-primary font-medium mt-1.5 ml-1">
                📍 {postalName}
              </motion.p>
            )}
          </div>

          {profile.housingType === "lejer" && (
            <SliderInput value={profile.rentAmount} onChange={(v) => update({ rentAmount: v })} label="Månedlig husleje" min={2000} max={25000} step={250} />
          )}
          {profile.housingType === "andel" && (
            <div className="space-y-5">
              <SliderInput value={profile.rentAmount} onChange={(v) => update({ rentAmount: v })} label="Månedlig boligafgift" min={1000} max={15000} step={250} />
              <SliderInput value={profile.mortgageAmount} onChange={(v) => update({ mortgageAmount: v })} label="Andelslån (afdrag + renter)" min={0} max={15000} step={250} />
            </div>
          )}
          {profile.housingType === "ejer" && (
            <div className="space-y-5">
              <SliderInput value={profile.mortgageAmount} onChange={(v) => update({ mortgageAmount: v })} label="Månedlig boligydelse" min={2000} max={30000} step={250} />
              <SliderInput value={profile.propertyValue} onChange={(v) => update({ propertyValue: v })} label="Boligens estimerede værdi" min={500000} max={10000000} step={100000} />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Rente på lån</span>
                  <div className="flex items-baseline gap-1 bg-muted rounded-lg px-3 py-1.5">
                    <span className="font-display font-bold text-lg">{profile.interestRate.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <Slider
                  min={0.5}
                  max={8}
                  step={0.25}
                  value={[profile.interestRate]}
                  onValueChange={([v]) => update({ interestRate: v })}
                  className="w-full"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                  <span>0,5%</span>
                  <span>8%</span>
                </div>
              </div>
            </div>
          )}

          {sourceNote && (
            <AiTip text={`${sourceNote}${postalName ? ` (${postalName})` : ""}. Ret beløbet ovenfor hvis det ikke passer.`} />
          )}

          <ContinueButton onClick={goNext} />
        </div>
      </StepShell>
    );
  }

  // ─── CHILDREN ────────────────────────────
  if (step === "children") {
    return (
      <StepShell step={step} title={isPar ? "Har I børn?" : "Har du børn?"} subtitle="Vi finder institutionspriser automatisk." onBack={goBack} liveAmount={liveDisposable}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <OptionCard active={!profile.hasChildren} onClick={() => { update({ hasChildren: false, childrenAges: [] }); setChildAgeInputs([]); }} icon="✌️" label="Ingen børn" />
            <OptionCard active={profile.hasChildren} onClick={() => { update({ hasChildren: true }); if (childAgeInputs.length === 0) setChildAgeInputs([3]); }} icon="👶" label="Ja, vi har børn" />
          </div>

          {profile.hasChildren && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
              <p className="text-sm text-muted-foreground">Alder for hvert barn:</p>
              {childAgeInputs.map((age, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-14">Barn {i + 1}</span>
                  <select
                    value={age}
                    onChange={(e) => {
                      const newAges = [...childAgeInputs]; newAges[i] = Number(e.target.value);
                      setChildAgeInputs(newAges); update({ childrenAges: newAges });
                    }}
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {Array.from({ length: 18 }, (_, j) => <option key={j} value={j}>{j} år</option>)}
                  </select>
                  {childAgeInputs.length > 1 && (
                    <button onClick={() => { const na = childAgeInputs.filter((_, idx) => idx !== i); setChildAgeInputs(na); update({ childrenAges: na }); }}
                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {childAgeInputs.length < 5 && (
                <button onClick={() => { const na = [...childAgeInputs, 3]; setChildAgeInputs(na); update({ childrenAges: na }); }}
                  className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Tilføj barn
                </button>
              )}
            </motion.div>
          )}
          <AiTip text="Institutionspriser er landsgennemsnit 2026 (kilde: KL/kommunerne). Vuggestue ca. 4.500 kr., børnehave ca. 2.600 kr., SFO ca. 2.300 kr./md. Din kommune kan afvige — ret beløbet i dashboardet." />
          <ContinueButton onClick={() => {
            if (profile.hasChildren && childAgeInputs.length > 0) {
              update({ childrenAges: childAgeInputs });
            }
            goNext();
          }} />
        </div>
      </StepShell>
    );
  }

  // ─── EXPENSES ────────────────────────────
  if (step === "expenses") {
    const addCustom = () => {
      if (customLabel.trim() && customAmount > 0) {
        update({ customExpenses: [...profile.customExpenses, { label: customLabel.trim(), amount: customAmount, frequency: customFreq }] });
        setCustomLabel(""); setCustomAmount(0); setCustomFreq("monthly");
      }
    };

    const sections = [
      {
        title: "Streaming & musik", items: [
          { key: "hasNetflix" as const, icon: "🎬", label: "Netflix", sub: `${SUBSCRIPTIONS.netflix.price} kr./md.` },
          { key: "hasSpotify" as const, icon: "🎵", label: "Spotify", sub: `${isPar ? SUBSCRIPTIONS.spotify.price_par : SUBSCRIPTIONS.spotify.price_solo} kr./md.` },
          { key: "hasHBO" as const, icon: "🎭", label: "HBO Max", sub: `${SUBSCRIPTIONS.hbo.price} kr./md.` },
          { key: "hasViaplay" as const, icon: "⚽", label: "Viaplay", sub: `${SUBSCRIPTIONS.viaplay.price} kr./md.` },
          { key: "hasDisney" as const, icon: "✨", label: "Disney+", sub: `${SUBSCRIPTIONS.disney.price} kr./md.` },
          { key: "hasAppleTV" as const, icon: "🍎", label: "Apple TV+", sub: `${SUBSCRIPTIONS.appleTV.price} kr./md.` },
          { key: "hasAmazonPrime" as const, icon: "📦", label: "Amazon Prime", sub: `${SUBSCRIPTIONS.amazonPrime.price} kr./md.` },
        ],
      },
    ];

    return (
      <StepShell step={step} title="Faste udgifter" subtitle="Vælg det der passer — vi præudfylder priserne." onBack={goBack} liveAmount={liveDisposable}>
        <div className="space-y-8">
          {/* Streaming */}
          <div>
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Streaming & musik</h3>
            <div className="space-y-1.5">
              {sections[0].items.map((s) => (
                <ToggleRow key={s.key} active={!!profile[s.key]} onClick={() => update({ [s.key]: !profile[s.key] } as any)}
                  icon={s.icon} label={s.label} sublabel={s.sub} />
              ))}
            </div>
          </div>

          {/* Transport — detailed */}
          <div>
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Transport</h3>
            <ToggleRow active={profile.hasCar} onClick={() => update({ hasCar: !profile.hasCar })}
              icon="🚗" label="Bil" sublabel={profile.hasCar ? `${formatKr(profile.carLoan + profile.carFuel + Math.round(profile.carInsurance/12) + Math.round(profile.carTax/12) + Math.round(profile.carService/6))} kr./md. samlet` : "Lån, benzin, forsikring, afgift"} />
            {profile.hasCar && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-2 space-y-1.5 ml-2 border-l-2 border-primary/10 pl-4">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Billån / leasing</span>
                  <div className="flex items-center gap-1">
                    <input type="number" value={profile.carLoan} onChange={(e) => update({ carLoan: Number(e.target.value) || 0 })}
                      className="bg-transparent text-sm font-semibold text-right focus:outline-none no-spin w-16" />
                    <span className="text-[10px] text-muted-foreground">kr./md.</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Benzin / opladning</span>
                  <div className="flex items-center gap-1">
                    <input type="number" value={profile.carFuel} onChange={(e) => update({ carFuel: Number(e.target.value) || 0 })}
                      className="bg-transparent text-sm font-semibold text-right focus:outline-none no-spin w-16" />
                    <span className="text-[10px] text-muted-foreground">kr./md.</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Bilforsikring</span>
                  <div className="flex items-center gap-1">
                    <input type="number" value={profile.carInsurance} onChange={(e) => update({ carInsurance: Number(e.target.value) || 0 })}
                      className="bg-transparent text-sm font-semibold text-right focus:outline-none no-spin w-20" />
                    <span className="text-[10px] text-muted-foreground">kr./år</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Vægtafgift / grøn ejerafgift</span>
                  <div className="flex items-center gap-1">
                    <input type="number" value={profile.carTax} onChange={(e) => update({ carTax: Number(e.target.value) || 0 })}
                      className="bg-transparent text-sm font-semibold text-right focus:outline-none no-spin w-20" />
                    <span className="text-[10px] text-muted-foreground">kr./år</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Service / værksted</span>
                  <div className="flex items-center gap-1">
                    <input type="number" value={profile.carService} onChange={(e) => update({ carService: Number(e.target.value) || 0 })}
                      className="bg-transparent text-sm font-semibold text-right focus:outline-none no-spin w-20" />
                    <span className="text-[10px] text-muted-foreground">kr./halvår</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Insurance etc */}
          <div>
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Forsikring & fagforening</h3>
            <div className="space-y-1.5">
              <ToggleRow active={profile.hasInsurance} onClick={() => update({ hasInsurance: !profile.hasInsurance })}
                icon="🛡️" label="Forsikringer" sublabel="Indbo, ulykke, etc."
                amount={profile.insuranceAmount} onAmountChange={(v) => update({ insuranceAmount: v })} />
              <ToggleRow active={profile.hasUnion} onClick={() => update({ hasUnion: !profile.hasUnion })}
                icon="🏛️" label="Fagforening & A-kasse"
                amount={profile.unionAmount} onAmountChange={(v) => update({ unionAmount: v })} />
              <ToggleRow active={profile.hasFitness} onClick={() => update({ hasFitness: !profile.hasFitness })}
                icon="💪" label="Fitness / sport"
                amount={profile.fitnessAmount} onAmountChange={(v) => update({ fitnessAmount: v })} />
            </div>
          </div>

          {/* Kæledyr, lån & opsparing */}
          <div>
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Kæledyr, lån & opsparing</h3>
            <div className="space-y-1.5">
              <ToggleRow active={profile.hasPet} onClick={() => update({ hasPet: !profile.hasPet })}
                icon="🐕" label="Kæledyr" sublabel="Foder, dyrlæge, forsikring"
                amount={profile.petAmount} onAmountChange={(v) => update({ petAmount: v })} />
              <ToggleRow active={profile.hasLoan} onClick={() => update({ hasLoan: !profile.hasLoan })}
                icon="💰" label="Lån" sublabel="SU-lån, forbrugslån, billån"
                amount={profile.loanAmount} onAmountChange={(v) => update({ loanAmount: v })} />
              <ToggleRow active={profile.hasSavings} onClick={() => update({ hasSavings: !profile.hasSavings })}
                icon="🏦" label="Opsparing / investering" sublabel="Fast opsparing pr. måned"
                amount={profile.savingsAmount} onAmountChange={(v) => update({ savingsAmount: v })} />
            </div>
          </div>

          {/* Custom */}
          <div>
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Egne udgifter</h3>
            {profile.customExpenses.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {profile.customExpenses.map((ce, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-primary/15 bg-primary/[0.02] px-4 py-2.5">
                    <div>
                      <span className="text-sm font-medium">{ce.label}</span>
                      {ce.frequency && ce.frequency !== "monthly" && (
                        <span className="text-[10px] text-muted-foreground ml-1">({frequencyLabel(ce.frequency)})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatKr(frequencyToMonthly(ce.amount, ce.frequency || "monthly"))} kr./md.
                      </span>
                      <button onClick={() => update({ customExpenses: profile.customExpenses.filter((_, idx) => idx !== i) })}
                        className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="F.eks. Kontaktlinser"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30" />
              <input type="number" value={customAmount || ""} onChange={(e) => setCustomAmount(Number(e.target.value) || 0)}
                placeholder="Kr."
                className="w-20 bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30 no-spin" />
              <select value={customFreq} onChange={(e) => setCustomFreq(e.target.value as PaymentFrequency)}
                className="bg-background border border-border rounded-lg px-1.5 py-2.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="monthly">Md.</option>
                <option value="quarterly">Kvartal</option>
                <option value="biannual">Halvår</option>
                <option value="annual">År</option>
              </select>
              <button onClick={addCustom} disabled={!customLabel.trim() || customAmount <= 0}
                className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center disabled:opacity-20 hover:bg-primary/15 transition-colors flex-shrink-0">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AiTip text={`💡 Vi har automatisk inkluderet sundhed (${isPar ? "500" : "350"} kr.), restaurant (${isPar ? "1.500" : "800"} kr.)${profile.housingType === "ejer" ? ", grundejerforening (1.500 kr.)" : ""}${!profile.hasCar ? " og offentlig transport (600 kr.)" : ""} baseret på jeres profil. Tilføj egne udgifter ovenfor hvis noget mangler.`} />
          <ContinueButton onClick={goNext} label="Se overblik" />
        </div>
      </StepShell>
    );
  }

  // ─── REVIEW ──────────────────────────────
  if (step === "review") {
    const budget = computeBudget(profile);
    const allExpenses = [...budget.fixedExpenses, ...budget.variableExpenses];
    const expenseRatio = Math.round((budget.totalExpenses / budget.totalIncome) * 100);
    const isHealthy = budget.disposableIncome > 8000;
    const isWarning = budget.disposableIncome > 3000;

    const variableFields: { key: keyof BudgetProfile; label: string; icon: string }[] = [
      { key: "foodAmount", label: "Mad & dagligvarer", icon: "🛒" },
      { key: "restaurantAmount", label: "Restaurant & takeaway", icon: "🍕" },
      { key: "leisureAmount", label: "Fritid & oplevelser", icon: "🎭" },
      { key: "clothingAmount", label: "Tøj & personlig pleje", icon: "👕" },
      { key: "healthAmount", label: "Sundhed (læge, tandlæge)", icon: "🏥" },
    ];

    return (
      <StepShell step={step} title="Gennemse & justér" subtitle="Ret alle tal til inden du går videre." onBack={goBack}>
        <div className="space-y-6">
          {/* Hero number */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center py-8 rounded-2xl border border-border relative overflow-hidden"
          >
            <div className={`absolute inset-0 opacity-[0.04] ${isHealthy ? "bg-primary" : isWarning ? "bg-kassen-gold" : "bg-destructive"}`} />
            <div className="relative">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Rådighedsbeløb pr. måned</p>
              <div className="flex items-baseline justify-center gap-1">
                <motion.span
                  key={budget.disposableIncome}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`font-display font-black text-4xl md:text-5xl ${isHealthy ? "text-primary" : isWarning ? "text-kassen-gold" : "text-destructive"}`}
                >
                  {formatKr(budget.disposableIncome)}
                </motion.span>
                <span className="text-muted-foreground font-display text-lg">kr.</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isHealthy ? "✅ God økonomi" : isWarning ? "⚠️ Slank margin" : "🚨 Under anbefaling"}
              </p>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Indkomst", amount: budget.totalIncome, color: "text-primary" },
              { label: "Udgifter", amount: budget.totalExpenses, color: "text-destructive" },
              { label: "Andel", amount: expenseRatio, color: "text-muted-foreground", suffix: "%" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`font-display font-bold text-base ${s.color}`}>
                  {s.suffix ? `${s.amount}${s.suffix}` : `${formatKr(s.amount)}`}
                </p>
              </div>
            ))}
          </div>

          {/* Editable variable expenses */}
          <div>
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" /> Variable udgifter — justér til dit forbrug
            </h3>
            <div className="space-y-1.5">
              {variableFields.map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between rounded-xl border border-primary/15 bg-primary/[0.02] px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-muted rounded-lg px-3 py-1.5">
                    <input
                      type="number"
                      value={profile[key] as number}
                      onChange={(e) => update({ [key]: Number(e.target.value) || 0 } as any)}
                      className="bg-transparent text-sm font-semibold text-right focus:outline-none no-spin w-16"
                    />
                    <span className="text-[10px] text-muted-foreground">kr./md.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fixed expense list (read-only summary) */}
          <div className="rounded-xl border border-border divide-y divide-border">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Faste udgifter</span>
              <span className="text-sm font-display font-bold">{formatKr(budget.fixedExpenses.reduce((s, e) => s + e.amount, 0))} kr.</span>
            </div>
            {budget.fixedExpenses.map((e, i) => (
              <div key={i} className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{e.label}</span>
                <span className="text-xs font-medium tabular-nums">{formatKr(e.amount)} kr.</span>
              </div>
            ))}
          </div>

          <AiTip text="Ret de variable udgifter ovenfor så de passer til jeres reelle forbrug. Tallene opdateres live, og I kan altid justere i dashboardet bagefter." />

          <ContinueButton onClick={() => onComplete(profile)} label="Se fuldt dashboard" />
        </div>
      </StepShell>
    );
  }

  return null;
}
