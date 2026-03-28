import { useI18n } from "@/lib/i18n";

const SUITE_LINKS = [
  { label: "NemtBudget", href: "/", current: true, external: false },
  { label: "ParFinans", href: "https://parfinans.dk", current: false, external: true },
  { label: "Børneskat", href: "https://xn--brneskat-54a.dk", current: false, external: true },
  { label: "Institutionsguide", href: "https://institutionsguide.dk", current: false, external: true },
];

export function SuiteNav() {
  const { t } = useI18n();

  return (
    <div className="bg-primary/90 text-primary-foreground text-[10px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-6 flex items-center justify-end gap-3">
        <span className="text-primary-foreground/70 hidden sm:inline">
          {t("suite.partOf") || "Del af"}
        </span>
        {SUITE_LINKS.map((link, i) => (
          <span key={link.label} className="inline-flex items-center gap-3">
            {i > 0 && <span className="text-primary-foreground/40">·</span>}
            {link.current ? (
              <span className="text-primary-foreground font-medium">{link.label}</span>
            ) : (
              <a
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="text-primary-foreground/70 hover:text-primary-foreground no-underline transition-all duration-300 font-medium"
              >
                {link.label}
              </a>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
