import { useI18n } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import { Globe } from "lucide-react";

// Build-time primary language — locale is fixed per deployment
const BUILD_LOCALE = (import.meta.env.VITE_LOCALE ?? "da") as "da" | "no";
const PRIMARY_LANG: Language = BUILD_LOCALE === "no" ? "nb" : "da";

const LABELS: Record<Language, string> = { da: "DA", en: "EN", nb: "NO" };

export function LanguageToggle() {
  const { lang, setLang } = useI18n();

  const handleClick = () => {
    setLang(lang === "en" ? PRIMARY_LANG : "en");
  };

  const nextLabel = lang === "en" ? LABELS[PRIMARY_LANG] : "EN";

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2 py-1.5 rounded-lg hover:bg-muted"
      aria-label={`Switch to ${nextLabel}`}
      title={`Switch to ${nextLabel}`}
    >
      <Globe className="w-3 h-3" />
      <span className="uppercase font-medium">{LABELS[lang]}</span>
    </button>
  );
}
