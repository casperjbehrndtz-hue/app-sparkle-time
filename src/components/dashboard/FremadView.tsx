import { useState } from "react";
import { motion } from "framer-motion";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import { formatKr } from "@/lib/budgetCalculator";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

interface TimelineEvent {
  year: number;
  title: string;
  description: string;
  impact: number;
  type: "advarsel" | "info" | "ros";
}

function generateEvents(profile: BudgetProfile): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const currentYear = 2026;

  profile.childrenAges.forEach((age, i) => {
    const childLabel = profile.childrenAges.length > 1 ? `Barn ${i + 1}` : "Dit barn";
    if (age < 6) {
      events.push({ year: currentYear + (6 - age), title: `${childLabel} starter i SFO`, description: "SFO-udgiften sættes til 2.100 kr./md.", impact: -2100, type: "info" });
    }
    if (age < 6 && age >= 3) {
      events.push({ year: currentYear + (6 - age), title: `${childLabel} forlader børnehave`, description: "Institutionsudgift falder 2.600 kr./md.", impact: 2600, type: "ros" });
    }
    if (age < 7) {
      events.push({ year: currentYear + (7 - age), title: `${childLabel} fylder 7 – børneydelse falder`, description: "Børneydelsen reduceres med 1.130 kr./md.", impact: -1130, type: "advarsel" });
    }
    if (age < 10) {
      events.push({ year: currentYear + (10 - age), title: `${childLabel} ud af SFO`, description: "SFO-udgift bortfalder – 2.100 kr. frigives.", impact: 2100, type: "ros" });
    }
    if (age < 18) {
      events.push({ year: currentYear + (18 - age), title: `${childLabel} fylder 18 – børneydelse stopper`, description: "Børneydelsen bortfalder helt.", impact: -940, type: "advarsel" });
    }
  });

  if (profile.housingType === "ejer" && profile.hasMortgage) {
    events.push({ year: 2028, title: "Tjek dit lån – afdragsfrihed kan udløbe", description: "Mange boliglån fra 2018-2020 har 10-årig afdragsfrihed. Tjek din låntype.", impact: -3400, type: "advarsel" });
  }

  return events.sort((a, b) => a.year - b.year);
}

const fadeUp = (delay: number) => ({
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { delay, duration: 0.4, ease: "easeOut" as const } },
});

export function FremadView({ profile, budget }: Props) {
  const [rentRate, setRentRate] = useState(5.0);
  const events = generateEvents(profile);

  const baseRate = 5.0;
  const rateDiff = rentRate - baseRate;
  const mortgageBase = budget.fixedExpenses.find((e) => e.label.includes("oliglån"))?.amount ?? 0;
  const rentImpact = mortgageBase > 0 ? Math.round((rateDiff * 0.005) * mortgageBase) : 0;
  const simulatedDisposable = budget.disposableIncome - rentImpact;
  const showParfinans = simulatedDisposable < 3000;

  const typeColor = {
    advarsel: "text-kassen-red border-kassen-red/30 bg-kassen-red/10",
    info: "text-kassen-blue border-kassen-blue/30 bg-kassen-blue/10",
    ros: "text-kassen-green border-kassen-green/30 bg-kassen-green/10",
  };

  return (
    <div className="space-y-4">
      {/* Rentechok simulator */}
      <motion.div variants={fadeUp(0)} initial="hidden" animate="visible" className="glass-card rounded-2xl p-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">Rentechok-simulator</p>
        <div className="flex items-center justify-between mb-4">
          <span className="font-display font-bold text-xl">{rentRate.toFixed(1)}% rente</span>
          <span className={`font-display font-bold text-lg ${simulatedDisposable > 5000 ? "text-kassen-green" : simulatedDisposable > 0 ? "text-kassen-gold" : "text-kassen-red"}`}>
            {formatKr(simulatedDisposable)} kr. tilbage
          </span>
        </div>
        <input
          type="range" min={1} max={10} step={0.25} value={rentRate}
          onChange={(e) => setRentRate(parseFloat(e.target.value))}
          className="w-full h-2 appearance-none bg-muted rounded-full cursor-pointer"
          style={{ accentColor: "hsl(150, 100%, 65%)" }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>1%</span><span>Aktuel ~5%</span><span>10%</span>
        </div>
        {showParfinans && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 rounded-xl bg-kassen-red/10 border border-kassen-red/30">
            <p className="text-sm text-kassen-red font-semibold mb-1">⚠️ Jeres økonomi er sårbar over for rentestigninger</p>
            <p className="text-xs text-muted-foreground mb-2">Refinansiering kan reducere jeres eksponering og frigive hundredvis af kroner om måneden.</p>
            <a href="https://parfinans.dk" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-kassen-red hover:text-kassen-red/80 underline">
              Se hvad refinansiering kan gøre for jer →
            </a>
          </motion.div>
        )}
      </motion.div>

      {/* Timeline */}
      <motion.div variants={fadeUp(0.1)} initial="hidden" animate="visible" className="glass-card rounded-2xl p-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">Automatisk tidslinje – næste 10 år</p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Ingen store begivenheder fundet baseret på jeres profil.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {events.map((event, i) => (
                <motion.div key={i} variants={fadeUp(0.1 + i * 0.07)} initial="hidden" animate="visible" className="flex gap-4 pl-10 relative">
                  <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-background bg-kassen-blue" />
                  <div className={`flex-1 rounded-xl border p-3 ${typeColor[event.type]}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold opacity-70 mb-0.5">{event.year}</p>
                        <p className="font-display font-semibold text-sm">{event.title}</p>
                        <p className="text-xs opacity-70 mt-0.5">{event.description}</p>
                      </div>
                      <span className="font-display font-bold text-sm whitespace-nowrap">
                        {event.impact > 0 ? "+" : ""}{formatKr(event.impact)} kr.
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
