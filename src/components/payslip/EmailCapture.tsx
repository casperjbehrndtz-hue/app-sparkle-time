import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "nemtbudget_reminder_email";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function EmailCapture() {
  const { t, lang } = useI18n();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return;

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribe-reminder`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmed, locale: lang }),
      });

      if (!res.ok) throw new Error("Subscribe failed");

      try { localStorage.setItem(STORAGE_KEY, trimmed); } catch { /* */ }
      setSubmitted(true);
    } catch {
      // Fallback: save locally even if server fails
      try { localStorage.setItem(STORAGE_KEY, trimmed); } catch { /* */ }
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-center gap-3">
        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          {t("payslip.email.success")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">
          {t("payslip.email.heading")}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          {t("payslip.email.description")}
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("payslip.email.placeholder")}
            required
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            {t("payslip.email.submit")}
          </button>
        </form>

        <p className="text-[10px] text-muted-foreground/50">
          {t("payslip.email.privacy")}
        </p>
      </div>
    </div>
  );
}
