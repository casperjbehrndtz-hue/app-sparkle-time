import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { inject } from "@vercel/analytics";
import { useI18n } from "@/lib/i18n";

const COOKIE_KEY = "kassen_cookie_consent";

function activateAnalytics() {
  try { inject(); } catch { /* already injected */ }
}

export function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (consent === "accepted") {
      // Returning visitor who already consented — activate immediately
      activateAnalytics();
    } else if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    // "declined" → do nothing
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
    activateAnalytics();
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label={t("cookie.consent")}
          aria-describedby="cookie-banner-text"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[200] p-4"
        >
          <div className="max-w-lg mx-auto bg-card border border-border rounded-xl shadow-lg p-4 space-y-3">
            <p id="cookie-banner-text" className="text-sm text-foreground">
              🍪 {t("cookie.text")}{" "}
              <a href="/privatliv" className="text-primary underline underline-offset-2 hover:text-primary/80">
                {t("cookie.readMore")}
              </a>
            </p>
            <div className="flex gap-2">
              <button
                onClick={accept}
                aria-label={t("cookie.acceptAnalytics")}
                className="flex-1 bg-primary text-primary-foreground text-sm font-medium py-2 rounded-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t("cookie.accept")}
              </button>
              <button
                onClick={decline}
                aria-label={t("cookie.declineAnalytics")}
                className="flex-1 bg-muted text-muted-foreground text-sm font-medium py-2 rounded-lg hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("cookie.decline")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
