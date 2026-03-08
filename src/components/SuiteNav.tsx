import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";

export function SuiteNav() {
  const config = useWhiteLabel();
  const { t } = useI18n();

  // Only show for default Kassen brand
  if (config.brandName !== "Kassen") return null;

  const suiteLinks = [
    { label: t("nav.budget"), href: "/", current: true },
    { label: t("nav.coupleFinance"), href: "https://parfinans.dk", current: false },
    { label: t("nav.childTax"), href: "https://boerneskat.dk", current: false },
  ];

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="max-w-2xl mx-auto px-5 flex items-center gap-1 h-8 text-[11px]">
        {suiteLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.current ? undefined : "_blank"}
            rel={link.current ? undefined : "noopener noreferrer"}
            className={`px-2.5 py-1 rounded transition-colors ${
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
