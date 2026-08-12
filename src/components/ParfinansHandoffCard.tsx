import { ArrowRight, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { buildParFinansHandoffUrl } from "@/lib/parfinans-handoff";
import type { BudgetProfile } from "@/lib/types";

function trackEvent(target: string) {
  try {
    const ph = (window as unknown as { posthog?: { capture: (e: string, p: Record<string, unknown>) => void } }).posthog;
    ph?.capture("cta_clicked", { source: "dashboard", target });
  } catch {
    /* no-op */
  }
}

interface ParfinansHandoffCardProps {
  profile: BudgetProfile;
}

/**
 * Cross-suite CTA: invite user to see fair-split analysis in ParFinans.
 * Only shown for couples (householdType === "par") — singles have no use for couples calculator.
 */
export function ParfinansHandoffCard({ profile }: ParfinansHandoffCardProps) {
  const { t } = useI18n();
  if (profile.householdType !== "par") return null;

  return (
    <section className="max-w-5xl mx-auto px-6 py-6">
      <a
        href={buildParFinansHandoffUrl(profile)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("parfinans_handoff")}
        className="block no-underline border border-border bg-card hover:border-primary/40 transition-colors p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="w-10 h-10 border border-border flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground mb-1">
              {t("parfinansHandoff.title")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("parfinansHandoff.subtitle")}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground shrink-0">
            {t("parfinansHandoff.cta")}
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </span>
        </div>
      </a>
    </section>
  );
}

export default ParfinansHandoffCard;
