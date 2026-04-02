import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { formatKr } from "@/lib/budgetCalculator";
import type { OnboardingStep } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

// Haptic feedback helper (mobile only, silent fail)
function haptic(style: "light" | "medium" = "light") {
  try { navigator?.vibrate?.(style === "light" ? 8 : 15); } catch {}
}

// ─── Cinematic transitions ────────────────────────────────
export const pageVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? 60 : -60,
    scale: 0.96,
  }),
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? -40 : 40,
    scale: 0.98,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export const STEPS: OnboardingStep[] = ["household", "income", "housing", "fixed", "everyday", "review"];
export function getStepIndex(step: OnboardingStep) { return STEPS.indexOf(step); }

// ─── Live Budget Bar ──────────────────────────────────────
export function LiveBudgetBar({ income, expenses, step, onNext }: { income: number; expenses: number; step: OnboardingStep; onNext?: () => void }) {
  const { t } = useI18n();
  const idx = getStepIndex(step);

  // Hide bar when mobile keyboard is open (input focused)
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const onFocus = () => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") setKeyboardOpen(true);
    };
    const onBlur = () => setKeyboardOpen(false);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => { document.removeEventListener("focusin", onFocus); document.removeEventListener("focusout", onBlur); };
  }, []);

  if (idx < 2 || keyboardOpen) return null;

  const remaining = income - expenses;
  const pct = income > 0 ? Math.max(0, Math.min(100, (remaining / income) * 100)) : 0;
  const expPct = income > 0 ? Math.min(100, (expenses / income) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border px-5 py-3 safe-area-bottom"
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">{t("onboarding.leftOver")}</span>
            <motion.span
              key={remaining}
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={`font-display font-black text-lg ${remaining > 5000 ? "text-primary" : remaining > 0 ? "text-nemt-gold" : "text-destructive"}`}
            >
              {formatKr(remaining)} {t("currency")}
            </motion.span>
          </div>
          {onNext ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { haptic("medium"); onNext(); }}
              className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-md shadow-primary/20 tap-bounce"
            >
              {t("onboarding.seeOverview")} <ArrowRight className="w-3 h-3" />
            </motion.button>
          ) : (
            <span className="text-[11px] text-muted-foreground tabular-nums">{Math.round(pct)}% {t("onboarding.ofIncome")}</span>
          )}
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
          <motion.div
            className="h-full bg-destructive/60 rounded-l-full"
            animate={{ width: `${expPct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className={`h-full rounded-r-full ${remaining > 5000 ? "bg-primary" : remaining > 0 ? "bg-nemt-gold" : "bg-destructive"}`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Step number indicator ────────────────────────────────
export function StepIndicator({ step }: { step: OnboardingStep }) {
  const { t } = useI18n();
  const idx = getStepIndex(step);
  if (idx < 0) return null;
  const totalSteps = STEPS.length;
  const pct = Math.round(((idx + 1) / totalSteps) * 100);
  return (
    <div className="flex flex-col items-center gap-1.5" aria-label={t("onboarding.stepOf").replace("{current}", String(idx + 1)).replace("{total}", String(totalSteps))}>
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <motion.div
            key={s}
            className={`h-1.5 rounded-full ${
              i < idx ? "bg-primary" : i === idx ? "bg-primary" : "bg-border"
            }`}
            initial={false}
            animate={{
              width: i === idx ? 28 : i < idx ? 16 : 8,
              opacity: i <= idx ? 1 : 0.4,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.span
          key={step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-[11px] text-muted-foreground"
        >
          {pct}% — {t("onboarding.stepOf").replace("{current}", String(idx + 1)).replace("{total}", String(totalSteps))}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ─── Cinematic option card ────────────────────────────────
export function BigChoice({ active, onClick, icon, label, sub }: {
  active: boolean; onClick: () => void; icon: string; label: string; sub?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { haptic(); onClick(); }}
      role="radio"
      aria-checked={active}
      aria-label={label}
      className={`relative p-4 sm:p-6 rounded-2xl border-2 text-center transition-all duration-300 tap-bounce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        active
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border hover:border-primary/30 hover:shadow-md"
      }`}
    >
      <motion.div
        animate={{ scale: active ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="mb-3 flex items-center justify-center"
      >
        <CategoryIcon name={icon} className={`w-10 h-10 sm:w-12 sm:h-12 ${active ? "text-primary" : "text-muted-foreground"} transition-colors`} />
      </motion.div>
      <div className="font-display font-bold text-base sm:text-lg leading-tight break-words hyphens-auto">{label}</div>
      {sub && <div className="text-sm text-muted-foreground mt-1">{sub}</div>}
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="bigcheck"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Stepper with big number + presets ─────────────────────
export function BigSlider({ value, onChange, label, min = 0, max = 100000, step = 500, suffix, presets }: {
  value: number; onChange: (v: number) => void; label: string; min?: number; max?: number; step?: number; suffix?: string; presets?: number[];
}) {
  const { t } = useI18n();
  const resolvedSuffix = suffix ?? t("currency");
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

  const nudge = (dir: 1 | -1) => {
    haptic();
    const bigStep = step * 2;
    onChange(Math.max(min, Math.min(max, value + dir * bigStep)));
  };

  const defaultPresets = presets ?? [
    Math.round(max * 0.15 / step) * step,
    Math.round(max * 0.3 / step) * step,
    Math.round(max * 0.5 / step) * step,
    Math.round(max * 0.7 / step) * step,
  ].filter(p => p > min && p <= max);

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center justify-center gap-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => nudge(-1)}
          disabled={value <= min}
          className="w-12 h-12 rounded-xl bg-muted/60 hover:bg-muted active:bg-primary/10 border border-border/40 flex items-center justify-center text-xl font-bold text-muted-foreground disabled:opacity-30 transition-all select-none tap-bounce"
        >−</motion.button>
        <div className="flex items-baseline gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            style={{ width: `${Math.max(3, String(localValue).length + 1)}ch` }}
            className="bg-transparent font-display font-black text-4xl sm:text-5xl text-center focus:outline-none no-spin text-foreground"
          />
          <span className="text-lg text-muted-foreground font-display">{resolvedSuffix}</span>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => nudge(1)}
          disabled={value >= max}
          className="w-12 h-12 rounded-xl bg-muted/60 hover:bg-muted active:bg-primary/10 border border-border/40 flex items-center justify-center text-xl font-bold text-muted-foreground disabled:opacity-30 transition-all select-none tap-bounce"
        >+</motion.button>
      </div>
      {/* Slider */}
      <div className="px-1 py-2">
        <input
          type="range" min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 appearance-none rounded-full cursor-pointer"
          style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${((value - min) / (max - min)) * 100}%, hsl(var(--secondary)) ${((value - min) / (max - min)) * 100}%)` }}
          aria-label={label}
        />
        <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
          <span>{formatKr(min)}</span>
          <span>{formatKr(max)}</span>
        </div>
      </div>
      {/* Preset chips */}
      <div className="flex justify-center gap-2 flex-wrap">
        {defaultPresets.map(p => (
          <motion.button
            key={p}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => { haptic(); onChange(p); }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all tap-bounce ${value === p
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/40 hover:border-primary/20"
            }`}
          >{formatKr(p)}</motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────
export function ToggleRow({ active, onClick, icon, label, sublabel, amount, onAmountChange }: {
  active: boolean; onClick: () => void; icon: string; label: string; sublabel?: string;
  amount?: number; onAmountChange?: (v: number) => void;
}) {
  const { t } = useI18n();
  return (
    <motion.div
      layout
      className={`rounded-2xl border-2 transition-colors duration-200 ${active ? "border-primary/40 bg-primary/[0.03] shadow-sm" : "border-border hover:border-primary/15"}`}
    >
      <button onClick={() => { haptic(); onClick(); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left tap-bounce">
        <motion.span
          animate={{ scale: active ? 1.15 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="text-xl flex items-center justify-center w-6 h-6"
        ><CategoryIcon name={icon} className="w-5 h-5 text-muted-foreground" /></motion.span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-[14px] block">{label}</span>
          {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        </div>
        <motion.div
          animate={{
            scale: active ? 1 : 0.9,
            borderColor: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.25)",
            backgroundColor: active ? "hsl(var(--primary))" : "transparent",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center"
        >
          <AnimatePresence>
            {active && (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 45 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </button>
      <AnimatePresence>
        {active && onAmountChange && amount !== undefined && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="px-4 pb-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
              <input type="number" inputMode="numeric" value={amount} onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
                aria-label={label}
                className="flex-1 bg-transparent text-sm font-semibold focus:outline-none no-spin w-24 min-h-[44px]" />
              <span className="text-xs text-muted-foreground">{t("unit.krMonth")}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Continue button ──────────────────────────────────────
export function ContinueButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label?: string }) {
  const { t: tFn } = useI18n();
  const resolvedLabel = label ?? tFn("continue");
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => { haptic("medium"); onClick(); }}
      disabled={disabled}
      className="w-full mt-8 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {resolvedLabel}
      <ArrowRight className="w-4 h-4" />
    </motion.button>
  );
}
