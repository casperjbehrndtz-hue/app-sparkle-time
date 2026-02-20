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
      events.push({ year: currentYear + (6 - age), title: `${childLabel} starter i SFO`, description: "SFO-udgift 2.100 kr./md.", impact: -2100, type: "info" });
    }
    if (age >= 3 && age < 6) {
      events.push({ year: currentYear + (6 - age), title: `${childLabel} forlader børnehave`, description: "Institutionsudgift falder 2.600 kr./md.", impact: 2600, type: "ros" });
    }
    if (age < 7) {
      events.push({ year: currentYear + (7 - age), title: `${childLabel} fylder 7 – børneydelse falder`, description: "Reduceres med 1.130 kr./md.", impact: -1130, type: "advarsel" });
    }
    if (age < 10) {
      events.push({ year: currentYear + (10 - age), title: `${childLabel} ud af SFO`, description: "SFO-udgift bortfalder.", impact: 2100, type: "ros" });
    }
    if (age < 18) {
      events.push({ year: currentYear + (18 - age), title: `${childLabel} fylder 18`, description: "Børneydelse bortfalder.", impact: -940, type: "advarsel" });
    }
  });

  if (profile.housingType === "ejer" && profile.mortgageAmount > 0) {
    events.push({ year: 2028, title: "Tjek afdragsfrihed", description: "Mange lån fra 2018–2020 har 10-årig afdragsfrihed.", impact: -3400, type: "advarsel" });
  }

  return events.sort((a, b) => a.year - b.year);
}

const fadeUp = (d: number) => ({
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { delay: d, duration: 0.35, ease: "easeOut" as const } },
});

const typeStyles = {
  advarsel: "text-destructive border-destructive/30 bg-destructive/8",
  info: "text-secondary border-secondary/30 bg-secondary/8",
  ros: "text-primary border-primary/30 bg-primary/8",
};

export function FremadView({ profile, budget }: Props) {
  const [rentRate, setRentRate] = useState(5.0);
  const events = generateEvents(profile);

  const mortgageBase = budget.fixedExpenses.find((e) => e.label.includes("oliglån"))?.amount ?? 0;
  const rentImpact = mortgageBase > 0 ? Math.round(((rentRate - 5.0) * 0.005) * mortgageBase) : 0;
  const simulatedDisposable = budget.disposableIncome - rentImpact;

  return (
    <div className="space-y-4">
      {/* Rate simulator */}
      {mortgageBase > 0 && (
        <motion.div variants={fadeUp(0)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Rentechok-simulator</p>
          <div className="flex items-center justify-between mb-4">
            <span className="font-display font-bold text-xl">{rentRate.toFixed(1)}%</span>
            <span className={`font-display font-bold text-lg ${simulatedDisposable > 5000 ? "text-primary" : simulatedDisposable > 0 ? "text-kassen-gold" : "text-destructive"}`}>
              {formatKr(simulatedDisposable)} kr. tilbage
            </span>
          </div>
          <input
            type="range" min={1} max={10} step={0.25} value={rentRate}
            onChange={(e) => setRentRate(parseFloat(e.target.value))}
            className="w-full h-2 appearance-none bg-muted rounded-full cursor-pointer"
            style={{ accentColor: "hsl(var(--primary))" }}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1%</span><span>Aktuel ~5%</span><span>10%</span>
          </div>
          {simulatedDisposable < 3000 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 rounded-xl bg-destructive/8 border border-destructive/30">
              <p className="text-sm text-destructive font-semibold mb-1">⚠️ Sårbar økonomi</p>
              <p className="text-xs text-muted-foreground mb-2">Refinansiering kan reducere jeres eksponering.</p>
              <a href="https://parfinans.dk" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-destructive underline">
                Se hvad refinansiering kan gøre →
              </a>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Timeline */}
      <motion.div variants={fadeUp(0.1)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">Tidslinje – næste 10 år</p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Ingen store begivenheder fundet baseret på jeres profil.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-3">
              {events.map((event, i) => (
                <motion.div key={i} variants={fadeUp(0.15 + i * 0.06)} initial="hidden" animate="visible" className="flex gap-4 pl-10 relative">
                  <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-background bg-secondary" />
                  <div className={`flex-1 rounded-xl border p-3 ${typeStyles[event.type]}`}>
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
