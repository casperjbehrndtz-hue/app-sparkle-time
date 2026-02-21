import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { TrendingUp, AlertTriangle, TrendingDown } from "lucide-react";

interface Props { amount: number; }

export function DisposableIncome({ amount }: Props) {
  const isHealthy = amount > 8000;
  const isWarning = amount > 3000 && amount <= 8000;
  const isDanger = amount <= 3000;

  const colorClass = isHealthy ? "text-primary" : isWarning ? "text-kassen-gold" : "text-destructive";
  const bgClass = isHealthy ? "bg-primary" : isWarning ? "bg-kassen-gold" : "bg-destructive";
  const Icon = isHealthy ? TrendingUp : isWarning ? AlertTriangle : TrendingDown;
  const label = isHealthy ? "God økonomi" : isWarning ? "Slank margin" : "Under anbefaling";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border p-6 relative overflow-hidden"
    >
      <div className={`absolute inset-0 opacity-[0.03] ${bgClass}`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Rådighedsbeløb</p>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            isHealthy ? "bg-primary/10 text-primary" : isWarning ? "bg-kassen-gold/10 text-kassen-gold" : "bg-destructive/10 text-destructive"
          }`}>
            <Icon className="w-3 h-3" /> {label}
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`font-display font-black text-4xl md:text-5xl ${colorClass}`}>
            <AnimatedNumber value={amount} />
          </span>
          <span className="text-muted-foreground text-base">kr./md.</span>
        </div>
        {isDanger && (
          <p className="mt-3 text-xs text-muted-foreground">Finanstilsynet anbefaler minimum 5.000–7.000 kr./md.</p>
        )}
      </div>
    </motion.div>
  );
}
