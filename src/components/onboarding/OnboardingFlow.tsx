import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, X, Check, ArrowRight, Shield, TrendingUp, PiggyBank, Clock } from "lucide-react";
import { computeBudget, formatKr } from "@/lib/budgetCalculator";
import {
  SUBSCRIPTIONS,
  TRANSPORT,
  INSURANCE,
  UNION,
  FITNESS,
  getMortgageEstimate,
  getRentEstimate,
} from "@/data/priceDatabase";
import type { BudgetProfile, OnboardingStep, CustomExpense } from "@/lib/types";

interface Props {
  onComplete: (profile: BudgetProfile) => void;
}

const STEPS: OnboardingStep[] = ["welcome", "household", "income", "housing", "children", "expenses", "review"];

function getStepIndex(step: OnboardingStep) {
  return STEPS.indexOf(step);
}

const defaultProfile: BudgetProfile = {
  householdType: "solo",
  income: 30000,
  partnerIncome: 0,
  postalCode: "",
  housingType: "lejer",
  hasMortgage: false,
  rentAmount: 0,
  mortgageAmount: 0,
  hasChildren: false,
  childrenAges: [],
  hasNetflix: false,
  hasSpotify: false,
  hasHBO: false,
  hasViaplay: false,
  hasAppleTV: false,
  hasDisney: false,
  hasAmazonPrime: false,
  hasCar: false,
  carAmount: TRANSPORT.car.price,
  hasInternet: true,
  hasInsurance: false,
  insuranceAmount: INSURANCE.solo.price,
  hasUnion: false,
  unionAmount: UNION.default.price,
  hasFitness: false,
  fitnessAmount: FITNESS.default.price,
  customExpenses: [],
};

// ─── Reusable sub-components ───────────────────────────────

