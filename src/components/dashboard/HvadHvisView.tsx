import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Home, Baby, Briefcase, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { computeBudget } from "@/lib/budgetCalculator";
import { calculateHealth } from "@/lib/healthScore";
import { formatKr } from "@/lib/budgetCalculator";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import type { HealthMetrics } from "@/lib/healthScore";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  health: HealthMetrics;
}

interface Scenario {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const scenarios: Scenario[] = [
  { id: "bolig", icon: <Home className="w-5 h-5" />, title: "Køb bolig", description: "Hvad sker der, hvis du skifter fra leje til ejerbolig?" },
  { id: "barn", icon: <Baby className="w-5 h-5" />, title: "Få barn", description: "Hvordan påvirker et barn din økonomi?" },
  { id: "job", icon: <Briefcase className="w-5 h-5" />, title: "Skift job", description: "Simulér en ny løn og se effekten." },
];

export function HvadHvisView({ profile, budget, health }: Props) {
  const [activeScenarios, setActiveScenarios] = useState<Record<string, boolean>>({});
  const [mortgageInput, setMortgageInput] = useState(12000);
  const [salaryDelta, setSalaryDelta] = useState(0); // +/- kr

  const toggleScenario = (id: string) => {
    setActiveScenarios((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const modifiedResult = useMemo(() => {
    let p = { ...profile };

    if (activeScenarios.bolig) {
      p = { ...p, housingType: "ejer", hasMortgage: true, mortgageAmount: mortgageInput, rentAmount: 0 };
    }
    if (activeScenarios.barn) {
      const newAges = [...p.childrenAges, 1];
      p = { ...p, hasChildren: true, childrenAges: newAges };
    }
    if (activeScenarios.job) {
      p = { ...p, income: Math.max(0, p.income + salaryDelta) };
    }

    const anyActive = Object.values(activeScenarios).some(Boolean);
    if (!anyActive) return null;

    const newBudget = computeBudget(p);
    const newHealth = calculateHealth(p, newBudget);
    return { budget: newBudget, health: newHealth };
  }, [profile, activeScenarios, mortgageInput, salaryDelta]);

  const disposableDelta = modifiedResult ? modifiedResult.budget.disposableIncome - budget.disposableIncome : 0;
  const scoreDelta = modifiedResult ? modifiedResult.health.score - health.score : 0;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Slå scenarier til og se hvordan de påvirker din økonomi i realtid.</p>

      {/* Scenario cards */}
      <div className="space-y-3">
        {scenarios.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">{s.icon}</div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
              </div>
              <Switch checked={!!activeScenarios[s.id]} onCheckedChange={() => toggleScenario(s.id)} />
            </div>

            {/* Scenario-specific inputs */}
            {activeScenarios[s.id] && s.id === "bolig" && (
              <div className="pl-12 space-y-2">
                <label className="text-xs text-muted-foreground">Månedlig ydelse (kr.)</label>
                <Slider
                  value={[mortgageInput]}
                  onValueChange={([v]) => setMortgageInput(v)}
                  min={4000}
                  max={25000}
                  step={500}
                />
                <span className="text-xs font-medium text-foreground">{formatKr(mortgageInput)} kr./md.</span>
              </div>
            )}
            {activeScenarios[s.id] && s.id === "job" && (
              <div className="pl-12 space-y-2">
                <label className="text-xs text-muted-foreground">Lønændring (kr./md.)</label>
                <Slider
                  value={[salaryDelta]}
                  onValueChange={([v]) => setSalaryDelta(v)}
                  min={-10000}
                  max={15000}
                  step={500}
                />
                <span className={`text-xs font-medium ${salaryDelta >= 0 ? "text-primary" : "text-destructive"}`}>
                  {salaryDelta >= 0 ? "+" : ""}{formatKr(salaryDelta)} kr./md.
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Results comparison */}
      {modifiedResult && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-primary/20 bg-card p-5 space-y-4"
        >
          <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Før vs. efter</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div className="text-center space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nu</p>
              <p className="text-2xl font-black text-foreground">{formatKr(budget.disposableIncome)}</p>
              <p className="text-xs text-muted-foreground">kr./md. til rådighed</p>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                Score: {health.score}
              </div>
            </div>

            {/* After */}
            <div className="text-center space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Scenarie</p>
              <p className="text-2xl font-black text-foreground">{formatKr(modifiedResult.budget.disposableIncome)}</p>
              <p className="text-xs text-muted-foreground">kr./md. til rådighed</p>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                scoreDelta >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}>
                Score: {modifiedResult.health.score}
              </div>
            </div>
          </div>

          {/* Delta summary */}
          <div className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold ${
            disposableDelta >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          }`}>
            {disposableDelta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {disposableDelta >= 0 ? "+" : ""}{formatKr(disposableDelta)} kr./md.
            <ArrowRight className="w-3 h-3 opacity-50" />
            Score {scoreDelta >= 0 ? "+" : ""}{scoreDelta}
          </div>
        </motion.div>
      )}
    </div>
  );
}
