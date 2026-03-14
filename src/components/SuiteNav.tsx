import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";

export function SuiteNav() {
  const config = useWhiteLabel();
  const { t } = useI18n();

  // Only show for default Kassen brand
  if (config.brandName !== "Kassen") return null;

  const suiteLinks = [
    { label: t("nav.budget"), href: "/", current: true, comingSoon: false },
    { label: t("nav.coupleFinance"), href: "#", current: false, comingSoon: true },
    { label: t("nav.childTax"), href: "#", current: false, comingSoon: true },
  ];

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="max-w-2xl mx-auto px-5 flex items-center gap-1 h-8 text-[11px]">
        {suiteLinks.map((link) => (
          <a
            key={link.label}
            href={link.comingSoon ? undefined : link.href}
            target={link.current || link.comingSoon ? undefined : "_blank"}
            rel={link.current || link.comingSoon ? undefined : "noopener noreferrer"}
            className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1.5 ${
              link.current
                ? "font-semibold bg-primary-foreground/15"
                : link.comingSoon
                ? "opacity-50 cursor-default"
                : "opacity-70 hover:opacity-100"
            }`}
            onClick={link.comingSoon ? (e) => e.preventDefault() : undefined}
          >
            {link.label}
            {link.comingSoon && (
              <span className="text-[8px] font-semibold bg-primary-foreground/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                {t("nav.comingSoon")}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
