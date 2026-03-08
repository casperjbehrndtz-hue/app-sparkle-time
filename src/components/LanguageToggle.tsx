import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <button
      onClick={() => setLang(lang === "da" ? "en" : "da")}
      className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2 py-1.5 rounded-lg hover:bg-muted"
      aria-label={lang === "da" ? "Switch to English" : "Skift til dansk"}
      title={lang === "da" ? "Switch to English" : "Skift til dansk"}
    >
      <Globe className="w-3 h-3" />
      <span className="uppercase font-medium">{lang === "da" ? "EN" : "DA"}</span>
    </button>
  );
}
