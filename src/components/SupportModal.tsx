import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Gift, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const MOBILEPAY_BOX = "4266mc";
const MOBILEPAY_URL = `https://mobilepay.dk/box/${MOBILEPAY_BOX}`;
const SEEN_KEY = "nb_support_seen";

function trackSupport(event: string, source: string) {
  try {
    const ph = (window as unknown as { posthog?: { capture: (e: string, p: Record<string, unknown>) => void } }).posthog;
    ph?.capture(event, { source });
  } catch {
    /* no-op */
  }
}

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
  source?: string;
}

export function SupportModal({ open, onClose, source = "modal" }: SupportModalProps) {
  const { t } = useI18n();
  const [donated, setDonated] = useState(false);

  const features = [
    t("supportModal.feature1"),
    t("supportModal.feature2"),
    t("supportModal.feature3"),
    t("supportModal.feature4"),
  ];

  const handleDonate = () => {
    trackSupport("support_clicked", source);
    window.open(MOBILEPAY_URL, "_blank", "noopener,noreferrer");
    setDonated(true);
  };

  const handleSkip = () => {
    trackSupport("support_dismissed", source);
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    onClose();
  };

  const handleClose = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("supportModal.title")}</DialogTitle>
          <DialogDescription>{t("supportModal.description")}</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!donated ? (
            <motion.div
              key="ask"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-8"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/15">
                  <Gift className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {t("supportModal.fullAccessTitle")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {t("supportModal.fullAccessSubtitle")}
                </p>
              </div>

              <div className="border border-border bg-muted/20 p-4 mb-6">
                <div className="space-y-2">
                  {features.map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs text-foreground/80">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center space-y-3">
                <p className="text-sm text-foreground font-medium">
                  {t("supportModal.askTitle")}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("supportModal.askSubtitle")}
                </p>

                <Button
                  onClick={handleDonate}
                  className="w-full h-12 text-base font-semibold rounded-none gap-2"
                >
                  <Heart className="w-4 h-4" />
                  {t("supportModal.donateButton")}
                </Button>

                <button
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-2 w-full"
                >
                  {t("supportModal.skipButton")}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="thanks"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 sm:p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-7 h-7 text-primary" fill="currentColor" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t("supportModal.thanksTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                {t("supportModal.thanksSubtitle")}
              </p>
              <Button onClick={handleClose} className="gap-2 rounded-none">
                {t("supportModal.getStarted")} <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default SupportModal;
