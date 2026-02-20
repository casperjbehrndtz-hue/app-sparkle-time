import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";

interface Props {
  amount: number;
}

export function DisposableIncome({ amount }: Props) {
  const isHealthy = amount > 8000;
  const isWarning = amount > 3000 && amount <= 8000;
  const isDanger = amount <= 3000;

  const colorClass = isHealthy
    ? "text-kassen-green"
    : isWarning
    ? "text-kassen-gold"
    : "text-kassen-red";

  const label = isHealthy
    ? "God økonomi – I har luft 🎉"
    : isWarning
    ? "Pas på – marginen er slank"
    : "Advarsel – under Finanstilsynets anbefaling";

  return (
    <div className="relative px-6 py-8 rounded-2xl glass-card overflow-hidden">
      {/* Pulse glow */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-0 rounded-2xl ${
          isHealthy ? "bg-kassen-green" : isWarning ? "bg-kassen-gold" : "bg-kassen-red"
        }`}
        style={{ filter: "blur(40px)" }}
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
        <p className={`mt-3 text-sm font-medium ${colorClass}`}>{label}</p>
        {isDanger && (
          <p className="mt-1 text-xs text-kassen-red/70">
            Finanstilsynet anbefaler minimum 5.000–7.000 kr./md. efter alle udgifter.
          </p>
        )}
      </div>
    </div>
  );
}
