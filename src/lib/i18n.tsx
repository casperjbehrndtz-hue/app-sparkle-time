import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { DA } from "./texts.da";
import { NO } from "./texts.no";

// Build-time locale — set via VITE_LOCALE env var
// VITE_LOCALE=da  →  nemtbudget.nu (Danish)
// VITE_LOCALE=no  →  nemtbudget.nu (Norwegian)
const BUILD_LOCALE = (import.meta.env.VITE_LOCALE ?? "da") as "da" | "no";

export type Language = "da" | "en" | "nb";

const DEFAULT_LANG: Language = BUILD_LOCALE === "no" ? "nb" : "da";
const primaryTexts: Record<string, string> = BUILD_LOCALE === "no" ? NO : DA;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = "nb_lang";

const I18nContext = createContext<I18nContextType>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => primaryTexts[key] ?? key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const enTextsRef = useRef<Record<string, string> | null>(null);

  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en") return "en";
    } catch {}
    return DEFAULT_LANG;
  });

  // Lazy-load English texts only when needed
  useEffect(() => {
    if (lang === "en" && !enTextsRef.current) {
      import("./texts.en").then((mod) => {
        enTextsRef.current = mod.EN;
        // Force re-render so t() picks up the loaded texts
        setLangState("en");
      });
    }
  }, [lang]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
    document.documentElement.lang = l === "nb" ? "no" : l;
  }, []);

  const t = useCallback((key: string): string => {
    if (lang === "en" && enTextsRef.current) return enTextsRef.current[key] ?? primaryTexts[key] ?? key;
    return primaryTexts[key] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
