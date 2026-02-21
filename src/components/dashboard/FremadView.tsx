import { useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, Target, PiggyBank, ShieldCheck } from "lucide-react";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import { formatKr } from "@/lib/budgetCalculator";
import type { HealthMetrics } from "@/lib/healthScore";
import { useWhiteLabel } from "@/lib/whiteLabel";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  health: HealthMetrics;
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

export function FremadView({ profile, budget, health }: Props) {
  const config = useWhiteLabel();
  const [rentRate, setRentRate] = useState(profile.interestRate || 5.0);
  const events = generateEvents(profile);

  const mortgageBase = budget.fixedExpenses.find((e) => e.label.includes("oliglån"))?.amount ?? 0;
  const rentImpact = mortgageBase > 0 ? Math.round(((rentRate - (profile.interestRate || 5.0)) * 0.005) * mortgageBase) : 0;
  const simulatedDisposable = budget.disposableIncome - rentImpact;

  // Net worth estimate (for ejere)
  const estimatedDebt = profile.propertyValue > 0 ? Math.round(profile.propertyValue * 0.7) : 0; // antag 70% belåning
  const netWorth = profile.propertyValue > 0 ? profile.propertyValue - estimatedDebt : 0;

  // Savings projections
  const monthlySavings = Math.max(0, budget.disposableIncome * 0.3);
  const yearlyReturn = 0.07; // 7% gennemsnit aktieafkast
  const projections = [1, 3, 5, 10].map((years) => {
    // FV of annuity: PMT × (((1 + r)^n - 1) / r)
    const monthlyRate = yearlyReturn / 12;
    const months = years * 12;
    const fv = monthlySavings * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    return { years, amount: Math.round(fv) };
  });

  // Goals
  const bufferGoal = health.truths.monthlyBaseline * 3;
  const currentBuffer = budget.totalIncome * 1; // estimated
  const bufferProgress = Math.min(100, Math.round((currentBuffer / bufferGoal) * 100));
  
  const savingsGoal = budget.totalIncome * 12; // 1 year salary as goal
  const savingsProgress = Math.min(100, Math.round((monthlySavings * 12 / savingsGoal) * 100));

  return (
    <div className="space-y-4">

      {/* Savings Projection */}
      <motion.div variants={fadeUp(0)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Formue-projektion</p>
            <p className="text-[10px] text-muted-foreground">Baseret på {formatKr(monthlySavings)} kr./md. investeret</p>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mb-4">
          {projections.map((p) => (
            <motion.div
              key={p.years}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: p.years * 0.05 + 0.1 }}
              className="text-center p-3 rounded-xl bg-muted/50 border border-border"
            >
              <p className="text-[10px] text-muted-foreground mb-1">{p.years} år</p>
              <p className="font-display font-bold text-sm text-primary">{formatKr(p.amount)}</p>
              <p className="text-[9px] text-muted-foreground">kr.</p>
            </motion.div>
          ))}
        </div>

        {/* Bar chart visualization */}
        <div className="h-40 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projections} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(150,8%,91%)" />
              <XAxis dataKey="years" tick={{ fontSize: 11, fill: "hsl(160,5%,50%)" }} tickFormatter={(v) => `${v} år`} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(160,5%,50%)" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                formatter={(val: number) => [`${formatKr(val)} kr.`, "Forventet formue"]}
                contentStyle={{ background: "white", border: "1px solid hsl(150,8%,91%)", borderRadius: "10px", fontSize: "13px", boxShadow: "0 4px 12px hsl(0 0% 0% / 0.06)" }}
              />
              <Bar dataKey="amount" fill="hsl(152, 55%, 40%)" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
          <p className="text-xs text-muted-foreground">
            💡 Med {formatKr(monthlySavings)} kr./md. i en global indeksfond (7% gns. afkast) 
            bygger du <span className="font-semibold text-primary">{formatKr(projections[2].amount)} kr.</span> på 5 år 
            og <span className="font-semibold text-primary">{formatKr(projections[3].amount)} kr.</span> på 10 år.
          </p>
        </div>
      </motion.div>

      {/* Net Worth (for ejere) */}
      {profile.propertyValue > 0 && (
        <motion.div variants={fadeUp(0.05)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-kassen-gold/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-kassen-gold" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Estimeret formue (bolig)</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Boligværdi</p>
              <p className="font-display font-bold text-sm text-foreground">{formatKr(profile.propertyValue)} kr.</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Est. gæld (~70%)</p>
              <p className="font-display font-bold text-sm text-destructive">{formatKr(estimatedDebt)} kr.</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Net worth</p>
              <p className="font-display font-bold text-sm text-primary">{formatKr(netWorth)} kr.</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            💡 Rente: {profile.interestRate.toFixed(1)}% · Boligværdi er et estimat — justér i din profil.
          </p>
        </motion.div>
      )}

      {/* Goals / Mål */}
      <motion.div variants={fadeUp(0.1)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-kassen-gold/10 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-kassen-gold" />
          </div>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Mål & fremskridt</p>
        </div>

        <div className="space-y-4">
          {/* Buffer goal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium">Nødbuffer (3 mdr.)</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatKr(currentBuffer)} / {formatKr(bufferGoal)} kr.</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${bufferProgress}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{bufferProgress}% af mål</p>
          </div>

          {/* Savings rate goal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-3.5 h-3.5 text-kassen-gold" />
                <span className="text-xs font-medium">Opsparingsrate</span>
              </div>
              <span className="text-xs text-muted-foreground">{health.savingsRate}% / 20% mål</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (health.savingsRate / 20) * 100)}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                className={`h-full rounded-full ${health.savingsRate >= 20 ? "bg-primary" : health.savingsRate >= 10 ? "bg-kassen-gold" : "bg-destructive"}`}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {health.savingsRate >= 20 
                ? "✅ Du overstiger anbefalingen!" 
                : `Øg med ${formatKr((0.20 - health.savingsRate / 100) * budget.totalIncome)} kr./md. for at nå 20%`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Rate simulator */}
      {mortgageBase > 0 && (
        <motion.div variants={fadeUp(0.15)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
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
            <span>1%</span><span>Aktuel ~{(profile.interestRate || 5.0).toFixed(1)}%</span><span>10%</span>
          </div>
          {simulatedDisposable < 3000 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 rounded-xl bg-destructive/8 border border-destructive/30">
              <p className="text-sm text-destructive font-semibold mb-1">⚠️ Sårbar økonomi</p>
              <p className="text-xs text-muted-foreground mb-2">Refinansiering kan reducere jeres eksponering.</p>
              <a href={config.ctaLinks.mortgage?.url || "https://parfinans.dk"} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-destructive underline">
                {config.ctaLinks.mortgage?.label || "Se hvad refinansiering kan gøre →"}
              </a>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Timeline */}
      <motion.div variants={fadeUp(0.2)} initial="hidden" animate="visible" className="rounded-2xl bg-card border border-border p-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">Tidslinje – næste 10 år</p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Ingen store begivenheder fundet baseret på jeres profil.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-3">
              {events.map((event, i) => (
                <motion.div key={i} variants={fadeUp(0.25 + i * 0.06)} initial="hidden" animate="visible" className="flex gap-4 pl-10 relative">
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
