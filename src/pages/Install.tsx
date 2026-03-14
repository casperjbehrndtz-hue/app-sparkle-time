import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, CheckCircle, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useI18n } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();
  usePageMeta(
    t("install.pageTitle"),
    t("install.pageDesc")
  );

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          {installed ? (
            <CheckCircle className="w-10 h-10 text-primary" />
          ) : (
            <Smartphone className="w-10 h-10 text-primary" />
          )}
        </div>

        <div>
          <h1 className="font-display font-black text-2xl text-foreground mb-2">
            {installed ? t("install.installed") : t("install.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {installed
              ? t("install.installedDesc")
              : t("install.desc")}
          </p>
        </div>

        {installed ? (
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            {t("install.goToApp")}
          </button>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t("install.installNow")}
          </button>
        ) : isIOS ? (
          <div className="rounded-xl border border-border bg-card p-5 text-left space-y-3">
            <p className="text-sm font-medium text-foreground">{t("install.iosTitle")}</p>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="font-bold text-foreground">1.</span>
                {t("install.iosStep1")} <span className="inline-flex items-center px-1.5 py-0.5 bg-muted rounded text-xs font-medium">{t("install.iosStep1Share")}</span> {t("install.iosStep1Suffix")}
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-foreground">2.</span>
                {t("install.iosStep2")}
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-foreground">3.</span>
                {t("install.iosStep3")}
              </li>
            </ol>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            {t("install.openInBrowser")}
          </div>
        )}

        <button
          onClick={() => navigate("/")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("install.back")}
        </button>
      </motion.div>
    </div>
  );
};

export default Install;
