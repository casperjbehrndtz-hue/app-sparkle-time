import { useState, useMemo } from "react";
import { X, Sparkles, User, Briefcase, MapPin, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { formatKr } from "@/lib/budgetCalculator";
import { calculateHealth } from "@/lib/healthScore";
import { deriveProfileTags, type ShareMeta } from "@/lib/budgetShare";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";

const SESSION_KEY = "nb_shared_banner_dismissed";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  meta: ShareMeta;
}

export function SharedBudgetBanner({ profile, budget, meta }: Props) {
  const { t } = useI18n();
  const locale = useLocale();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true"
  );

  const health = useMemo(() => calculateHealth(profile, budget), [profile, budget]);
  const autoTags = deriveProfileTags(profile, t);

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setDismissed(true);
  };

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (health.score / 100) * circumference;
  const ringColor = health.score >= 75 ? "#93c5fd" : health.score >= 55 ? "#fbbf24" : "#fca5a5";

  return (
    <div className="sticky top-0 z-[100] bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 text-white shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-3 space-y-2.5">
        {/* Top: label + CTA */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-white/50">
            {t("shared.banner")}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 text-xs font-semibold rounded-md hover:bg-blue-50 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              {t("shared.bannerCta")}
            </a>
            <button
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              aria-label={t("shared.closeBanner")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Score ring + key stats + tags */}
        <div className="flex items-center gap-3">
          {/* Health score ring */}
          <div className="relative shrink-0">
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
              <circle
                cx="24" cy="24" r={radius}
                fill="none" stroke={ringColor} strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 24 24)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-black text-sm leading-none">{health.score}</span>
              <span className="text-[6px] text-white/60 uppercase tracking-wider">{health.label}</span>
            </div>
          </div>

          {/* Stats + tags */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Key stats inline */}
            <div className="flex gap-3 text-[10px]">
              <span><span className="text-white/50">{t("cockpit.income")}:</span> <span className="font-bold">{formatKr(budget.totalIncome, locale.currencyLocale)}</span></span>
              <span><span className="text-white/50">{t("cockpit.disposable")}:</span> <span className={`font-bold ${budget.disposableIncome < 0 ? "text-red-300" : ""}`}>{budget.disposableIncome >= 0 ? "+" : ""}{formatKr(budget.disposableIncome, locale.currencyLocale)}</span></span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {autoTags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded-full bg-white/15 text-[9px] font-medium">
                  {tag}
                </span>
              ))}
              {meta.age && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[9px] font-medium inline-flex items-center gap-0.5">
                  <User className="w-2 h-2" />{meta.age} {t("share.tagYears")}
                </span>
              )}
              {meta.job && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[9px] font-medium inline-flex items-center gap-0.5">
                  <Briefcase className="w-2 h-2" />{meta.job}
                </span>
              )}
              {meta.city && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[9px] font-medium inline-flex items-center gap-0.5">
                  <MapPin className="w-2 h-2" />{meta.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Question */}
        {meta.question && (
          <div className="flex items-start gap-2 bg-white/10 rounded-lg px-3 py-2">
            <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/60" />
            <p className="text-sm font-medium leading-snug">{meta.question}</p>
          </div>
        )}

      </div>
    </div>
  );
}
