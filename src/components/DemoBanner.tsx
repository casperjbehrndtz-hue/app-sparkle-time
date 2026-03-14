import { useState } from "react";
import { X, Target, Play } from "lucide-react";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";

const SESSION_KEY = "kassen_demo_banner_dismissed";

interface DemoBannerProps {
  brandName?: string;
}

export function DemoBanner({ brandName }: DemoBannerProps) {
  const config = useWhiteLabel();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true"
  );

  if (dismissed) return null;

  const displayBrand = brandName || config.brandName;

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="sticky top-0 z-[100] bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-amber-950 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Target className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium truncate">
            {t("demo.text").replace("{brand}", displayBrand)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="mailto:casper@kassen.dk?subject=B2B%20Demo%20interesse"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-950 text-amber-100 text-xs font-semibold rounded-md hover:bg-amber-900 transition-colors"
          >
            {t("demo.bookPresentation")}
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 text-amber-950 text-xs font-semibold rounded-md hover:bg-white transition-colors"
          >
            <Play className="h-3 w-3" />
            {t("demo.trySelf")}
          </a>
          <button
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-amber-600/30 transition-colors"
            aria-label={t("demo.closeBanner")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
