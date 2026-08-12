import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const MOBILEPAY_BOX = "4266mc";
const MOBILEPAY_URL = `https://mobilepay.dk/box/${MOBILEPAY_BOX}`;

interface SupportBannerProps {
  source?: string;
}

function trackSupport(event: string, source: string) {
  try {
    const ph = (window as unknown as { posthog?: { capture: (e: string, p: Record<string, unknown>) => void } }).posthog;
    ph?.capture(event, { source });
  } catch {
    /* no-op */
  }
}

export function SupportBanner({ source = "dashboard" }: SupportBannerProps) {
  const { t } = useI18n();

  return (
    <section className="max-w-5xl mx-auto px-6 py-8">
      <div className="border border-border bg-card p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="w-10 h-10 border border-border flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground mb-1">{t("support.title")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("support.subtitle")}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{t("support.hint")}</p>
          </div>
          <Button asChild size="default" variant="outline" className="rounded-none shrink-0">
            <a
              href={MOBILEPAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSupport("support_clicked", source)}
              className="gap-2"
            >
              <Heart className="w-4 h-4" />
              {t("support.cta")}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default SupportBanner;
