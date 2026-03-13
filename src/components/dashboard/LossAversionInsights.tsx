import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, TrendingDown, Calendar, TrendingUp } from "lucide-react";
import { formatKr } from "@/lib/budgetCalculator";
import { getCheapestHours, getNeighborIncomeGap } from "@/lib/marketData";
import { useMarketData } from "@/hooks/useMarketData";
import { useLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import type { HealthMetrics } from "@/lib/healthScore";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  health: HealthMetrics;
}

interface Insight {
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  title: string;
  value: string;
  sub: string;
  borderColor: string;
}

function futureValue(monthly: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  return Math.round(monthly * ((Math.pow(1 + r, n) - 1) / r));
}

export function LossAversionInsights({ profile, budget, health }: Props) {
  const { data: marketData } = useMarketData();
  const locale = useLocale();
  const { lang } = useI18n();
  const isNO = locale.code === "no";
  const lc = locale.currencyLocale;

  const insights = useMemo(() => {
    const result: Insight[] = [];

    // ── 1. Indkomst vs. nabolag (DST: sammenlign take-home med take-home) ──
    // DST disponibel indkomst ≈ after-tax income, same as budget.totalIncome
    const incomeGap = getNeighborIncomeGap(marketData, profile.postalCode || "", budget.totalIncome);
    if (incomeGap !== null) {
      const statSource = isNO ? "SSB" : "Danmarks Statistik";
      const neighborLabel = lang === "nb" ? "nabolaget" : lang === "en" ? "your postal code" : `postnummer ${profile.postalCode}`;
      if (incomeGap < -1000) {
        result.push({
          icon: <TrendingDown className="w-4 h-4" />,
          badge: lang === "nb" ? "Inntekt vs. nabolag" : lang === "en" ? "Income vs. neighbors" : "Indkomst vs. nabolag",
          badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
          title: lang === "nb"
            ? `Du tjener ${formatKr(Math.abs(incomeGap), lc)} kr./md. under gjennomsnittet i ${profile.postalCode}`
            : lang === "en"
            ? `You earn ${formatKr(Math.abs(incomeGap), lc)} DKK/mo. below the average in ${profile.postalCode}`
            : `Du tjener ${formatKr(Math.abs(incomeGap), lc)} kr./md. under gennemsnittet i ${profile.postalCode}`,
          value: `−${formatKr(Math.abs(incomeGap) * 12, lc)} ${locale.currencyUnit}/år`,
          sub: lang === "nb"
            ? `Gjennomsnittsinntekten i ${neighborLabel} er ${formatKr(budget.totalIncome - incomeGap, lc)} kr./md. etter skatt. Det er ikke nødvendigvis et problem — men det er verdt å vite. (Kilde: ${statSource})`
            : lang === "en"
            ? `Average income in ${neighborLabel} is ${formatKr(budget.totalIncome - incomeGap, lc)} DKK/mo. after tax. Not necessarily a problem — but good to know. (Source: ${statSource})`
            : `Gennemsnitsindkomsten i dit postnummer er ${formatKr(budget.totalIncome - incomeGap, lc)} kr./md. efter skat. Det er ikke nødvendigvis et problem — men det er værd at vide. (Kilde: ${statSource})`,
          borderColor: "border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10",
        });
      } else if (incomeGap > 2000) {
        result.push({
          icon: <TrendingUp className="w-4 h-4" />,
          badge: lang === "nb" ? "Inntekt vs. nabolag" : lang === "en" ? "Income vs. neighbors" : "Indkomst vs. nabolag",
          badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          title: lang === "nb"
            ? `Du tjener ${formatKr(incomeGap, lc)} kr./md. over gjennomsnittet i ${profile.postalCode}`
            : lang === "en"
            ? `You earn ${formatKr(incomeGap, lc)} DKK/mo. above the average in ${profile.postalCode}`
            : `Du tjener ${formatKr(incomeGap, lc)} kr./md. over gennemsnittet i ${profile.postalCode}`,
          value: `+${formatKr(incomeGap * 12, lc)} ${locale.currencyUnit}/år`,
          sub: lang === "nb"
            ? `Gjennomsnittsinntekten i ${neighborLabel} er ${formatKr(budget.totalIncome - incomeGap, lc)} kr./md. etter skatt. Du er altså over midten — utnytter budsjettet ditt det fullt ut? (Kilde: ${statSource})`
            : lang === "en"
            ? `Average income in ${neighborLabel} is ${formatKr(budget.totalIncome - incomeGap, lc)} DKK/mo. after tax. You're above the median — is your budget making the most of it? (Source: ${statSource})`
            : `Gennemsnitsindkomsten i dit postnummer er ${formatKr(budget.totalIncome - incomeGap, lc)} kr./md. efter skat. Du er altså over midten — udnytter dit budget det fuldt ud? (Kilde: ${statSource})`,
          borderColor: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/10",
        });
      }
    }

    // ── 2. Årsomkostning på abonnementer ─────────────────────────────────
    const streamMonthly =
      (profile.hasNetflix ? 149 : 0) +
      (profile.hasSpotify ? 109 : 0) +
      (profile.hasHBO ? 99 : 0) +
      (profile.hasViaplay ? 99 : 0) +
      (profile.hasDisney ? 99 : 0) +
      (profile.hasAppleTV ? 59 : 0) +
      (profile.hasAmazonPrime ? 89 : 0);

    if (streamMonthly >= 200) {
      const annualCost = streamMonthly * 12;
      const count = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime, profile.hasSpotify].filter(Boolean).length;
      result.push({
        icon: <Calendar className="w-4 h-4" />,
        badge: lang === "nb" ? "Abonnementer pr. år" : lang === "en" ? "Subscriptions per year" : "Abonnementer pr. år",
        badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        title: lang === "nb"
          ? `${count} strømmetjenester koster ${formatKr(annualCost, lc)} kr. i året`
          : lang === "en"
          ? `${count} streaming services cost ${formatKr(annualCost, lc)} DKK per year`
          : `${count} streamingtjenester koster ${formatKr(annualCost, lc)} kr. om året`,
        value: `${formatKr(annualCost, lc)} ${locale.currencyUnit}/år`,
        sub: lang === "nb"
          ? `De fleste bruker 1-2 aktivt. Koster de hver for seg: Netflix ${formatKr(149 * 12, lc)}, Viaplay ${formatKr(99 * 12, lc)}, HBO ${formatKr(99 * 12, lc)} kr./år. Roterer du, er det penger å spare.`
          : lang === "en"
          ? `Most people actively use 1-2. Individual costs: Netflix ${formatKr(149 * 12, lc)}, Viaplay ${formatKr(99 * 12, lc)}, HBO ${formatKr(99 * 12, lc)} DKK/yr. Rotating can save money.`
          : `De fleste bruger 1-2 aktivt. Koster de hver for sig: Netflix ${formatKr(149 * 12, lc)}, Viaplay ${formatKr(99 * 12, lc)}, HBO ${formatKr(99 * 12, lc)} kr./år. Går du på skift, er der penge at hente.`,
        borderColor: "border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10",
      });
    }

    // ── 3. Opsparingstab — kun hvis lav opsparingsrate OG råd til mere ──
    // Vis IKKE hvis allerede god opsparingsrate (>= 10%)
    const hasMeaningfulSavings = health.savingsRate >= 10;
    if (!hasMeaningfulSavings && budget.disposableIncome > 1500) {
      const suggestedMonthly = Math.min(Math.round(budget.disposableIncome * 0.5 / 100) * 100, 3000);
      if (suggestedMonthly >= 500) {
        const in15years = futureValue(suggestedMonthly, 0.07, 15);
        result.push({
          icon: <TrendingDown className="w-4 h-4" />,
          badge: lang === "nb" ? "Sparemulighet" : lang === "en" ? "Savings opportunity" : "Opsparingsmulighed",
          badgeColor: "bg-red-500/10 text-red-700 dark:text-red-400",
          title: lang === "nb"
            ? `Du har ${formatKr(budget.disposableIncome, lc)} kr./md. til overs — men sparer ingenting`
            : lang === "en"
            ? `You have ${formatKr(budget.disposableIncome, lc)} DKK/mo. left — but save nothing`
            : `Du har ${formatKr(budget.disposableIncome, lc)} kr./md. til overs — men sparer intet op`,
          value: `${formatKr(in15years, lc)} ${locale.currencyUnit} muligt`,
          sub: lang === "nb"
            ? `${formatKr(suggestedMonthly, lc)} kr./md. i et globalt indeksfond (historisk ~7%/år) gir ${formatKr(in15years, lc)} kr. om 15 år med renters rente. For hver måned som går uten sparing mister du dette potensialet.`
            : lang === "en"
            ? `${formatKr(suggestedMonthly, lc)} DKK/mo. in a global index fund (historical ~7%/yr) gives ${formatKr(in15years, lc)} DKK in 15 years with compound interest. Every month without saving, you lose this potential.`
            : `${formatKr(suggestedMonthly, lc)} kr./md. i et globalt indeksfond (historisk ~7%/år) giver ${formatKr(in15years, lc)} kr. om 15 år med rentes rente. For hver måned der går uden opsparing mister du dette potentiale.`,
          borderColor: "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/10",
        });
      }
    }

    // ── 4. Billigste el-timer i dag (live Elspot) ─────────────────────────
    const cheapHours = getCheapestHours(marketData, 4);
    if (cheapHours.length >= 2) {
      const cheapest = cheapHours[0];
      const currentHour = new Date().getHours();
      const isCheapNow = cheapHours.some(h => h.hour === currentHour);
      const hourlyAll = marketData?.electricity.hourlyToday ?? [];
      const mostExpensive = hourlyAll.length > 0
        ? [...hourlyAll].sort((a, b) => b.allInPrice - a.allInPrice)[0]
        : null;
      const saving = mostExpensive ? Math.round((mostExpensive.allInPrice - cheapest.allInPrice) * 100) / 100 : 0;
      const hoursStr = cheapHours.map(h => h.label).join(", ");

      result.push({
        icon: <Zap className="w-4 h-4" />,
        badge: isCheapNow
          ? (lang === "nb" ? "Strøm billigst nå ⚡" : lang === "en" ? "Power cheapest now ⚡" : "El billigst nu ⚡")
          : (lang === "nb" ? "Billigste strøm i dag" : lang === "en" ? "Cheapest power today" : "Billigste el i dag"),
        badgeColor: isCheapNow ? "bg-primary/10 text-primary" : "bg-slate-500/10 text-slate-700 dark:text-slate-400",
        title: isCheapNow
          ? lang === "nb"
            ? `Strøm er billigst nå (${cheapest.allInPrice.toFixed(2)} kr/kWh) — start oppvaskmaskinen og tørketrommelen`
            : lang === "en"
            ? `Electricity is cheapest now (${cheapest.allInPrice.toFixed(2)} kr/kWh) — run dishwasher and dryer`
            : `El er billigst lige nu (${cheapest.allInPrice.toFixed(2)} kr/kWh) — sæt opvasker og tørretumbler på`
          : lang === "nb"
          ? `Start oppvaskmaskin og vaskemaskin kl. ${hoursStr}`
          : lang === "en"
          ? `Run dishwasher and washing machine at ${hoursStr}`
          : `Sæt opvasker og vaskemaskine til at køre kl. ${hoursStr}`,
        value: `${cheapest.allInPrice.toFixed(2)} kr/kWh`,
        sub: saving > 0
          ? lang === "nb"
            ? `${saving.toFixed(2)} kr/kWh billigere enn det dyreste tidspunktet i dag. Kjører du tørketrommel (2 kWh) til ${cheapest.allInPrice.toFixed(2)} vs ${mostExpensive!.allInPrice.toFixed(2)} kr/kWh sparer du ${(saving * 2).toFixed(1)} kr. på én runde. (Live data: Energi Data Service)`
            : lang === "en"
            ? `${saving.toFixed(2)} kr/kWh cheaper than the most expensive time today. Running a dryer (2 kWh) at ${cheapest.allInPrice.toFixed(2)} vs ${mostExpensive!.allInPrice.toFixed(2)} kr/kWh saves ${(saving * 2).toFixed(1)} kr. (Live data: Energi Data Service)`
            : `${saving.toFixed(2)} kr/kWh billigere end det dyreste tidspunkt i dag. Kører du tørretumbler (2 kWh) til ${cheapest.allInPrice.toFixed(2)} vs ${mostExpensive!.allInPrice.toFixed(2)} kr/kWh sparer du ${(saving * 2).toFixed(1)} kr. på én tur. (Live data: Energi Data Service)`
          : lang === "nb"
          ? `Basert på live Elspot-data fra Energi Data Service, oppdatert i dag.`
          : lang === "en"
          ? `Based on live Elspot data from Energi Data Service, updated today.`
          : `Baseret på live Elspot-data fra Energi Data Service, opdateret i dag.`,
        borderColor: isCheapNow
          ? "border-primary/20 bg-primary/5"
          : "border-slate-200 bg-slate-50/50 dark:border-slate-700/30 dark:bg-slate-900/10",
      });
    }

    return result;
  }, [profile, budget, health, marketData]);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
        {lang === "nb" ? "Innsikt basert på dine tall" : lang === "en" ? "Insights based on your numbers" : "Indsigter baseret på dine tal"}
      </p>
      {insights.map((insight, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`rounded-2xl border p-4 ${insight.borderColor}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${insight.badgeColor}`}>
                  {insight.icon}
                  {insight.badge}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground leading-snug mb-1">{insight.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.sub}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-display font-black text-base text-foreground tabular-nums">{insight.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
