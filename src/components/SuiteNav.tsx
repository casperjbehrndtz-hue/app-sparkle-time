import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";

export function SuiteNav() {
  const config = useWhiteLabel();
  const { t } = useI18n();

  // Only show for default NemtBudget brand
  if (config.brandName !== "NemtBudget") return null;

  const suiteLinks = [
    { label: t("nav.budget"), href: "/", current: true, external: false },
    { label: t("nav.guides") || "Guides", href: "/guides", current: false, external: false },
    { label: t("nav.coupleFinance"), href: "https://www.parfinans.dk", current: false, external: true },
    { label: t("nav.childTax"), href: "https://xn--brneskat-54a.dk", current: false, external: true },
  ];

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="max-w-2xl mx-auto px-5 flex items-center gap-1 h-8 text-xs">
        {suiteLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className={`px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1.5 ${
              link.current
                ? "font-semibold bg-primary-foreground/15"
                : "opacity-70 hover:opacity-100"
            }`}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
