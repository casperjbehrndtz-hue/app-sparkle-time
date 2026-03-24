import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronDown, Plus, X, Info, Sparkles, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { usePayslipOCR } from "@/hooks/usePayslipOCR";
import OcrConsentModal from "@/components/OcrConsentModal";
import { payslipToProfile } from "@/lib/payslipTypes";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { computeBudget, formatKr } from "@/lib/budgetCalculator";
import { useLocale } from "@/lib/locale";
import { AILiveComment } from "./AILiveComment";
import {
  pageVariants, STEPS, getStepIndex,
  LiveBudgetBar, StepIndicator,
  BigChoice, BigSlider, ToggleRow, ContinueButton,
} from "./OnboardingUI";
import {
  SUBSCRIPTIONS, FOOD, INSURANCE, UTILITIES,
  getMortgageEstimate, getRentEstimate, getAndelEstimate,
  getPostalName, getEstimateSource, getPropertyValueEstimate,
  getChildBenefit,
} from "@/data/priceDatabase";
import {
  NO_SUBSCRIPTIONS, NO_FOOD, NO_INSURANCE, NO_UTILITIES,
  noGetMortgageEstimate, noGetRentEstimate, noGetBorettslagEstimate,
  noGetPostalName, noGetEstimateSource, noGetPropertyValueEstimate,
} from "@/data/priceDatabase.no";
import type { BudgetProfile, OnboardingStep, PaymentFrequency, IncomeSource } from "@/lib/types";
import { frequencyToMonthly, frequencyLabel } from "@/lib/types";

