import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "nb_theme";

export function DarkModeToggle() {
  const { t } = useI18n();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved === "dark";
    // Auto-detect system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-muted"
      aria-label={dark ? t("darkMode.switchToLight") : t("darkMode.switchToDark")}
    >
      {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </button>
  );
}