function ProgressBar({ step }: { step: OnboardingStep }) {
  const idx = getStepIndex(step);
  const total = STEPS.length - 1;
  if (idx <= 0) return null;
  const pct = (idx / total) * 100;
  return (
    <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

function StepShell({
  step,
  title,
  subtitle,
  onBack,
  children,
}: {
  step: OnboardingStep;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/30 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {onBack ? (
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Tilbage
            </button>
          ) : <div />}
          <span className="font-display font-black text-lg gradient-text-green">Kassen</span>
        </div>
        <div className="max-w-xl mx-auto"><ProgressBar step={step} /></div>
      </div>

      <div className="flex-1 px-4 py-8 max-w-xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-display font-bold text-2xl md:text-3xl mb-1">{title}</h2>
            {subtitle && <p className="text-muted-foreground text-sm mb-6">{subtitle}</p>}
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
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-8 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
    >
      {label} <ArrowRight className="w-5 h-5" />
    </motion.button>
  );
}

function ToggleCard({
  active,
  onClick,
  icon,
  label,
  sublabel,
  amount,
  onAmountChange,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  sublabel?: string;
  amount?: number;
  onAmountChange?: (v: number) => void;
}) {
  return (
    <div
      className={`relative rounded-2xl border transition-all duration-200 ${
        active
          ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
          : "border-border/40 bg-card/30 hover:border-border/80 hover:bg-card/50"
      }`}
    >
      <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm block">{label}</span>
          {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          active ? "border-primary bg-primary" : "border-muted-foreground/30"
        }`}>
          {active && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>
      </button>
      {active && onAmountChange && amount !== undefined && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="px-4 pb-3 overflow-hidden"
        >
          <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
              className="flex-1 bg-transparent text-sm font-semibold focus:outline-none w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-muted-foreground">kr./md.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function AmountInput({
  value,
  onChange,
  label,
  min = 0,
  max = 100000,
  step = 500,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1 bg-card border border-border/60 rounded-xl px-3 py-1.5">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
            className="bg-transparent font-display font-bold text-lg w-24 text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-sm text-muted-foreground ml-1">kr.</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 appearance-none bg-muted/50 rounded-full cursor-pointer accent-primary"
        style={{ accentColor: "hsl(var(--primary))" }}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{formatKr(min)}</span>
        <span>{formatKr(max)} kr.</span>
      </div>
    </div>
  );
}

// ─── Insight card for welcome ──────────────────────────────

function InsightCard({
  emoji,
  category,
  badge,
  badgeColor,
  headline,
  description,
  stat,
  statLabel,
  delay,
}: {
  emoji: string;
  category: string;
  badge: string;
  badgeColor: "destructive" | "kassen-gold" | "primary";
  headline: string;
  description: string;
  stat: string;
  statLabel: string;
  delay: number;
}) {
  const badgeClasses = {
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    "kassen-gold": "bg-kassen-gold/10 text-kassen-gold border-kassen-gold/20",
    primary: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 hover:border-border/80 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{category}</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClasses[badgeColor]}`}>
          ⚠️ {badge}
        </span>
      </div>
      <h3 className="font-display font-bold text-base mb-2 leading-snug">{headline}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{description}</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground/70 uppercase font-semibold tracking-wider">Typisk:</span>
        <span className="text-xs font-bold text-foreground bg-muted/50 px-2 py-0.5 rounded-md">{stat}</span>
        <span className="text-[10px] text-muted-foreground">{statLabel}</span>
      </div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [profile, setProfile] = useState<BudgetProfile>(defaultProfile);
  const [childAgeInputs, setChildAgeInputs] = useState<number[]>([3]);
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState(0);
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

  const goNext = () => {
    const idx = getStepIndex(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };
  const goBack = () => {
    const idx = getStepIndex(step);
    if (idx > 1) setStep(STEPS[idx - 1]);
  };

  // ─── Welcome ──────────────────────────
  if (step === "welcome") {
    return (
      <div className="min-h-screen px-4 py-12 md:py-20">
        <div className="max-w-xl mx-auto">
          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/40 bg-card/40 backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Beregnet på danske skatte- og forbrugstal</span>
            </div>
          </motion.div>

          {/* Hero headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-12"
          >
            <h1 className="font-display font-black text-4xl md:text-5xl leading-tight mb-3">
              Ved du hvad der<br />
              <span className="gradient-text-green">egentlig er tilbage?</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto leading-relaxed">
              De fleste familier har 2.000–5.000 kr. mindre til rådighed end de tror. Find dit reelle tal på under 3 minutter.
            </p>
          </motion.div>

          {/* Insight cards – Parfinans style */}
          <div className="space-y-3 mb-10">
            <InsightCard
              emoji="💰"
              category="Rådighedsbeløb"
              badge="Skjult underskud"
              badgeColor="destructive"
              headline="Har du styr på hvad der reelt er til overs?"
              description="Mange familier overvurderer deres rådighedsbeløb fordi de glemmer streamingtjenester, forsikringer og småudgifter der lurer i baggrunden."
              stat="2.000–5.000 kr./md."
              statLabel="i skjulte udgifter"
              delay={0.3}
            />
            <InsightCard
              emoji="📈"
              category="Optimering"
              badge="Uforløst potentiale"
              badgeColor="kassen-gold"
              headline="Sparer du for lidt – uden at vide det?"
              description="Familier der gennemgår deres budget systematisk sparer i gennemsnit 2.400 kr. mere om måneden ved enkle justeringer."
              stat="Op til 28.800 kr./år"
              statLabel="i sparet potentiale"
              delay={0.45}
            />
            <InsightCard
              emoji="🏡"
              category="Bolig & Lån"
              badge="Renteeksponering"
              badgeColor="primary"
              headline="Hvad sker der med dit budget hvis renten stiger?"
              description="Kassen simulerer rentechok og viser præcis hvor sårbar din økonomi er – og hvad du kan gøre ved det."
              stat="1.500–4.000 kr./md."
              statLabel="i ekstra ydelse ved 2% stigning"
              delay={0.6}
            />
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            className="text-center"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep("household")}
              className="w-full max-w-sm mx-auto py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-lg hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              Beregn dit rådighedsbeløb <ArrowRight className="w-5 h-5" />
            </motion.button>
            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground/50">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Under 3 min.</span>
              <span>·</span>
              <span>Ingen login</span>
              <span>·</span>
              <span>100% privat</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Household ────────────────────────
  if (step === "household") {
    return (
      <StepShell step={step} title="Hvem er med i husstanden?" subtitle="Vi tilpasser alle priser og estimater til jeres situation.">
        <div className="grid grid-cols-2 gap-4">
          {[
            { type: "solo" as const, emoji: "🧍", label: "Kun mig", sub: "Enlig husstand" },
            { type: "par" as const, emoji: "👫", label: "Vi er to", sub: "Par / samboende" },
          ].map((opt) => (
            <motion.button
              key={opt.type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                update({
                  householdType: opt.type,
                  partnerIncome: opt.type === "solo" ? 0 : profile.partnerIncome || 28000,
                  insuranceAmount: opt.type === "par" ? INSURANCE.par.price : INSURANCE.solo.price,
                });
                setStep("income");
              }}
              className={`p-6 rounded-2xl border transition-all text-center ${
                profile.householdType === opt.type
                  ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
                  : "border-border/40 bg-card/30 hover:border-primary/20"
              }`}
            >
              <div className="text-4xl mb-3">{opt.emoji}</div>
              <div className="font-display font-bold text-lg">{opt.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{opt.sub}</div>
            </motion.button>
          ))}
        </div>
      </StepShell>
    );
  }

  // ─── Income ───────────────────────────
  if (step === "income") {
    return (
      <StepShell step={step} title="Hvad er jeres indkomst?" subtitle="Månedlig indkomst efter skat (udbetalt)." onBack={goBack}>
        <div className="space-y-8">
          <AmountInput
            value={profile.income}
            onChange={(v) => update({ income: v })}
            label={isPar ? "Din indkomst" : "Månedlig indkomst"}
            min={10000}
            max={80000}
            step={500}
          />
          {isPar && (
            <AmountInput
              value={profile.partnerIncome}
              onChange={(v) => update({ partnerIncome: v })}
              label="Partners indkomst"
              min={0}
              max={80000}
              step={500}
            />
          )}

          <div className="rounded-2xl bg-card/60 border border-border/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Samlet månedlig indkomst</span>
              <span className="font-display font-bold text-xl text-primary">
                {formatKr(profile.income + (isPar ? profile.partnerIncome : 0))} kr.
              </span>
            </div>
          </div>

          <ContinueButton onClick={goNext} disabled={profile.income < 1000} />
        </div>
      </StepShell>
    );
  }

  // ─── Housing ──────────────────────────
  if (step === "housing") {
    const handlePostalChange = (val: string) => {
      const clean = val.replace(/\D/g, "").slice(0, 4);
      update({ postalCode: clean });
      if (clean.length === 4) {
        if (profile.housingType === "ejer") {
          update({ postalCode: clean, mortgageAmount: getMortgageEstimate(clean) });
        } else {
          update({ postalCode: clean, rentAmount: getRentEstimate(clean, isPar) });
        }
      }
    };

    return (
      <StepShell step={step} title="Boligsituation" subtitle="Vi estimerer boligudgiften – du kan altid justere." onBack={goBack}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: "lejer" as const, emoji: "🏢", label: "Lejer" },
              { type: "ejer" as const, emoji: "🏡", label: "Ejer" },
            ].map((opt) => (
              <button
                key={opt.type}
                onClick={() => {
                  update({ housingType: opt.type, hasMortgage: opt.type === "ejer" });
                  if (profile.postalCode.length === 4) {
                    if (opt.type === "ejer") {
                      update({ housingType: opt.type, hasMortgage: true, mortgageAmount: getMortgageEstimate(profile.postalCode) });
                    } else {
                      update({ housingType: opt.type, hasMortgage: false, rentAmount: getRentEstimate(profile.postalCode, isPar) });
                    }
                  }
                }}
                className={`p-4 rounded-2xl border transition-all text-center ${
                  profile.housingType === opt.type
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/40 bg-card/30"
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="font-semibold text-sm block mt-1">{opt.label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-2">Postnummer</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={profile.postalCode}
              onChange={(e) => handlePostalChange(e.target.value)}
              placeholder="F.eks. 8000"
              className="w-full bg-card/60 border border-border/40 rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
            />
          </div>

          {profile.housingType === "lejer" && (
            <AmountInput
              value={profile.rentAmount}
              onChange={(v) => update({ rentAmount: v })}
              label="Månedlig husleje"
              min={2000}
              max={25000}
              step={250}
            />
          )}
          {profile.housingType === "ejer" && (
            <AmountInput
              value={profile.mortgageAmount}
              onChange={(v) => update({ mortgageAmount: v })}
              label="Månedlig boligydelse (lån + bidrag)"
              min={2000}
              max={30000}
              step={250}
            />
          )}

          <ContinueButton onClick={goNext} />
        </div>
      </StepShell>
    );
  }

  // ─── Children ─────────────────────────
  if (step === "children") {
    return (
      <StepShell step={step} title="Har I børn?" subtitle="Vi finder institutions- og pasningspriser automatisk." onBack={goBack}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                update({ hasChildren: false, childrenAges: [] });
                setChildAgeInputs([]);
              }}
              className={`p-5 rounded-2xl border text-center transition-all ${
                !profile.hasChildren ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card/30"
              }`}
            >
              <span className="font-display font-bold">Ingen børn</span>
            </button>
            <button
              onClick={() => {
                update({ hasChildren: true });
                if (childAgeInputs.length === 0) setChildAgeInputs([3]);
              }}
              className={`p-5 rounded-2xl border text-center transition-all ${
                profile.hasChildren ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card/30"
              }`}
            >
              <span className="font-display font-bold">Ja, vi har børn</span>
            </button>
          </div>

          {profile.hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">Angiv alder for hvert barn:</p>
              {childAgeInputs.map((age, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-16">Barn {i + 1}</span>
                  <select
                    value={age}
                    onChange={(e) => {
                      const newAges = [...childAgeInputs];
                      newAges[i] = Number(e.target.value);
                      setChildAgeInputs(newAges);
                      update({ childrenAges: newAges });
                    }}
                    className="flex-1 bg-card/60 border border-border/40 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary/40 transition-all"
                  >
                    {Array.from({ length: 18 }, (_, j) => (
                      <option key={j} value={j}>{j} år</option>
                    ))}
                  </select>
                  {childAgeInputs.length > 1 && (
                    <button
                      onClick={() => {
                        const newAges = childAgeInputs.filter((_, idx) => idx !== i);
                        setChildAgeInputs(newAges);
                        update({ childrenAges: newAges });
                      }}
                      className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {childAgeInputs.length < 5 && (
                <button
                  onClick={() => {
                    const newAges = [...childAgeInputs, 3];
                    setChildAgeInputs(newAges);
                    update({ childrenAges: newAges });
                  }}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Tilføj barn
                </button>
              )}
            </motion.div>
          )}

          <ContinueButton onClick={() => {
            if (profile.hasChildren) {
              update({ childrenAges: childAgeInputs });
            }
            goNext();
          }} />
        </div>
      </StepShell>
    );
  }

  // ─── Expenses ─────────────────────────
  if (step === "expenses") {
    const addCustomExpense = () => {
      if (customLabel.trim() && customAmount > 0) {
        const newCustom = [...profile.customExpenses, { label: customLabel.trim(), amount: customAmount }];
        update({ customExpenses: newCustom });
        setCustomLabel("");
        setCustomAmount(0);
      }
    };

    return (
      <StepShell step={step} title="Faste udgifter & abonnementer" subtitle="Vælg det der passer – vi præudfylder priserne. Justér frit." onBack={goBack}>
        <div className="space-y-6">
          {/* Streaming */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Streaming & musik</h3>
            <div className="space-y-2">
              {[
                { key: "hasNetflix" as const, icon: "🎬", label: "Netflix", amount: SUBSCRIPTIONS.netflix.price },
                { key: "hasSpotify" as const, icon: "🎵", label: "Spotify", amount: isPar ? SUBSCRIPTIONS.spotify.price_par : SUBSCRIPTIONS.spotify.price_solo },
                { key: "hasHBO" as const, icon: "🎭", label: "HBO Max", amount: SUBSCRIPTIONS.hbo.price },
                { key: "hasViaplay" as const, icon: "⚽", label: "Viaplay", amount: SUBSCRIPTIONS.viaplay.price },
                { key: "hasDisney" as const, icon: "✨", label: "Disney+", amount: SUBSCRIPTIONS.disney.price },
                { key: "hasAppleTV" as const, icon: "🍎", label: "Apple TV+", amount: SUBSCRIPTIONS.appleTV.price },
                { key: "hasAmazonPrime" as const, icon: "📦", label: "Amazon Prime", amount: SUBSCRIPTIONS.amazonPrime.price },
              ].map((s) => (
                <ToggleCard
                  key={s.key}
                  active={!!profile[s.key]}
                  onClick={() => update({ [s.key]: !profile[s.key] } as any)}
                  icon={s.icon}
                  label={s.label}
                  sublabel={`${s.amount} kr./md.`}
                />
              ))}
            </div>
          </div>

          {/* Transport */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Transport</h3>
            <ToggleCard
              active={profile.hasCar}
              onClick={() => update({ hasCar: !profile.hasCar })}
              icon="🚗"
              label="Bil"
              sublabel="Inkl. forsikring, benzin, afgift"
              amount={profile.carAmount}
              onAmountChange={(v) => update({ carAmount: v })}
            />
          </div>

          {/* Insurance, Union, Fitness */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Forsikring, fagforening & fitness</h3>
            <div className="space-y-2">
              <ToggleCard
                active={profile.hasInsurance}
                onClick={() => update({ hasInsurance: !profile.hasInsurance })}
                icon="🛡️"
                label="Forsikringer"
                sublabel="Indbo, ulykke, etc."
                amount={profile.insuranceAmount}
                onAmountChange={(v) => update({ insuranceAmount: v })}
              />
              <ToggleCard
                active={profile.hasUnion}
                onClick={() => update({ hasUnion: !profile.hasUnion })}
                icon="🏛️"
                label="Fagforening & A-kasse"
                amount={profile.unionAmount}
                onAmountChange={(v) => update({ unionAmount: v })}
              />
              <ToggleCard
                active={profile.hasFitness}
                onClick={() => update({ hasFitness: !profile.hasFitness })}
                icon="💪"
                label="Fitness / sport"
                amount={profile.fitnessAmount}
                onAmountChange={(v) => update({ fitnessAmount: v })}
              />
            </div>
          </div>

          {/* Custom expenses */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Egne udgifter</h3>
            {profile.customExpenses.length > 0 && (
              <div className="space-y-2 mb-3">
                {profile.customExpenses.map((ce, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <span className="text-sm font-medium">{ce.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatKr(ce.amount)} kr.</span>
                      <button
                        onClick={() => {
                          const newCustom = profile.customExpenses.filter((_, idx) => idx !== i);
                          update({ customExpenses: newCustom });
                        }}
                        className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="F.eks. Børnesko, Kontaktlinser..."
                className="flex-1 bg-card/60 border border-border/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
              />
              <input
                type="number"
                value={customAmount || ""}
                onChange={(e) => setCustomAmount(Number(e.target.value) || 0)}
                placeholder="Kr."
                className="w-24 bg-card/60 border border-border/40 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary/40 transition-all placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={addCustomExpense}
                disabled={!customLabel.trim() || customAmount <= 0}
                className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center disabled:opacity-30 hover:bg-primary/20 transition-all flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live summary */}
          {liveDisposable !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/40 bg-card/60 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimeret rådighedsbeløb</span>
                <span className={`font-display font-bold text-xl ${
                  liveDisposable > 5000 ? "text-primary" : liveDisposable > 0 ? "text-kassen-gold" : "text-destructive"
                }`}>
                  {formatKr(liveDisposable)} kr.
                </span>
              </div>
            </motion.div>
          )}

          <ContinueButton onClick={goNext} label="Se overblik" />
        </div>
      </StepShell>
    );
  }

  // ─── Review ───────────────────────────
  if (step === "review") {
    const budget = computeBudget(profile);
    const allExpenses = [...budget.fixedExpenses, ...budget.variableExpenses];
    const expenseRatio = Math.round((budget.totalExpenses / budget.totalIncome) * 100);

    return (
      <StepShell step={step} title="Dit overblik" subtitle="Tjek at alt ser rigtigt ud – du kan altid ændre bagefter." onBack={goBack}>
        <div className="space-y-6">
          {/* Big number with context */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center py-8 rounded-2xl border border-border/30 bg-card/40 relative overflow-hidden"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-2xl ${
                budget.disposableIncome > 5000 ? "bg-primary" : budget.disposableIncome > 0 ? "bg-kassen-gold" : "bg-destructive"
              }`}
              style={{ filter: "blur(60px)" }}
            />
            <div className="relative z-10">
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Rådighedsbeløb pr. måned</p>
              <span className={`font-display font-black text-5xl md:text-6xl ${
                budget.disposableIncome > 5000 ? "text-primary" : budget.disposableIncome > 0 ? "text-kassen-gold" : "text-destructive"
              }`}>
                {formatKr(budget.disposableIncome)}
              </span>
              <span className="text-muted-foreground font-display text-xl ml-2">kr.</span>
              <p className="text-sm text-muted-foreground mt-3">
                {expenseRatio}% af indkomsten går til faste udgifter
              </p>
            </div>
          </motion.div>

          {/* Income vs expenses */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-card/60 border border-border/40 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Indkomst</p>
              <p className="font-display font-bold text-lg text-primary">{formatKr(budget.totalIncome)}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-card/60 border border-border/40 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Udgifter</p>
              <p className="font-display font-bold text-lg text-destructive">{formatKr(budget.totalExpenses)}</p>
            </motion.div>
          </div>

          {/* Expense flow bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-card/60 border border-border/40 p-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Udgiftsfordeling</p>
            <div className="h-3 rounded-full overflow-hidden flex bg-muted/30">
              {Object.entries(
                allExpenses.reduce((acc, e) => {
                  acc[e.category] = (acc[e.category] || 0) + e.amount;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([cat, amount], i) => (
                <div
                  key={cat}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(amount / budget.totalExpenses) * 100}%`,
                    backgroundColor: `hsl(${150 + i * 35}, 70%, 55%)`,
                  }}
                  title={`${cat}: ${formatKr(amount)} kr.`}
                />
              ))}
            </div>
          </motion.div>

          {/* Expense list */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="rounded-2xl bg-card/60 border border-border/40 p-4 space-y-2">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">Alle udgifter</p>
            {allExpenses.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                <span className="text-sm text-muted-foreground">{e.label}</span>
                <span className="text-sm font-medium">{formatKr(e.amount)} kr.</span>
              </div>
            ))}
          </motion.div>

          <ContinueButton
            onClick={() => onComplete(profile)}
            label="Se dit dashboard"
          />
        </div>
      </StepShell>
    );
  }

  return null;
}