// ─── Celebration particles on step complete ──────────────
function CelebrationBurst({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; delay: number }[]>([]);
  useEffect(() => {
    if (trigger === 0) return;
    const colors = ["hsl(var(--primary))", "hsl(var(--nemt-gold))", "hsl(152 69% 42%)", "hsl(213 80% 60%)"];
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: 50 + (Math.random() - 0.5) * 60,
      y: 40 + (Math.random() - 0.5) * 30,
      color: colors[i % colors.length],
      delay: Math.random() * 0.15,
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 800);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, scale: 0, x: `${p.x}%`, y: `${p.y}%` }}
          animate={{ opacity: 0, scale: 1, y: `${p.y - 15}%` }}
          transition={{ duration: 0.7, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
          className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

// ─── Animated count-up number ───────────────────────────
function CountUpNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (Math.abs(diff) < 10) { setDisplay(value); return; }
    const steps = 25;
    let step = 0;
    const tick = () => {
      step++;
      const t = step / steps;
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease out
      setDisplay(Math.round(start + diff * ease));
      if (step < steps) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);

  return <span className={className}>{formatKr(display)}</span>;
}

// ─── Accordion for fixed expenses categories ─────────
function AccordionCategory({ icon, label, total, unit, defaultOpen, children }: {
  icon: string; label: string; total: number; unit: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {total > 0 ? `${formatKr(total)} ${unit}` : "—"}
          </span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompactSlider({ label, value, onChange, min, max, step, icon, unit }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; icon: string; unit: string;
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setLocalValue(String(value)); }, [value]);
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:border-primary/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <input type="number" inputMode="numeric" min={min} max={max} value={localValue}
            onFocus={() => { focused.current = true; }}
            onChange={(e) => { setLocalValue(e.target.value); const v = Number(e.target.value); if (e.target.value !== "" && !isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
            onBlur={() => { focused.current = false; const v = Number(localValue); if (localValue === "" || isNaN(v)) { setLocalValue(String(value)); } else { const clamped = Math.max(min, Math.min(max, v)); onChange(clamped); setLocalValue(String(clamped)); } }}
            className="w-16 text-right bg-transparent text-sm font-bold focus:outline-none no-spin tabular-nums"
            aria-label={label} />
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 appearance-none rounded-full cursor-pointer"
        style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--secondary)) ${pct}%)` }}
        aria-label={label}
      />
    </div>
  );
}

interface Props {
  onComplete: (profile: BudgetProfile) => void;
  initialProfile?: BudgetProfile;
}

const defaultProfile: BudgetProfile = {
  householdType: "solo", income: 35000, partnerIncome: 0, additionalIncome: [], postalCode: "",
  housingType: "lejer", hasMortgage: false, rentAmount: 9000, mortgageAmount: 0, propertyValue: 0, interestRate: 4.0,
  hasChildren: false, childrenAges: [],
  hasNetflix: false, hasSpotify: false, hasHBO: false, hasViaplay: false,
  hasAppleTV: false, hasDisney: false, hasAmazonPrime: false,
  hasCar: false, carAmount: 3500, carLoan: 2000, carFuel: 1200, carInsurance: 5500, carTax: 3600, carService: 2500,
  hasInternet: true,
  hasInsurance: false, insuranceAmount: INSURANCE.solo.price,
  hasUnion: false, unionAmount: 500,
  hasFitness: false, fitnessAmount: 349,
  hasPet: false, petAmount: 800,
  hasLoan: false, loanAmount: 1500,
  hasSavings: false, savingsAmount: 3000,
  foodAmount: 4000, leisureAmount: 1500, clothingAmount: 800, healthAmount: 350, restaurantAmount: 800,
  customExpenses: [],
};

const ONBOARDING_SESSION_KEY = "nb_onboarding_wip";

function saveOnboardingState(step: OnboardingStep, profile: BudgetProfile) {
  try {
    localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify({ step, profile }));
  } catch { /* ignore quota errors */ }
}

function loadOnboardingState(): { step: OnboardingStep; profile: BudgetProfile } | null {
  try {
    const saved = localStorage.getItem(ONBOARDING_SESSION_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function clearOnboardingState() {
  try { localStorage.removeItem(ONBOARDING_SESSION_KEY); } catch { /* ignore */ }
}

export function OnboardingFlow({ onComplete, initialProfile }: Props) {
  const config = useWhiteLabel();
  const { t, lang } = useI18n();
  const isEditing = !!initialProfile;

  // Restore from sessionStorage if available (and not editing)
  const restored = !isEditing ? loadOnboardingState() : null;

  const [step, setStep] = useState<OnboardingStep>(() => {
    if (isEditing) return "household";
    if (restored?.step) {
      // Migrate old step names from saved sessions
      const s = restored.step as string;
      if (s === "children") return "household";
      if (s === "expenses") return "everyday";
      if (STEPS.includes(s as OnboardingStep)) return s as OnboardingStep;
    }
    return "household";
  });
  const [direction, setDirection] = useState(1);
  const [profile, setProfile] = useState<BudgetProfile>(
    initialProfile ?? (restored?.profile ? { ...defaultProfile, ...restored.profile } : defaultProfile)
  );
  // childAgeInputs derived from profile — single source of truth
  const childAgeInputs = profile.childrenAges;
  const setChildAgeInputs = useCallback((ages: number[] | ((prev: number[]) => number[])) => {
    setProfile((p) => {
      const next = typeof ages === "function" ? ages(p.childrenAges) : ages;
      return { ...p, childrenAges: next };
    });
  }, []);
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState(0);
  const [customFreq, setCustomFreq] = useState<PaymentFrequency>("monthly");
  const payslipOCR = usePayslipOCR();
  const payslipInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);

  // Persist onboarding state to localStorage on changes
  useEffect(() => {
    saveOnboardingState(step, profile);
  }, [step, profile]);

  // Apply payslip OCR result to profile
  useEffect(() => {
    if (payslipOCR.result) {
      const partial = payslipToProfile(payslipOCR.result);
      update(partial);
    }
  }, [payslipOCR.result]);

  const locale = useLocale();
  const isPar = profile.householdType === "par";
  const isNO = locale.code === "no";
  const update = useCallback((partial: Partial<BudgetProfile>) => {
    setProfile((p) => ({ ...p, ...partial }));
  }, []);

  const liveBudget = getStepIndex(step) >= 1 ? computeBudget(profile, null, locale) : null;

  const goNext = () => {
    setDirection(1);
    const idx = getStepIndex(step);
    if (idx < STEPS.length - 1) {
      setCelebrationTrigger((n) => n + 1);
      setStep(STEPS[idx + 1]);
    }
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => {
    setDirection(-1);
    const idx = getStepIndex(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };
  // ─── STEP CONTENT RENDERER ───────────────
  const renderStepContent = () => {
    switch (step) {
      case "household":
        return (
          <div className="space-y-8 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <h1 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-foreground">{t("step.household.title")}</h1>
              <p className="text-muted-foreground text-sm sm:text-base">{t("step.household.subtitle")}</p>
            </motion.div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full" role="radiogroup" aria-label={t("step.household.title")}>
              {[
                { type: "solo" as const, emoji: "🧍", label: t("step.household.solo"), sub: t("step.household.soloSub") },
                { type: "par" as const, emoji: "👫", label: t("step.household.couple"), sub: t("step.household.coupleSub") },
              ].map((opt) => (
                <BigChoice
                  key={opt.type}
                  active={profile.householdType === opt.type}
                  onClick={() => {
                    const isPairChoice = opt.type === "par";
                    const childCount = profile.hasChildren ? profile.childrenAges.length : 0;
                    const utilDb = isNO ? NO_UTILITIES : UTILITIES;
                    update({
                      householdType: opt.type,
                      partnerIncome: opt.type === "solo" ? 0 : profile.partnerIncome || 28000,
                      insuranceAmount: isPairChoice
                        ? (isNO ? NO_INSURANCE.par.price : INSURANCE.par.price)
                        : (isNO ? NO_INSURANCE.solo.price : INSURANCE.solo.price),
                      foodAmount: (isPairChoice ? (isNO ? 9000 : 7000) : (isNO ? 5500 : 4000))
                        + ((isNO ? NO_FOOD.per_child : FOOD.per_child) * childCount),
                      leisureAmount: isPairChoice ? 2500 : 1500,
                      clothingAmount: isPairChoice ? 1200 : 800,
                      healthAmount: isPairChoice ? 500 : 350,
                      restaurantAmount: isPairChoice ? 1500 : 800,
                      mobileAmount: utilDb.mobile.price_per_person * (isPairChoice ? 2 : 1),
                      electricityAmount: isPairChoice ? utilDb.electricity.price_par : utilDb.electricity.price_solo,
                      heatingAmount: isPairChoice ? utilDb.heating.price_par : utilDb.heating.price_solo,
                    });
                  }}
                  icon={opt.emoji} label={opt.label} sub={opt.sub}
                />
              ))}
            </div>

            {/* Children — integrated into household */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label={t("step.children.title")}>
                <BigChoice active={!profile.hasChildren} onClick={() => { update({ hasChildren: false }); setChildAgeInputs([]); }} icon="✌️" label={t("step.children.no")} />
                <BigChoice active={profile.hasChildren} onClick={() => { update({ hasChildren: true }); if (childAgeInputs.length === 0) setChildAgeInputs([3]); }} icon="👶" label={t("step.children.yes")} />
              </div>
              {profile.hasChildren && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t("step.children.age")}</p>
                  {childAgeInputs.map((age, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-14">{t("step.children.child")} {i + 1}</span>
                      <select value={String(age)}
                        onChange={(e) => { const na = [...childAgeInputs]; na[i] = Number(e.target.value); setChildAgeInputs(na); }}
                        className="flex-1 bg-background border-2 border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20">
                        {Array.from({ length: 18 }, (_, j) => <option key={j} value={String(j)}>{j} {t("step.children.years")}</option>)}
                      </select>
                      {childAgeInputs.length > 1 && (
                        <button onClick={() => { const na = childAgeInputs.filter((_, idx) => idx !== i); setChildAgeInputs(na); }}
                          className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground tap-bounce">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {childAgeInputs.length < 5 && (
                    <button onClick={() => { setChildAgeInputs([...childAgeInputs, 3]); }}
                      className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors py-2 tap-bounce">
                      <Plus className="w-4 h-4" /> {t("step.children.add")}
                    </button>
                  )}
                  {childAgeInputs.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-primary/[0.04] border border-primary/10 p-4 space-y-1.5">
                      <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{t("step.children.benefitTitle")}</p>
                      {childAgeInputs.map((age, i) => {
                        const benefit = getChildBenefit(age);
                        return (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t("step.children.child")} {i + 1} ({age} {t("step.children.years")})</span>
                            <span className="font-semibold text-primary">+{formatKr(benefit.monthly)} {t("perMonth")}</span>
                          </div>
                        );
                      })}
                      <div className="pt-1.5 border-t border-primary/10 flex items-center justify-between text-sm font-bold">
                        <span>{t("step.children.benefitTotal")}</span>
                        <span className="text-primary">+{formatKr(childAgeInputs.reduce((s, age) => s + getChildBenefit(age).monthly, 0))} {t("perMonth")}</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>

            <ContinueButton onClick={goNext} label={t("continue")} />
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
              <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                className="text-xs font-medium text-primary">{t("onboarding.encourage.income")}</motion.p>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">
                {isPar ? t("step.income.titleCouple") : t("step.income.titleSolo")}
              </h1>
            <p className="text-muted-foreground text-sm">{t("step.income.subtitle")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">💡 {t("step.income.netTip")}</p>
            </motion.div>
            {/* ── Payslip upload ── */}
            <div className="space-y-4">
              {!payslipOCR.result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/30 transition-colors p-5 text-center cursor-pointer"
                  onClick={() => payslipInputRef.current?.click()}
                >
                  <input
                    ref={payslipInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        payslipOCR.processPayslip(file).then(() => {
                          // Apply result after processing completes (handled via effect below)
                        });
                      }
                      e.target.value = "";
                    }}
                  />
                  {payslipOCR.isProcessing ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <p className="text-sm font-medium text-primary">{t("step.income.payslip.analyzing")}</p>
                    </div>
                  ) : payslipOCR.error ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <p className="text-sm text-destructive">{t(payslipOCR.error) !== payslipOCR.error ? t(payslipOCR.error) : payslipOCR.error}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); payslipOCR.reset(); }}
                        className="text-xs text-primary font-medium hover:underline"
                      >{t("step.income.payslip.retry")}</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <p className="text-sm font-medium">{t("step.income.payslip.title")}</p>
                      <p className="text-xs text-muted-foreground">{t("step.income.payslip.hint")}</p>
                    </div>
                  )}
                </motion.div>
              )}
              {payslipOCR.result && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl bg-primary/[0.04] border border-primary/20 p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">{t("step.income.payslip.success")}</p>
                    <p className="text-xs text-muted-foreground">{t("step.income.payslip.applied")}</p>
                  </div>
                  <button onClick={() => payslipOCR.reset()} className="text-xs text-muted-foreground hover:text-foreground">{t("step.income.payslip.clear")}</button>
                </motion.div>
              )}

              <div className="flex items-center gap-3 text-muted-foreground/40">
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-xs">{t("step.income.payslip.divider")}</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
            </div>

            <BigSlider value={profile.income} onChange={(v) => update({ income: v })}
              label={isPar ? t("step.income.myIncomePar") : t("step.income.myIncome")} min={0} max={200000} step={500}
              presets={[20000, 30000, 40000, 55000, 80000]} />
            {isPar && (
              <BigSlider value={profile.partnerIncome} onChange={(v) => update({ partnerIncome: v })}
                label={t("step.income.partnerIncome")} min={0} max={200000} step={500}
                presets={[20000, 30000, 40000, 55000, 80000]} />
            )}
            <div>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.income.otherIncome")}</h3>
              {profile.additionalIncome.map((src, i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-2 mb-2">
                  <div className="flex gap-2">
                    <input type="text" value={src.label} onChange={(e) => updateIncomeSource(i, { label: e.target.value })}
                      placeholder={t("step.income.placeholder")}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30" />
                    <button onClick={() => removeIncomeSource(i)} className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground tap-bounce shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 bg-muted rounded-lg px-3 py-2 flex-1">
                      <input type="number" min={0} value={src.amount || ""} onChange={(e) => updateIncomeSource(i, { amount: Math.max(0, Number(e.target.value) || 0) })}
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
              <button onClick={addIncomeSource} className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors py-2 tap-bounce">
                <Plus className="w-3.5 h-3.5" /> {t("step.income.addSource")}
              </button>
            </div>
            <motion.div layout className="rounded-2xl bg-primary/5 border border-primary/20 p-5 text-center">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">{t("step.income.total")}</span>
              <motion.div key={profile.income + (isPar ? profile.partnerIncome : 0) + totalAdditional}
                initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                className="font-display font-black text-2xl text-primary mt-1">
                {formatKr(profile.income + (isPar ? profile.partnerIncome : 0) + totalAdditional)} {t("currency")}
              </motion.div>
            </motion.div>
            <AILiveComment profile={profile} step="income" />
            {(profile.income + (isPar ? profile.partnerIncome : 0)) < 1000 && (
              <p className="text-xs text-muted-foreground text-center">{t("step.income.minWarning")}</p>
            )}
            <ContinueButton onClick={goNext} disabled={(profile.income + (isPar ? profile.partnerIncome : 0)) < 1000} label={t("continue")} />
          </div>
        );
      }

      case "housing": {
        const postalName = profile.postalCode.length === 4
          ? (isNO ? noGetPostalName(profile.postalCode) : getPostalName(profile.postalCode))
          : null;
        const sourceNote = profile.postalCode.length === 4
          ? (isNO ? noGetEstimateSource(profile.housingType) : getEstimateSource(profile.housingType))
          : null;
        const handlePostalChange = (val: string) => {
          const clean = val.replace(/\D/g, "").slice(0, 4);
          update({ postalCode: clean });
          if (clean.length === 4) {
            if (profile.housingType === "ejer") {
              const propVal = isNO ? noGetPropertyValueEstimate(clean) : getPropertyValueEstimate(clean);
              const mortVal = isNO ? noGetMortgageEstimate(clean) : getMortgageEstimate(clean);
              update({ postalCode: clean, mortgageAmount: mortVal, propertyValue: propVal });
            } else if (profile.housingType === "andel") {
              const andel = isNO ? noGetBorettslagEstimate(clean, isPar) : getAndelEstimate(clean, isPar);
              update({ postalCode: clean, rentAmount: andel });
            } else {
              const rent = isNO ? noGetRentEstimate(clean, isPar) : getRentEstimate(clean, isPar);
              update({ postalCode: clean, rentAmount: rent });
            }
          }
        };
        const handleHousingType = (type: "lejer" | "ejer" | "andel") => {
          const hasPostal = profile.postalCode.length === 4;
          if (type === "ejer") {
            const propVal = hasPostal
              ? (isNO ? noGetPropertyValueEstimate(profile.postalCode) : getPropertyValueEstimate(profile.postalCode))
              : (isNO ? 3500000 : 2500000);
            const mortVal = hasPostal
              ? (isNO ? noGetMortgageEstimate(profile.postalCode) : getMortgageEstimate(profile.postalCode))
              : (isNO ? 12000 : 8500);
            update({ housingType: type, hasMortgage: true, mortgageAmount: mortVal, propertyValue: propVal, interestRate: isNO ? 5.0 : 4.0 });
          } else if (type === "andel") {
            const rentEst = hasPostal
              ? (isNO ? noGetBorettslagEstimate(profile.postalCode, isPar) : getAndelEstimate(profile.postalCode, isPar))
              : 5000;
            update({ housingType: type, hasMortgage: true, rentAmount: rentEst, mortgageAmount: profile.mortgageAmount || 3500, propertyValue: 0, interestRate: 0 });
          } else {
            const rentEst = hasPostal
              ? (isNO ? noGetRentEstimate(profile.postalCode, isPar) : getRentEstimate(profile.postalCode, isPar))
              : 8500;
            update({ housingType: type, hasMortgage: false, rentAmount: rentEst, propertyValue: 0, interestRate: 0 });
          }
        };
        return (
          <div className="space-y-8 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                className="text-xs font-medium text-primary">{t("onboarding.encourage.housing")}</motion.p>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">{t("step.housing.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("step.housing.subtitle")}</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label={t("step.housing.title")}>
              {[
                { type: "lejer" as const, emoji: "🏢", label: locale.housingTypeLabels.lejer },
                { type: "andel" as const, emoji: "🏘️", label: locale.housingTypeLabels.andel },
                { type: "ejer" as const, emoji: "🏡", label: locale.housingTypeLabels.ejer },
              ].map((opt) => (
                <BigChoice key={opt.type} active={profile.housingType === opt.type} onClick={() => handleHousingType(opt.type)} icon={opt.emoji} label={opt.label} />
              ))}
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-2">{t("step.housing.postalCode")}</label>
              <input type="text" inputMode="numeric" maxLength={4} value={profile.postalCode}
                onChange={(e) => handlePostalChange(e.target.value)}
                placeholder={t("step.housing.postalPlaceholder")}
                className="w-full bg-background border-2 border-border rounded-2xl px-5 py-4 text-lg font-display font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/30" />
              {profile.postalCode.length === 4 && (
                postalName
                  ? <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-primary font-medium mt-2 text-center">📍 {postalName}</motion.p>
                  : <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground mt-2 text-center">{t("step.housing.unknownPostal")}</motion.p>
              )}
            </div>
            {profile.housingType === "lejer" && <BigSlider value={profile.rentAmount} onChange={(v) => update({ rentAmount: v })} label={t("step.housing.rent")} min={2000} max={25000} step={250} />}
            {profile.housingType === "andel" && (
              <div className="space-y-6">
                <BigSlider value={profile.rentAmount} onChange={(v) => update({ rentAmount: v })} label={t("step.housing.coopFee")} min={1000} max={15000} step={250} />
                <BigSlider value={profile.mortgageAmount} onChange={(v) => update({ mortgageAmount: v })} label={t("step.housing.coopLoan")} min={0} max={15000} step={250} />
              </div>
            )}
            {profile.housingType === "ejer" && (
              <div className="space-y-6">
                <BigSlider value={profile.mortgageAmount} onChange={(v) => update({ mortgageAmount: v })} label={t("step.housing.mortgage")} min={2000} max={40000} step={250} />
                <BigSlider value={profile.propertyValue} onChange={(v) => update({ propertyValue: v })} label={t("step.housing.propertyValue")} min={500000} max={10000000} step={100000} />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">{t("step.housing.interestRate")}</span>
                    <span className="font-display font-bold text-xl">{profile.interestRate % 1 === 0 ? profile.interestRate.toFixed(1) : profile.interestRate.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => update({ interestRate: Math.max(0.5, profile.interestRate - 0.25) })} disabled={profile.interestRate <= 0.5}
                      className="w-11 h-11 rounded-xl bg-muted/60 hover:bg-muted active:scale-95 border border-border/40 flex items-center justify-center text-sm font-bold text-muted-foreground disabled:opacity-30 transition-all select-none shrink-0 tap-bounce">−</button>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60 transition-all duration-200" style={{ width: `${((profile.interestRate - 0.5) / 7.5) * 100}%` }} />
                    </div>
                    <button type="button" onClick={() => update({ interestRate: Math.min(8, profile.interestRate + 0.25) })} disabled={profile.interestRate >= 8}
                      className="w-11 h-11 rounded-xl bg-muted/60 hover:bg-muted active:scale-95 border border-border/40 flex items-center justify-center text-sm font-bold text-muted-foreground disabled:opacity-30 transition-all select-none shrink-0 tap-bounce">+</button>
                  </div>
                </div>
              </div>
            )}
            {sourceNote && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 rounded-2xl bg-primary/[0.04] border border-primary/10 px-4 py-3">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{sourceNote}{postalName ? ` (${postalName})` : ""}. {t("onboarding.adjustAmount")}</p>
              </motion.div>
            )}
            <AILiveComment profile={profile} step="housing" />
            <ContinueButton onClick={goNext} label={t("continue")} />
          </div>
        );
      }

      case "everyday": {
        const unit = t("unit.krMonth");
        return (
          <div className="space-y-8 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                className="text-xs font-medium text-primary">{t("onboarding.encourage.everyday")}</motion.p>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">{t("step.everyday.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("step.everyday.subtitle")}</p>
            </motion.div>

            {/* Smart defaults info banner */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 rounded-2xl bg-primary/[0.04] border border-primary/10 px-4 py-3">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{t("step.everyday.smartDefaults")}</p>
            </motion.div>

            <div className="space-y-2">
              <CompactSlider icon="🛒" label={t("step.review.food")} value={profile.foodAmount} onChange={(v) => update({ foodAmount: v })} min={isPar ? 4000 : 2500} max={isPar ? 10000 : 6000} step={100} unit={unit} />
              <CompactSlider icon="🍕" label={t("step.review.restaurant")} value={profile.restaurantAmount} onChange={(v) => update({ restaurantAmount: v })} min={0} max={5000} step={100} unit={unit} />
              <CompactSlider icon="🎭" label={t("step.review.leisure")} value={profile.leisureAmount} onChange={(v) => update({ leisureAmount: v })} min={0} max={8000} step={100} unit={unit} />
              <CompactSlider icon="👕" label={t("step.review.clothing")} value={profile.clothingAmount} onChange={(v) => update({ clothingAmount: v })} min={0} max={3000} step={100} unit={unit} />
              <CompactSlider icon="🏥" label={t("step.review.health")} value={profile.healthAmount} onChange={(v) => update({ healthAmount: v })} min={0} max={2000} step={50} unit={unit} />
            </div>

            <AILiveComment profile={profile} step="everyday" />
            <ContinueButton onClick={goNext} label={t("continue")} />
          </div>
        );
      }

      case "fixed": {
        const carMonthly = profile.hasCar
          ? profile.carLoan + profile.carFuel + Math.round(profile.carInsurance / 12) + Math.round(profile.carTax / 12) + Math.round(profile.carService / 6)
          : 0;
        const streamingTotal = (
          (profile.hasNetflix ? SUBSCRIPTIONS.netflix.price : 0) +
          (profile.hasSpotify ? (isPar ? SUBSCRIPTIONS.spotify.price_par : SUBSCRIPTIONS.spotify.price_solo) : 0) +
          (profile.hasHBO ? SUBSCRIPTIONS.hbo.price : 0) +
          (profile.hasViaplay ? SUBSCRIPTIONS.viaplay.price : 0) +
          (profile.hasDisney ? SUBSCRIPTIONS.disney.price : 0) +
          (profile.hasAppleTV ? SUBSCRIPTIONS.appleTV.price : 0) +
          (profile.hasAmazonPrime ? SUBSCRIPTIONS.amazonPrime.price : 0)
        );
        const utilitiesTotal = (
          (profile.internetAmount ?? (isNO ? NO_UTILITIES.internet.price : UTILITIES.internet.price)) +
          (profile.mobileAmount ?? (isNO ? NO_UTILITIES : UTILITIES).mobile.price_per_person * (isPar ? 2 : 1)) +
          (profile.electricityAmount ?? (isPar ? (isNO ? NO_UTILITIES : UTILITIES).electricity.price_par : (isNO ? NO_UTILITIES : UTILITIES).electricity.price_solo)) +
          (profile.heatingAmount ?? (isPar ? (isNO ? NO_UTILITIES : UTILITIES).heating.price_par : (isNO ? NO_UTILITIES : UTILITIES).heating.price_solo)) +
          (!isNO ? (profile.drAmount ?? UTILITIES.dr_licens.price) : 0)
        );
        const insuranceTotal = (
          (profile.hasInsurance ? profile.insuranceAmount : 0) +
          (profile.hasUnion ? profile.unionAmount : 0) +
          (profile.hasFitness ? profile.fitnessAmount : 0)
        );
        const savingsTotal = (
          (profile.hasPet ? profile.petAmount : 0) +
          (profile.hasLoan ? profile.loanAmount : 0) +
          (profile.hasSavings ? profile.savingsAmount : 0)
        );
        const customTotal = profile.customExpenses.reduce((s, ce) => s + frequencyToMonthly(ce.amount, ce.frequency || "monthly"), 0);

        const addCustom = () => {
          if (customLabel.trim() && customAmount > 0) {
            update({ customExpenses: [...profile.customExpenses, { label: customLabel.trim(), amount: customAmount, frequency: customFreq }] });
            setCustomLabel(""); setCustomAmount(0); setCustomFreq("monthly");
          }
        };
        const unit = t("unit.krMonth");

        return (
          <div className="space-y-6 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                className="text-xs font-medium text-primary">{t("onboarding.encourage.fixed")}</motion.p>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">{t("step.fixed.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("step.fixed.subtitle")}</p>
            </motion.div>

            {/* Smart defaults info banner */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 rounded-2xl bg-primary/[0.04] border border-primary/10 px-4 py-3">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{t("step.fixed.smartDefaults")}</p>
            </motion.div>

            <div className="space-y-3">
              {/* ── Streaming ── */}
              <AccordionCategory icon="🎬" label={t("step.expenses.streaming")} total={streamingTotal} unit={unit}>
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
              </AccordionCategory>

              {/* ── Transport ── */}
              <AccordionCategory icon="🚗" label={t("step.expenses.transport")} total={carMonthly} unit={unit}>
                <ToggleRow active={profile.hasCar} onClick={() => update({ hasCar: !profile.hasCar })}
                  icon="🚗" label={t("step.expenses.car")}
                  sublabel={profile.hasCar ? `≈ ${formatKr(carMonthly)} ${t("perMonth")}` : undefined} />
                {profile.hasCar && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-2 space-y-2">
                    <CompactSlider icon="💳" label={t("step.expenses.carLoan")} value={profile.carLoan} onChange={(v) => update({ carLoan: v })} min={0} max={10000} step={100} unit={t("unit.krMonth")} />
                    <CompactSlider icon="⛽" label={t("step.expenses.fuel")} value={profile.carFuel} onChange={(v) => update({ carFuel: v })} min={0} max={5000} step={100} unit={t("unit.krMonth")} />
                    <CompactSlider icon="🛡️" label={t("step.expenses.carInsurance")} value={profile.carInsurance} onChange={(v) => update({ carInsurance: v })} min={0} max={12000} step={100} unit={t("unit.krYear")} />
                    <CompactSlider icon="📋" label={t("step.expenses.carTax")} value={profile.carTax} onChange={(v) => update({ carTax: v })} min={0} max={8000} step={100} unit={t("unit.krYear")} />
                    <CompactSlider icon="🔧" label={t("step.expenses.carService")} value={profile.carService} onChange={(v) => update({ carService: v })} min={0} max={5000} step={100} unit={t("unit.krHalfYear")} />
                  </motion.div>
                )}
              </AccordionCategory>

              {/* ── Forsyninger (open by default — has pre-filled values) ── */}
              <AccordionCategory icon="📡" label={t("step.expenses.utilities")} total={utilitiesTotal} unit={unit} defaultOpen>
                <CompactSlider icon="📡" label={isNO ? "Internett" : t("step.expenses.internet")}
                  value={profile.internetAmount ?? (isNO ? NO_UTILITIES.internet.price : UTILITIES.internet.price)}
                  onChange={(v) => update({ internetAmount: v })} min={0} max={600} step={10} unit={t("unit.krMonth")} />
                <CompactSlider icon="📱" label={isPar ? t("step.expenses.mobilePar") : t("step.expenses.mobileSolo")}
                  value={profile.mobileAmount ?? (isNO ? NO_UTILITIES : UTILITIES).mobile.price_per_person * (isPar ? 2 : 1)}
                  onChange={(v) => update({ mobileAmount: v })} min={0} max={isPar ? 800 : 400} step={10} unit={t("unit.krMonth")} />
                <CompactSlider icon="⚡" label={isNO ? "Strøm" : t("step.expenses.electricity")}
                  value={profile.electricityAmount ?? (isPar ? (isNO ? NO_UTILITIES : UTILITIES).electricity.price_par : (isNO ? NO_UTILITIES : UTILITIES).electricity.price_solo)}
                  onChange={(v) => update({ electricityAmount: v })} min={0} max={2000} step={25} unit={t("unit.krMonth")} />
                <CompactSlider icon="🔥" label={isNO ? "Oppvarming/vann" : t("step.expenses.heating")}
                  value={profile.heatingAmount ?? (isPar ? (isNO ? NO_UTILITIES : UTILITIES).heating.price_par : (isNO ? NO_UTILITIES : UTILITIES).heating.price_solo)}
                  onChange={(v) => update({ heatingAmount: v })} min={0} max={2000} step={25} unit={t("unit.krMonth")} />
                {!isNO && (
                  <CompactSlider icon="📺" label={t("step.expenses.drLicens")}
                    value={profile.drAmount ?? UTILITIES.dr_licens.price}
                    onChange={(v) => update({ drAmount: v })} min={0} max={300} step={5} unit={t("unit.krMonth")} />
                )}
              </AccordionCategory>

              {/* ── Forsikring & fagforening ── */}
              <AccordionCategory icon="🛡️" label={t("step.expenses.insuranceUnion")} total={insuranceTotal} unit={unit}>
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
              </AccordionCategory>

              {/* ── Opsparing & lån ── */}
              <AccordionCategory icon="💰" label={t("step.expenses.petsLoans")} total={savingsTotal} unit={unit}>
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
              </AccordionCategory>

              {/* ── Egne udgifter ── */}
              <AccordionCategory icon="📝" label={t("step.expenses.custom")} total={customTotal} unit={unit}>
                {profile.customExpenses.map((ce, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-primary/15 bg-primary/[0.02] px-4 py-2.5 mb-1.5">
                    <div>
                      <span className="text-sm font-medium">{ce.label}</span>
                      {ce.frequency && ce.frequency !== "monthly" && <span className="text-[11px] text-muted-foreground ml-1">({frequencyLabel(ce.frequency)})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatKr(frequencyToMonthly(ce.amount, ce.frequency || "monthly"))} {t("perMonth")}</span>
                      <button onClick={() => update({ customExpenses: profile.customExpenses.filter((_, idx) => idx !== i) })}
                        className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground tap-bounce shrink-0"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder={t("step.expenses.customPlaceholder")}
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30" />
                  <input type="number" inputMode="numeric" min={0} value={customAmount || ""} onChange={(e) => setCustomAmount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder={t("currency")} className="w-20 bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none no-spin placeholder:text-muted-foreground/30" />
                  <select value={customFreq} onChange={(e) => setCustomFreq(e.target.value as PaymentFrequency)}
                    className="bg-background border border-border rounded-xl px-1.5 py-2.5 text-xs focus:outline-none">
                    <option value="monthly">{t("freq.monthlyShort")}</option>
                    <option value="quarterly">{t("freq.quarterShort")}</option>
                    <option value="biannual">{t("freq.halfYearShort")}</option>
                    <option value="annual">{t("freq.yearShort")}</option>
                  </select>
                  <button onClick={addCustom} disabled={!customLabel.trim() || customAmount <= 0}
                    className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center disabled:opacity-20"><Plus className="w-4 h-4" /></button>
                </div>
              </AccordionCategory>
            </div>

            <AILiveComment profile={profile} step="fixed" />
            <ContinueButton onClick={goNext} label={t("continue")} />
          </div>
        );
      }

      case "review": {
        const budget = computeBudget(profile, null, locale);
        const expenseRatio = budget.totalIncome > 0 ? Math.round((budget.totalExpenses / budget.totalIncome) * 100) : 0;
        const isHealthy = budget.disposableIncome > 8000;
        const isWarning = budget.disposableIncome > 3000;
        return (
          <div className="space-y-6 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-1">
              <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                className="text-xs font-medium text-primary">{t("onboarding.encourage.review")}</motion.p>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">{t("step.review.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("step.review.subtitle")}</p>
            </motion.div>

            {/* ── Stort resultat ── */}
            <motion.div initial={{ opacity: 0, scale: 0.88, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="text-center py-12 rounded-3xl border-2 border-border relative overflow-hidden">
              <div className={`absolute inset-0 opacity-[0.04] ${isHealthy ? "bg-primary" : isWarning ? "bg-nemt-gold" : "bg-destructive"}`} />
              <motion.div
                className={`absolute inset-0 opacity-0 ${isHealthy ? "bg-primary" : isWarning ? "bg-nemt-gold" : "bg-destructive"}`}
                animate={{ opacity: [0, 0.06, 0] }}
                transition={{ duration: 1.5, delay: 0.3 }}
              />
              <div className="relative">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3"
                >{t("step.review.disposable")}</motion.p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-baseline justify-center gap-1"
                >
                  <CountUpNumber
                    value={budget.disposableIncome}
                    className={`font-display font-black text-5xl sm:text-6xl ${isHealthy ? "text-primary" : isWarning ? "text-nemt-gold" : "text-destructive"}`}
                  />
                  <span className="text-muted-foreground font-display text-xl">{t("currency")}</span>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-sm text-muted-foreground mt-3"
                >
                  {isHealthy ? `✅ ${t("step.review.good")}` : isWarning ? `⚠️ ${t("step.review.tight")}` : `🚨 ${t("step.review.warning")}`}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-xs text-muted-foreground/60 mt-2"
                >{t("onboarding.perMonthAfterExpenses")}</motion.p>
              </div>
            </motion.div>

            {/* ── 3 nøgletal ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: t("step.review.income"), value: `${formatKr(budget.totalIncome)} ${t("unit.currency")}`, color: "text-primary" },
                { label: t("step.review.expenses"), value: `${formatKr(budget.totalExpenses)} ${t("unit.currency")}`, color: "text-foreground" },
                { label: t("onboarding.expenseShare"), value: `${expenseRatio}%`, color: expenseRatio > 85 ? "text-destructive" : "text-muted-foreground" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl border border-border p-3 text-center"
                >
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`font-display font-bold text-sm tabular-nums ${s.color}`}>{s.value}</p>
                </motion.div>
              ))}
            </div>

            {/* ── Udgiftsoversigt (read-only, sammenfoldelig) ── */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer rounded-2xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors list-none">
                <span className="flex items-center gap-2"><Info className="w-3.5 h-3.5" />{t("step.review.fixedExpenses")}</span>
                <span className="text-xs tabular-nums">{formatKr(budget.fixedExpenses.reduce((s, e) => s + e.amount, 0))} {t("unit.currency")} &rsaquo;</span>
              </summary>
              <div className="mt-1 rounded-2xl border border-border divide-y divide-border overflow-hidden">
                {budget.fixedExpenses.map((e, i) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{e.label}</span>
                    <span className="text-xs font-medium tabular-nums">{formatKr(e.amount)} {t("unit.currency")}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* ── Email opt-in (GDPR-compliant, unchecked by default) ── */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={!!profile.emailReminders}
                onChange={(e) => update({ emailReminders: e.target.checked })}
                className="mt-0.5 w-5 h-5 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                {t("onboarding.emailReminder")}{" "}
                <span className="text-muted-foreground/60">{t("onboarding.emailUnsubscribe")}</span>
              </span>
            </label>

            {(profile.income + profile.partnerIncome) < 1000 && (
              <div className="rounded-xl bg-amber-50 text-amber-800 border border-amber-200 p-3 text-sm">
                {t("step.review.zeroIncomeWarning")}
              </div>
            )}

            <ContinueButton onClick={() => { onComplete(profile); clearOnboardingState(); }} disabled={(profile.income + profile.partnerIncome) < 1000} label={t("step.review.seeDashboard")} />
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div id="main-content" className="h-dvh bg-background flex flex-col overflow-x-hidden">
      <CelebrationBurst trigger={celebrationTrigger} />
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-5 py-3 safe-area-top">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {getStepIndex(step) > 0 ? (
            <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-2 px-2 py-2 rounded-lg tap-bounce">
              <ChevronLeft className="w-4 h-4" /> {t("nav.back")}
            </button>
          ) : <div />}
          <StepIndicator step={step} />
          <span className="font-display font-black text-sm text-primary">{config.brandName}</span>
        </div>
      </header>
      <div ref={contentRef} className="flex-1 min-h-0 px-5 py-8 overflow-y-auto overflow-x-hidden overscroll-contain" style={{ paddingBottom: liveBudget ? "10rem" : "3rem" }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={step} custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit">
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      {liveBudget && <LiveBudgetBar income={liveBudget.totalIncome} expenses={liveBudget.totalExpenses} step={step} onNext={step === "fixed" ? goNext : undefined} />}
      <OcrConsentModal
        open={payslipOCR.showConsent}
        type="payslip"
        onAccept={payslipOCR.onConsentAccept}
        onDecline={payslipOCR.onConsentDecline}
      />
    </div>
  );
}
