import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus, ChevronRight } from "lucide-react";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import { formatKr } from "@/lib/budgetCalculator";
import { useLocale } from "@/lib/locale";
import { useMarketData } from "@/hooks/useMarketData";
import { getLiveIncome } from "@/lib/marketData";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

// Danmarks Statistik benchmarks — husstandsforbrug 2024/2025
const DK_BENCHMARKS = {
  food:        { solo: 4000,  par: 6800  },
  restaurant:  { solo: 1200,  par: 2200  },
  transport:   { solo: 1800,  par: 2900  },
  streaming:   { solo: 380,   par: 380   },
  leisure:     { solo: 1300,  par: 2100  },
  housing_pct: 33,
};

// Statistisk sentralbyrå (SSB) benchmarks — husholdningsforbruk 2024/2025
const NO_BENCHMARKS = {
  food:        { solo: 5500,  par: 9000  },
  restaurant:  { solo: 1500,  par: 2800  },
  transport:   { solo: 2200,  par: 3500  },
  streaming:   { solo: 450,   par: 450   },
  leisure:     { solo: 1600,  par: 2600  },
  housing_pct: 33,
};

function deltaStatus(pct: number): "good" | "watch" | "over" {
  if (pct <= 5) return "good";
  if (pct <= 25) return "watch";
  return "over";
}

const STATUS_STYLES = {
  good:  { bg: "bg-emerald-500/8 border-emerald-500/20",  badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: <ArrowDownRight className="w-3.5 h-3.5" /> },
  watch: { bg: "bg-amber-500/8 border-amber-500/20",      badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400",     icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  over:  { bg: "bg-destructive/8 border-destructive/20",  badge: "bg-destructive/15 text-destructive",                     icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
};

const fadeUp = (d: number) => ({
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { delay: d, duration: 0.3, ease: "easeOut" as const } },
});

