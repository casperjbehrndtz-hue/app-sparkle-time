import { useWhiteLabel } from "@/lib/whiteLabel";

const suiteLinks = [
  { label: "Budget", href: "/", current: true },
  { label: "Parøkonomi", href: "https://parfinans.dk", current: false },
  { label: "Børneskat", href: "https://boerneskat.dk", current: false },
];

export function SuiteNav() {
  const config = useWhiteLabel();

  // Only show for default Kassen brand
  if (config.brandName !== "Kassen") return null;

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
