import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { inject } from "@vercel/analytics";
import { useI18n } from "@/lib/i18n";
import { Cookie } from "lucide-react";

const COOKIE_KEY = "nb_cookie_consent";

function activateAnalytics() {
  try { inject(); } catch { /* already injected */ }
}

/** Dispatch this event from anywhere to re-open the cookie banner. */
export function openCookieBanner() {
  window.dispatchEvent(new CustomEvent("open-cookie-banner"));
}

export function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  const show = useCallback(() => setVisible(true), []);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (consent === "accepted") {
      activateAnalytics();
      setHasConsented(true);
    } else if (consent === "declined") {
      setHasConsented(true);
    } else {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for external requests to re-open the banner
  useEffect(() => {
    window.addEventListener("open-cookie-banner", show);
    return () => window.removeEventListener("open-cookie-banner", show);
  }, [show]);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
    setHasConsented(true);
    activateAnalytics();
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
    setHasConsented(true);
  };

  return (
    <>
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

      {/* Persistent small cookie-settings button after consent has been given */}
      <AnimatePresence>
        {hasConsented && !visible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={show}
            aria-label={t("cookie.settings")}
            title={t("cookie.settings")}
            className="fixed bottom-4 left-4 z-[190] w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Cookie className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
