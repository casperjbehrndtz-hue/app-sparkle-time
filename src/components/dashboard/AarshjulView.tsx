import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays, AlertCircle, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { formatKr, calcEjendomsvaerdiskat } from "@/lib/budgetCalculator";
import { getPropertyValueEstimate } from "@/data/priceDatabase";
import { noCalcPropertyTax, noGetPropertyValueEstimate } from "@/data/priceDatabase.no";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

interface AnnualEvent {
  month: number; // 0-11
  label: string;
  amount: number;
  category: string;
  icon: string;
  recurring: boolean;
}


const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05 } }) };

export function AarshjulView({ profile, budget }: Props) {
  const { t } = useI18n();
  const locale = useLocale();
  const monthNames = t("charts.monthNames").split(",");
  const currentMonth = new Date().getMonth();

  const events = useMemo(() => {
    const ev: AnnualEvent[] = [];

    // Car insurance (typically January)
    if (profile.hasCar && profile.carInsurance > 0) {
      ev.push({ month: 0, label: t("wheel.carInsurance"), amount: profile.carInsurance, category: "Transport", icon: "car", recurring: true });
    }

    // Car tax (typically March & September — split)
    if (profile.hasCar && profile.carTax > 0) {
      ev.push({ month: 2, label: t("wheel.carTax") + " (1/2)", amount: Math.round(profile.carTax / 2), category: "Transport", icon: "tag", recurring: true });
      ev.push({ month: 8, label: t("wheel.carTax") + " (2/2)", amount: Math.round(profile.carTax / 2), category: "Transport", icon: "tag", recurring: true });
    }

    // Car service (biannual — April & October)
    if (profile.hasCar && profile.carService > 0) {
      ev.push({ month: 3, label: t("wheel.carService") + " (1/2)", amount: profile.carService, category: "Transport", icon: "wrench", recurring: true });
      ev.push({ month: 9, label: t("wheel.carService") + " (2/2)", amount: profile.carService, category: "Transport", icon: "wrench", recurring: true });
    }

    // Property tax (DK: ejendomsværdiskat halvårligt / NO: eiendomsskatt where applicable)
    if (profile.housingType === "ejer") {
      const isNO = locale.code === "no";
      const propValue = profile.propertyValue > 0
        ? profile.propertyValue
        : isNO ? noGetPropertyValueEstimate(profile.postalCode) : getPropertyValueEstimate(profile.postalCode);
      const annualTax = isNO
        ? noCalcPropertyTax(propValue, profile.postalCode)
        : calcEjendomsvaerdiskat(propValue) * 12;
      if (annualTax > 0) {
        const halfYearlyTax = Math.round(annualTax / 2);
        ev.push({ month: 5, label: t("wheel.propertyTax") + " (1/2)", amount: halfYearlyTax, category: "Bolig", icon: "home", recurring: true });
        ev.push({ month: 11, label: t("wheel.propertyTax") + " (2/2)", amount: halfYearlyTax, category: "Bolig", icon: "home", recurring: true });
      }
    }

    // Insurance renewal (typically April)
    if (profile.hasInsurance) {
      ev.push({ month: 3, label: t("wheel.insuranceRenewal"), amount: profile.insuranceAmount * 12, category: "Forsikring", icon: "shield", recurring: true });
    }

    // Christmas (December)
    const christmasBudget = profile.householdType === "par" ? 8000 : 4000;
    ev.push({ month: 11, label: t("wheel.christmas"), amount: christmasBudget, category: "Ferie", icon: "gift", recurring: true });

    // Summer vacation (July)
    const vacationBudget = profile.householdType === "par"
      ? (profile.hasChildren ? 25000 : 15000)
      : 8000;
    ev.push({ month: 6, label: t("wheel.summerVacation"), amount: vacationBudget, category: "Ferie", icon: "plane", recurring: true });

    // B-skat / restskat (November)
    ev.push({ month: 10, label: t("wheel.taxSettlement"), amount: 0, category: "Skat", icon: "clipboard", recurring: true });

    // Children: school start (August)
    if (profile.hasChildren) {
      ev.push({ month: 7, label: t("wheel.backToSchool"), amount: 3000 * profile.childrenAges.length, category: "Børn", icon: "backpack", recurring: true });
      // Birthday gifts (spread)
      ev.push({ month: 4, label: t("wheel.birthdays"), amount: 2000 * profile.childrenAges.length, category: "Børn", icon: "cake", recurring: true });
    }

    // Custom quarterly/biannual/annual expenses
    (profile.customExpenses || []).forEach((ce) => {
      if (ce.frequency === "annual") {
        ev.push({ month: 0, label: ce.label, amount: ce.amount, category: "Andet", icon: "pin", recurring: true });
      } else if (ce.frequency === "quarterly") {
        [0, 3, 6, 9].forEach((m) => {
          ev.push({ month: m, label: ce.label, amount: ce.amount, category: "Andet", icon: "pin", recurring: true });
        });
      } else if (ce.frequency === "biannual") {
        [0, 6].forEach((m) => {
          ev.push({ month: m, label: ce.label, amount: ce.amount, category: "Andet", icon: "pin", recurring: true });
        });
      }
    });

    return ev.sort((a, b) => a.month - b.month);
  }, [profile, t]);

  // Group by month
  const byMonth = useMemo(() => {
    const map = new Map<number, AnnualEvent[]>();
    events.forEach((ev) => {
      const existing = map.get(ev.month) || [];
      existing.push(ev);
      map.set(ev.month, existing);
    });
    return map;
  }, [events]);

  // Monthly totals for the wheel visualization
  const monthlyTotals = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthEvents = byMonth.get(i) || [];
      return monthEvents.reduce((sum, e) => sum + e.amount, 0);
    });
  }, [byMonth]);

  const maxMonthly = Math.max(...monthlyTotals, 1);
  const totalAnnual = monthlyTotals.reduce((s, v) => s + v, 0);

  // Upcoming events (next 60 days)
  const upcoming = useMemo(() => {
    const now = new Date();
    return events
      .filter((ev) => {
        const monthDiff = (ev.month - currentMonth + 12) % 12;
        return monthDiff >= 0 && monthDiff <= 2;
      })
      .slice(0, 5);
  }, [events, currentMonth]);

  return (
    <div className="space-y-5">
      {/* Annual total */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-border bg-muted/30 p-5">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{t("wheel.annual")}</span>
        </div>
        <p className="text-3xl font-black font-display text-foreground">{formatKr(totalAnnual, locale.currencyLocale)} {t("currency")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("wheel.annualSub")}</p>
      </motion.div>

      {/* Visual wheel (circular representation using CSS) */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}
        className="rounded-2xl border border-border p-4">
        <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">{t("wheel.monthlyOverview")}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {monthlyTotals.map((total, i) => {
            const height = total > 0 ? Math.max(8, Math.round((total / maxMonthly) * 64)) : 4;
            const isCurrentMonth = i === currentMonth;
            const hasEvents = total > 0;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="relative w-full flex items-end justify-center" style={{ height: 72 }}>
                  <motion.div
                    initial={{ height: 0 }} animate={{ height }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}
                    className={`w-full max-w-[28px] rounded-t-md ${
                      isCurrentMonth
                        ? "bg-primary"
                        : hasEvents
                          ? "bg-primary/40"
                          : "bg-muted"
                    }`}
                  />
                </div>
                <span className={`text-[10px] font-medium ${isCurrentMonth ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  {monthNames[i]}
                </span>
                {total > 0 && (
                  <span className="text-[9px] text-muted-foreground">{formatKr(total, locale.currencyLocale)}</span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Upcoming warnings */}
      {upcoming.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold">{t("wheel.upcoming")}</h3>
          </div>
          {upcoming.map((ev, i) => (
            <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" animate="visible"
              className="flex items-center gap-3 bg-background/50 rounded-xl p-3">
              <span className="text-lg">{ev.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ev.label}</p>
                <p className="text-[10px] text-muted-foreground">{monthNames[ev.month]}</p>
              </div>
              {ev.amount > 0 && (
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  {formatKr(ev.amount, locale.currencyLocale)} {t("currency")}
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Full timeline */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{t("wheel.fullYear")}</h3>
        {Array.from({ length: 12 }, (_, i) => {
          const monthEvents = byMonth.get(i) || [];
          if (monthEvents.length === 0) return null;
          const isPast = i < currentMonth;
          return (
            <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" animate="visible"
              className={`rounded-xl border border-border p-3 ${isPast ? "opacity-50" : ""} ${i === currentMonth ? "ring-1 ring-primary" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold ${i === currentMonth ? "text-primary" : "text-foreground"}`}>
                  {monthNames[i]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatKr(monthlyTotals[i], locale.currencyLocale)} {t("currency")}
                </span>
                {i === currentMonth && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{t("wheel.now")}</span>}
              </div>
              <div className="space-y-1">
                {monthEvents.map((ev, j) => (
                  <div key={j} className="flex items-center gap-2 text-xs">
                    <span>{ev.icon}</span>
                    <span className="flex-1 truncate text-muted-foreground">{ev.label}</span>
                    {ev.amount > 0 && <span className="font-medium">{formatKr(ev.amount, locale.currencyLocale)} {t("currency")}</span>}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">{t("wheel.disclaimer")}</p>
    </div>
  );
}
