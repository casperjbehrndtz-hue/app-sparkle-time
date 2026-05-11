import { useI18n } from "@/lib/i18n";

/**
 * Full-bleed navy stat-band under the hero. Three concrete anchor figures
 * with hairline dividers and an accent underline on the load-bearing
 * privacy figure. Same composition pattern as Børneskat / ParFinans.
 */
const HeroStatBand = () => {
  const { t } = useI18n();

  const items = [
    { label: t("statBand.timeLabel"), value: t("statBand.timeValue"), desc: t("statBand.timeDesc"), emphasis: false },
    { label: t("statBand.privacyLabel"), value: t("statBand.privacyValue"), desc: t("statBand.privacyDesc"), emphasis: true },
    { label: t("statBand.coverageLabel"), value: t("statBand.coverageValue"), desc: t("statBand.coverageDesc"), emphasis: false },
  ];

  return (
    <section aria-label={t("statBand.aria")} className="bg-hero-navy text-white border-y border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-white/55 font-medium mb-1 truncate">
                {item.label}
              </p>
              <p className="text-xl sm:text-2xl font-semibold tracking-tight tabular-nums leading-none">
                {item.value}
              </p>
              <p className="hidden sm:block text-xs text-white/65 leading-snug mt-1.5 truncate">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroStatBand;
