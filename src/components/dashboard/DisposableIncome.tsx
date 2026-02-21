import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { Shield, TrendingUp, Wallet, Activity } from "lucide-react";
import type { HealthMetrics } from "@/lib/healthScore";
import { formatKr } from "@/lib/budgetCalculator";

interface Props {
  health: HealthMetrics;
}

export function DisposableIncome({ health }: Props) {
  const { score, label, color, truths } = health;

  // Score ring
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const ringColor = score >= 75 ? "#1e40af" : score >= 55 ? "#d97706" : "#dc2626";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {/* Health Score + 3 Truths */}
      <div className="rounded-2xl border border-border p-5 relative overflow-hidden">
        <div className="flex items-center gap-5">
          {/* Score ring */}
          <div className="relative flex-shrink-0">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={radius} fill="none" stroke="hsl(150, 8%, 91%)" strokeWidth="6" />
              <motion.circle
                cx="48" cy="48" r={radius}
                fill="none" stroke={ringColor} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                transform="rotate(-90 48 48)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-display font-black text-2xl ${color}`}>{score}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
          </div>

          {/* 3 Truths */}
          <div className="flex-1 space-y-2.5">
            <TruthRow
              icon={<Wallet className="w-3.5 h-3.5" />}
              label="Frihedstal"
              value={`${formatKr(truths.freeCashFlow)} kr.`}
              sub="Reelt til overs pr. md."
              positive={truths.freeCashFlow > 5000}
            />
            <TruthRow
              icon={<Activity className="w-3.5 h-3.5" />}
              label="Baseline"
              value={`${formatKr(truths.monthlyBaseline)} kr.`}
              sub="Faste udgifter pr. md."
              positive={true}
            />
            <TruthRow
              icon={<Shield className="w-3.5 h-3.5" />}
              label="Buffer"
              value={truths.bufferScore}
              sub={`~${health.bufferMonths} md. uden indkomst`}
              positive={health.bufferMonths >= 3}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TruthRow({ icon, label, value, sub, positive }: {
  icon: React.ReactNode; label: string; value: string; sub: string; positive: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
        positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className={`font-display font-bold text-xs ${positive ? "text-foreground" : "text-destructive"}`}>{value}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 -mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
