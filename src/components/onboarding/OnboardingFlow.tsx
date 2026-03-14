import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, X, Info, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { computeBudget, formatKr } from "@/lib/budgetCalculator";
import { useLocale } from "@/lib/locale";
import { AILiveComment } from "./AILiveComment";
import { WelcomePage } from "./WelcomePage";
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

interface Props {
  onComplete: (profile: BudgetProfile) => void;
  initialProfile?: BudgetProfile;
}

const defaultProfile: BudgetProfile = {
  householdType: "solo", income: 30000, partnerIncome: 0, additionalIncome: [], postalCode: "",
  housingType: "lejer", hasMortgage: false, rentAmount: 8500, mortgageAmount: 0, propertyValue: 0, interestRate: 4.0,
  hasChildren: false, childrenAges: [],
  hasNetflix: false, hasSpotify: false, hasHBO: false, hasViaplay: false,
  hasAppleTV: false, hasDisney: false, hasAmazonPrime: false,
  hasCar: false, carAmount: 3500, carLoan: 2500, carFuel: 1500, carInsurance: 6000, carTax: 3600, carService: 4500,
  hasInternet: true,
  hasInsurance: false, insuranceAmount: INSURANCE.solo.price,
  hasUnion: false, unionAmount: 500,
  hasFitness: false, fitnessAmount: 349,
  hasPet: false, petAmount: 800,
  hasLoan: false, loanAmount: 1500,
  hasSavings: false, savingsAmount: 3000,
  foodAmount: 3500, leisureAmount: 1500, clothingAmount: 800, healthAmount: 350, restaurantAmount: 800,
  customExpenses: [],
};

const ONBOARDING_SESSION_KEY = "kassen_onboarding_wip";

function saveOnboardingState(step: OnboardingStep, profile: BudgetProfile, childAgeInputs: number[]) {
  try {
    localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify({ step, profile, childAgeInputs }));
  } catch { /* ignore quota errors */ }
}

