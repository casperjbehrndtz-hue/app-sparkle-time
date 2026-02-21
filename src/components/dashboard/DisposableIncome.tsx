import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface Props {
  amount: number;
}

export function DisposableIncome({ amount }: Props) {
  const isHealthy = amount > 8000;
  const isWarning = amount > 3000 && amount <= 8000;
  const isDanger = amount <= 3000;

  const colorClass = isHealthy
    ? "text-primary"
    : isWarning
    ? "text-kassen-gold"
    : "text-destructive";

  const Icon = isHealthy ? TrendingUp : isWarning ? AlertTriangle : TrendingDown;

  const label = isHealthy
    ? "God økonomi – I har luft"
    : isWarning
    ? "Pas på – marginen er slank"
    : "Advarsel – under Finanstilsynets anbefaling";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative px-6 py-8 rounded-2xl border border-border/30 bg-card/40 overflow-hidden"
    >
      {/* Subtle glow */}
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          opacity: [0.08, 0.15, 0.08],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-0 rounded-2xl ${
          isHealthy ? "bg-primary" : isWarning ? "bg-kassen-gold" : "bg-destructive"
        }`}
        style={{ filter: "blur(60px)" }}
      />

      <div className="relative z-10">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
          Rådighedsbeløb / måneden
        </p>
        <div className="flex items-end gap-2">
          <span className={`font-display font-black text-5xl md:text-6xl ${colorClass}`}>
            <AnimatedNumber value={amount} />
          </span>
          <span className="text-muted-foreground font-display text-xl mb-1">kr.</span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Icon className={`w-4 h-4 ${colorClass}`} />
          <p className={`text-sm font-medium ${colorClass}`}>{label}</p>
        </div>
        {isDanger && (
          <p className="mt-2 text-xs text-muted-foreground/70">
            Finanstilsynet anbefaler minimum 5.000–7.000 kr./md. efter alle udgifter.
          </p>
        )}
      </div>
    </motion.div>
  );
}
