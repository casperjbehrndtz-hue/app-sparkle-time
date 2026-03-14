import { DA } from "@/lib/texts.da";
import { EN } from "@/lib/texts.en";
import { NO } from "@/lib/texts.no";

function getStaticT(): (key: string) => string {
  try {
    const saved = localStorage.getItem("kassen_lang");
    if (saved === "en") return (key: string) => EN[key] ?? DA[key] ?? key;
  } catch {}
  const buildLocale = (import.meta.env.VITE_LOCALE ?? "da") as string;
  if (buildLocale === "no") return (key: string) => NO[key] ?? key;
  return (key: string) => DA[key] ?? key;
}

export function PageLoader() {
  const t = getStaticT();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{t("loader.loading")}</p>
      </div>
    </div>
  );
}