function loadOnboardingState(): { step: OnboardingStep; profile: BudgetProfile; childAgeInputs: number[] } | null {
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

  const [step, setStep] = useState<OnboardingStep>(
    isEditing ? "household" : restored?.step ?? "welcome"
  );
  const [direction, setDirection] = useState(1);
  const [profile, setProfile] = useState<BudgetProfile>(
    initialProfile ?? restored?.profile ?? defaultProfile
  );
  const [childAgeInputs, setChildAgeInputs] = useState<number[]>(
    initialProfile?.childrenAges?.length
      ? initialProfile.childrenAges
      : restored?.childAgeInputs ?? [3]
  );
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState(0);
  const [customFreq, setCustomFreq] = useState<PaymentFrequency>("monthly");
  const [carExpanded, setCarExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Persist onboarding state to sessionStorage on changes
  useEffect(() => {
    if (step !== "welcome") {
      saveOnboardingState(step, profile, childAgeInputs);
    }
  }, [step, profile, childAgeInputs]);

  const locale = useLocale();
  const isPar = profile.householdType === "par";
  const isNO = locale.code === "no";
  const update = useCallback((partial: Partial<BudgetProfile>) => {
    setProfile((p) => ({ ...p, ...partial }));
  }, []);

  const liveBudget = getStepIndex(step) >= 2 ? computeBudget(profile, null, locale) : null;

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
  const startOnboarding = () => { setDirection(1); setStep("household"); };

  // ─── WELCOME ─────────────────────────────
  if (step === "welcome") {
    return <WelcomePage onStart={startOnboarding} />;
  }

  // ─── STEP CONTENT RENDERER ───────────────
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
                    const childCount = profile.hasChildren ? profile.childrenAges.length : 0;
                    update({
                      householdType: opt.type,
                      partnerIncome: opt.type === "solo" ? 0 : profile.partnerIncome || 28000,
                      insuranceAmount: isPairChoice
                        ? (isNO ? NO_INSURANCE.par.price : INSURANCE.par.price)
                        : (isNO ? NO_INSURANCE.solo.price : INSURANCE.solo.price),
                      foodAmount: (isPairChoice ? (isNO ? 9000 : 6000) : (isNO ? 5500 : 3500))
                        + ((isNO ? NO_FOOD.per_child : FOOD.per_child) * childCount),
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
              <p className="text-xs text-muted-foreground/70 mt-1">💡 {t("step.income.netTip")}</p>
            </motion.div>
            <BigSlider value={profile.income} onChange={(v) => update({ income: v })}
              label={isPar ? t("step.income.myIncomePar") : t("step.income.myIncome")} min={10000} max={80000} step={500} />
            {isPar && (
              <BigSlider value={profile.partnerIncome} onChange={(v) => update({ partnerIncome: v })}
                label={t("step.income.partnerIncome")} min={0} max={80000} step={500} />
            )}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.income.otherIncome")}</h3>
              {profile.additionalIncome.map((src, i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-2 mb-2">
                  <div className="flex gap-2">
                    <input type="text" value={src.label} onChange={(e) => updateIncomeSource(i, { label: e.target.value })}
                      placeholder={t("step.income.placeholder")}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30" />
                    <button onClick={() => removeIncomeSource(i)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
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
              <button onClick={addIncomeSource} className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors">
                <Plus className="w-3.5 h-3.5" /> {t("step.income.addSource")}
              </button>
            </div>
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
          if (type === "ejer") {
            const propVal = profile.postalCode.length === 4
              ? (isNO ? noGetPropertyValueEstimate(profile.postalCode) : getPropertyValueEstimate(profile.postalCode))
              : (isNO ? 3500000 : 2500000);
            const mortVal = profile.postalCode.length === 4
              ? (isNO ? noGetMortgageEstimate(profile.postalCode) : getMortgageEstimate(profile.postalCode))
              : (isNO ? 12000 : 8500);
            update({ housingType: type, hasMortgage: true, mortgageAmount: mortVal, propertyValue: propVal, interestRate: isNO ? 5.0 : 4.0 });
          } else if (type === "andel") {
            update({ housingType: type, hasMortgage: true, mortgageAmount: profile.mortgageAmount || 3500, propertyValue: 0, interestRate: 0 });
            if (profile.postalCode.length === 4) {
              const andel = isNO ? noGetBorettslagEstimate(profile.postalCode, isPar) : getAndelEstimate(profile.postalCode, isPar);
              update({ housingType: type, hasMortgage: true, rentAmount: andel, mortgageAmount: profile.mortgageAmount || 3500 });
            }
          } else {
            update({ housingType: type, hasMortgage: false, propertyValue: 0, interestRate: 0 });
            if (profile.postalCode.length === 4) {
              const rent = isNO ? noGetRentEstimate(profile.postalCode, isPar) : getRentEstimate(profile.postalCode, isPar);
              update({ housingType: type, hasMortgage: false, rentAmount: rent });
            }
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
              {postalName && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-primary font-medium mt-2 text-center">📍 {postalName}</motion.p>}
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
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 rounded-2xl bg-primary/[0.04] border border-primary/10 px-4 py-3">
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
                {/* Show børnepenge info */}
                {childAgeInputs.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-primary/[0.04] border border-primary/10 p-4 space-y-1.5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">{t("step.children.benefitTitle")}</p>
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
        const carMonthly = profile.hasCar
          ? profile.carLoan + profile.carFuel + Math.round(profile.carInsurance / 12) + Math.round(profile.carTax / 12) + Math.round(profile.carService / 6)
          : 0;

        const CompactSlider = ({ label, value, onChange, min, max, step, icon }: {
          label: string; value: number; onChange: (v: number) => void;
          min: number; max: number; step: number; icon: string;
        }) => (
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <div className="flex items-center gap-1">
                <input type="number" value={value}
                  onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v))); }}
                  className="w-16 text-right bg-transparent text-sm font-bold focus:outline-none no-spin" />
                <span className="text-xs text-muted-foreground">kr./md.</span>
              </div>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full h-1.5 rounded-full accent-primary cursor-pointer" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{formatKr(min)}</span><span>{formatKr(max)}</span>
            </div>
          </div>
        );

        return (
          <div className="space-y-8 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">{t("step.expenses.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("step.expenses.subtitle")}</p>
              <button onClick={goNext} className="text-xs text-primary/70 hover:text-primary underline underline-offset-2 transition-colors">
                Brug standardtal og se mit resultat →
              </button>
            </motion.div>

            {/* ── Streaming ── */}
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

            {/* ── Transport (forenklet) ── */}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.expenses.transport")}</h3>
              <ToggleRow active={profile.hasCar} onClick={() => update({ hasCar: !profile.hasCar })}
                icon="🚗" label={t("step.expenses.car")}
                sublabel={profile.hasCar ? `≈ ${formatKr(carMonthly)} ${t("perMonth")}` : t("step.expenses.carLoan")} />
              {profile.hasCar && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-2 ml-2 border-l-2 border-primary/10 pl-4 space-y-1">
                  <button onClick={() => setCarExpanded(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors py-1">
                    {carExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {carExpanded ? "Skjul detaljer" : "Fordel udgifter på bil"}
                  </button>
                  {carExpanded && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
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
                </motion.div>
              )}
            </div>

            {/* ── Forsyninger (redigerbare) ── */}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("step.expenses.utilities")}</h3>
              <div className="space-y-1.5">
                {[
                  { icon: "📡", label: isNO ? "Internett" : t("step.expenses.internet"), field: "internetAmount" as const, def: isNO ? NO_UTILITIES.internet.price : UTILITIES.internet.price },
                  { icon: "📱", label: isPar ? t("step.expenses.mobilePar") : t("step.expenses.mobileSolo"), field: "mobileAmount" as const, def: (isNO ? NO_UTILITIES : UTILITIES).mobile.price_per_person * (isPar ? 2 : 1) },
                  { icon: "⚡", label: isNO ? "Strøm" : t("step.expenses.electricity"), field: "electricityAmount" as const, def: isPar ? (isNO ? NO_UTILITIES : UTILITIES).electricity.price_par : (isNO ? NO_UTILITIES : UTILITIES).electricity.price_solo },
                  { icon: "🔥", label: isNO ? "Oppvarming/vann" : t("step.expenses.heating"), field: "heatingAmount" as const, def: isPar ? (isNO ? NO_UTILITIES : UTILITIES).heating.price_par : (isNO ? NO_UTILITIES : UTILITIES).heating.price_solo },
                  ...(!isNO ? [{ icon: "📺", label: t("step.expenses.drLicens"), field: "drAmount" as const, def: UTILITIES.dr_licens.price }] : []),
                ].map((u) => (
                  <div key={u.field} className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{u.icon}</span>
                      <span className="text-sm font-medium">{u.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={profile[u.field] ?? u.def}
                        onChange={(e) => update({ [u.field]: Math.max(0, Number(e.target.value)) })}
                        className="w-20 text-right text-sm font-semibold tabular-nums bg-transparent border-b border-border focus:outline-none focus:border-primary"
                      />
                      <span className="text-xs text-muted-foreground">{t("freq.monthlyShort")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Forsikring / Fagforening / Fitness ── */}
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

            {/* ── Kæledyr / Lån / Opsparing ── */}
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

            {/* ── Hverdagsudgifter (kompakte sliders) ── */}
            <div>
              <h3 className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">Hverdagsudgifter</h3>
              <p className="text-xs text-muted-foreground mb-3">Vi har estimeret disse — ret dem hvis de ikke passer</p>
              <div className="space-y-2">
                <CompactSlider icon="🛒" label={t("step.review.food")} value={profile.foodAmount} onChange={(v) => update({ foodAmount: v })} min={1000} max={isPar ? 15000 : 8000} step={100} />
                <CompactSlider icon="🍕" label={t("step.review.restaurant")} value={profile.restaurantAmount} onChange={(v) => update({ restaurantAmount: v })} min={0} max={5000} step={100} />
                <CompactSlider icon="🎭" label={t("step.review.leisure")} value={profile.leisureAmount} onChange={(v) => update({ leisureAmount: v })} min={0} max={8000} step={100} />
                <CompactSlider icon="👕" label={t("step.review.clothing")} value={profile.clothingAmount} onChange={(v) => update({ clothingAmount: v })} min={0} max={3000} step={100} />
                <CompactSlider icon="🏥" label={t("step.review.health")} value={profile.healthAmount} onChange={(v) => update({ healthAmount: v })} min={0} max={2000} step={50} />
              </div>
            </div>

            {/* ── Egne udgifter ── */}
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
                  placeholder={t("currency")} className="w-20 bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none no-spin placeholder:text-muted-foreground/30" />
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
        const expenseRatio = Math.round((budget.totalExpenses / budget.totalIncome) * 100);
        const isHealthy = budget.disposableIncome > 8000;
        const isWarning = budget.disposableIncome > 3000;
        return (
          <div className="space-y-6 max-w-md mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-1">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground">{t("step.review.title")}</h1>
              <p className="text-muted-foreground text-sm">{t("step.review.subtitle")}</p>
            </motion.div>

            {/* ── Stort resultat ── */}
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center py-12 rounded-3xl border-2 border-border relative overflow-hidden">
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
                <p className="text-xs text-muted-foreground/60 mt-2">pr. måned efter alle udgifter</p>
              </div>
            </motion.div>

            {/* ── 3 nøgletal ── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t("step.review.income"), value: `${formatKr(budget.totalIncome)} kr.`, color: "text-primary" },
                { label: t("step.review.expenses"), value: `${formatKr(budget.totalExpenses)} kr.`, color: "text-foreground" },
                { label: "Udgiftsandel", value: `${expenseRatio}%`, color: expenseRatio > 85 ? "text-destructive" : "text-muted-foreground" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`font-display font-bold text-sm ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* ── Udgiftsoversigt (read-only, sammenfoldelig) ── */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer rounded-2xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors list-none">
                <span className="flex items-center gap-2"><Info className="w-3.5 h-3.5" />{t("step.review.fixedExpenses")}</span>
                <span className="text-xs tabular-nums">{formatKr(budget.fixedExpenses.reduce((s, e) => s + e.amount, 0))} kr. &rsaquo;</span>
              </summary>
              <div className="mt-1 rounded-2xl border border-border divide-y divide-border overflow-hidden">
                {budget.fixedExpenses.map((e, i) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{e.label}</span>
                    <span className="text-xs font-medium tabular-nums">{formatKr(e.amount)} kr.</span>
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
                className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                Ja tak, send mig en månedlig påmindelse om at opdatere mit budget.{" "}
                <span className="text-muted-foreground/60">Du kan altid afmelde dig.</span>
              </span>
            </label>

            <ContinueButton onClick={() => { clearOnboardingState(); onComplete(profile); }} label={t("step.review.seeDashboard")} />
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
      <div ref={contentRef} className="flex-1 min-h-0 px-5 py-8 overflow-y-auto overscroll-contain" style={{ paddingBottom: liveBudget ? "10rem" : "3rem" }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={step} custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit">
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      {liveBudget && <LiveBudgetBar income={liveBudget.totalIncome} expenses={liveBudget.totalExpenses} step={step} />}
    </div>
  );
}
