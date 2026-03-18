import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";

export function SuiteNav() {
  const config = useWhiteLabel();
  const { t } = useI18n();

  // Only show for default NemtBudget brand
  if (config.brandName !== "NemtBudget") return null;

  const suiteLinks = [
    { label: t("nav.budget"), href: "/", current: true, comingSoon: false },
    { label: t("nav.coupleFinance"), href: "#", current: false, comingSoon: true },
    { label: t("nav.childTax"), href: "#", current: false, comingSoon: true },
  ];

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="max-w-2xl mx-auto px-5 flex items-center gap-1 h-8 text-xs">
        {suiteLinks.map((link) =>
          link.comingSoon ? (
            <span
              key={link.label}
              className="px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1.5 opacity-50 cursor-default"
              aria-disabled="true"
            >
              {link.label}
              <span className="text-[8px] font-semibold bg-primary-foreground/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                {t("nav.comingSoon")}
              </span>
            </span>
          ) : (
            <a
              key={link.label}
              href={link.href}
              target={link.current ? undefined : "_blank"}
              rel={link.current ? undefined : "noopener noreferrer"}
              className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1.5 ${
                link.current
                  ? "font-semibold bg-primary-foreground/15"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              {link.label}
            </a>
          )
        )}
      </div>
    </div>
  );
}