export function NaboeffektView({ profile, budget }: Props) {
  const locale = useLocale();
  const { data: marketData } = useMarketData();
  const isPar = profile.householdType === "par";
  const BENCHMARKS = locale.code === "no" ? NO_BENCHMARKS : DK_BENCHMARKS;

  // Streaming cost
  const streamingCost = useMemo(() => {
    const active = [
      profile.hasNetflix,
      profile.hasSpotify,
      profile.hasHBO,
      profile.hasViaplay,
      profile.hasAppleTV,
      profile.hasDisney,
      profile.hasAmazonPrime,
    ].filter(Boolean).length;
    // Approximate avg price per service (NO prices slightly higher)
    return active * (locale.code === "no" ? 130 : 109);
  }, [profile]);

  // Transport monthly total
  const transportCost = useMemo(() => {
    if (!profile.hasCar) return 0;
    return (profile.carLoan || 0)
      + (profile.carFuel || 0)
      + Math.round((profile.carInsurance || 0) / 12)
      + Math.round((profile.carTax || 0) / 12)
      + Math.round((profile.carService || 0) / 6);
  }, [profile]);

  // Housing ratio
  const housingCost = budget.fixedExpenses
    .filter(e => e.category === "Bolig")
    .reduce((s, e) => s + e.amount, 0);
  const housingPct = budget.totalIncome > 0
    ? Math.round((housingCost / budget.totalIncome) * 100)
    : 0;

  const cards = useMemo(() => {
    const b = isPar ? "par" : "solo";
    return [
      {
        icon: "🛒",
        label: "Mad & dagligvarer",
        yours: profile.foodAmount,
        avg: BENCHMARKS.food[b],
        action: { label: "Justér madbudget", section: "handling" },
        unit: "kr./md.",
      },
      {
        icon: "🍽️",
        label: "Restaurant & takeaway",
        yours: profile.restaurantAmount,
        avg: BENCHMARKS.restaurant[b],
        action: { label: "Se besparelsesforslag", section: "handling" },
        unit: "kr./md.",
      },
      {
        icon: "🚗",
        label: profile.hasCar ? "Transport (bil)" : "Transport",
        yours: profile.hasCar ? transportCost : 0,
        avg: profile.hasCar ? BENCHMARKS.transport[b] : 0,
        action: { label: "Se transportoptimering", section: "handling" },
        unit: "kr./md.",
        skip: !profile.hasCar,
      },
      {
        icon: "📺",
        label: "Streaming & abonnementer",
        yours: streamingCost,
        avg: BENCHMARKS.streaming[b],
        action: { label: "Gennemgå abonnementer", section: "handling" },
        unit: "kr./md.",
      },
      {
        icon: "🎉",
        label: "Fritid & oplevelser",
        yours: profile.leisureAmount,
        avg: BENCHMARKS.leisure[b],
        action: { label: "Se fritidsbudget", section: "handling" },
        unit: "kr./md.",
      },
    ].filter(c => !c.skip);
  }, [profile, isPar, transportCost, streamingCost]);

  // Biggest opportunity
  const biggest = [...cards]
    .map(c => ({ ...c, delta: c.yours - c.avg }))
    .sort((a, b) => b.delta - a.delta)[0];

  // Overall position
  const liveIncome = getLiveIncome(marketData ?? null, profile.postalCode || "000");
  const neighborAvg = liveIncome
    ? Math.round(liveIncome * (isPar ? 0.65 : 0.38))
    : isPar ? 11800 : 7200;
  const isAboveAvg = budget.disposableIncome >= neighborAvg;
  const overallDiff = Math.abs(neighborAvg - budget.disposableIncome);

  return (
    <div className="space-y-4">

      {/* Summary header */}
      <motion.div variants={fadeUp(0)} initial="hidden" animate="visible"
        className="rounded-2xl border border-border bg-card p-5">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Sammenlignet med din indkomstgruppe · {isPar ? "Par" : "Enlig"}
        </p>
        {isAboveAvg ? (
          <div>
            <p className="font-display font-bold text-xl text-primary">
              {isPar ? "I er" : "Du er"} foran gennemsnittet 🎉
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isPar ? "I har" : "Du har"} <strong className="text-foreground">{formatKr(overallDiff)} kr. mere</strong> til overs end andre med din profil.
            </p>
          </div>
        ) : (
          <div>
            <p className="font-display font-bold text-xl">
              Potentiel besparelse: <span className="text-amber-600 dark:text-amber-400">{formatKr(overallDiff)} kr./md.</span>
            </p>
            {biggest && biggest.delta > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Største mulighed: <strong className="text-foreground">{biggest.label}</strong> — {formatKr(biggest.delta)} kr. over typisk
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Housing ratio alert */}
      {housingPct > BENCHMARKS.housing_pct && (
        <motion.div variants={fadeUp(0.05)} initial="hidden" animate="visible"
          className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🏠</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Boligudgift: {housingPct}% af indkomsten</p>
            <p className="text-xs text-muted-foreground">Eksperter anbefaler maks 33% — {isPar ? "I bruger" : "du bruger"} {housingPct - BENCHMARKS.housing_pct} procentpoint mere</p>
          </div>
        </motion.div>
      )}

      {/* Delta cards */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground px-1">
          Kategori for kategori
        </p>
        {cards.map((card, i) => {
          const delta = card.yours - card.avg;
          const pctOver = card.avg > 0 ? Math.round((delta / card.avg) * 100) : 0;
          const status = delta <= 0 ? "good" : deltaStatus(pctOver);
          const styles = STATUS_STYLES[status];

          return (
            <motion.div key={card.label} variants={fadeUp(0.1 + i * 0.06)} initial="hidden" animate="visible"
              className={`rounded-2xl border p-4 ${styles.bg}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{card.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{card.label}</span>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${styles.badge}`}>
                      {styles.icon}
                      {delta === 0 ? "På niveau" : delta > 0 ? `+${formatKr(delta)} kr.` : `${formatKr(delta)} kr.`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {isPar ? "Jer" : "Dig"}: <span className="text-foreground font-medium">{formatKr(card.yours)} kr.</span>
                      <span className="mx-1.5 opacity-40">·</span>
                      Typisk: {formatKr(card.avg)} kr.
                    </p>
                    {status !== "good" && (
                      <button
                        onClick={() => document.getElementById("handling")?.scrollIntoView({ behavior: "smooth" })}
                        className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:text-primary/70 transition-colors shrink-0">
                        Optimer <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Context sentence for red cards */}
              {status === "over" && delta > 0 && (
                <p className="text-xs text-muted-foreground mt-2 ml-11">
                  Hvis du sænker til typisk niveau, sparer du <strong className="text-foreground">{formatKr(delta * 12)} kr. om året</strong>.
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Footnote */}
      <p className="text-[10px] text-muted-foreground/50 text-center pb-2">
        Benchmarks baseret på Danmarks Statistik — {isPar ? "par" : "enlige"} i din indkomstgruppe · 2025
      </p>
    </div>
  );
}
