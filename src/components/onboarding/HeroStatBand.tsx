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
    <section
      aria-label={t("statBand.aria")}
      className="bg-hero-navy text-white"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={item.label}
              className={
                i > 0
                  ? "sm:pl-8 sm:border-l sm:border-white/15 pt-6 sm:pt-0 mt-6 sm:mt-0 border-t sm:border-t-0 border-white/10"
                  : "sm:pr-8"
              }
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-medium mb-3">
                {item.label}
              </p>
              <p className="text-5xl sm:text-6xl font-semibold tracking-tight tabular-nums leading-none mb-3 relative inline-block">
                {item.value}
                {item.emphasis && (
                  <span aria-hidden="true" className="absolute -bottom-1.5 left-0 right-0 h-[3px] bg-nemt-gold" />
                )}
              </p>
              <p className="text-sm text-white/75 leading-relaxed max-w-[18rem]">
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
