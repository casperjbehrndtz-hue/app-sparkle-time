import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ArrowDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatKr } from "@/lib/budgetCalculator";
import type { OnboardingStep } from "@/lib/types";

// ─── Cinematic transitions ────────────────────────────────
export const pageVariants = {
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
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? -40 : 40,
    scale: 0.98,
    filter: "blur(2px)",
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export const STEPS: OnboardingStep[] = ["welcome", "household", "income", "housing", "children", "expenses", "review"];
export function getStepIndex(step: OnboardingStep) { return STEPS.indexOf(step); }

// ─── Live Budget Bar ──────────────────────────────────────
export function LiveBudgetBar({ income, expenses, step }: { income: number; expenses: number; step: OnboardingStep }) {
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
export function StepIndicator({ step }: { step: OnboardingStep }) {
  const idx = getStepIndex(step);
  if (idx <= 0) return null;
  const totalSteps = STEPS.length - 1; // exclude welcome
  return (
    <div className="flex flex-col items-center gap-1.5" aria-label={`Trin ${idx} af ${totalSteps}`}>
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
      <span className="text-[10px] text-muted-foreground/60 tabular-nums">{idx}/{totalSteps}</span>
    </div>
  );
}

// ─── Cinematic option card ────────────────────────────────
export function BigChoice({ active, onClick, icon, label, sub }: {
  active: boolean; onClick: () => void; icon: string; label: string; sub?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      role="radio"
      aria-checked={active}
      aria-label={label}
      className={`relative p-6 sm:p-8 rounded-2xl border-2 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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
export function BigSlider({ value, onChange, label, min = 0, max = 100000, step = 500, suffix = "kr." }: {
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
          style={{ width: `${Math.max(3, String(localValue).length + 1)}ch` }}
          className="bg-transparent font-display font-black text-4xl sm:text-5xl text-center focus:outline-none no-spin text-foreground"
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

// ─── Toggle row ───────────────────────────────────────────
export function ToggleRow({ active, onClick, icon, label, sublabel, amount, onAmountChange }: {
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

// ─── Continue button ──────────────────────────────────────
export function ContinueButton({ onClick, disabled, label = "Fortsæt" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-8 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {label} <ArrowRight className="w-4 h-4" />
    </motion.button>
  );
}
