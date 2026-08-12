import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Gift, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { setDonor, DONOR_MOBILEPAY_URL, DONOR_MIN_AMOUNT } from "@/lib/donorMode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function trackEvent(event: string, source: string) {
  try {
    const ph = (window as unknown as { posthog?: { capture: (e: string, p: Record<string, unknown>) => void } }).posthog;
    ph?.capture(event, { source, amount_min: DONOR_MIN_AMOUNT });
  } catch {
    /* no-op */
  }
}

type Step = "ask" | "awaiting" | "thanks";

interface DonorUnlockModalProps {
  open: boolean;
  onClose: () => void;
  /** Source feature that triggered the modal — for analytics */
  source?: string;
  /** Called after user confirms they donated (donor-mode now active) */
  onUnlocked?: () => void;
}

export function DonorUnlockModal({ open, onClose, source = "modal", onUnlocked }: DonorUnlockModalProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("ask");

  const features = [
    t("donorUnlock.feature1"),
    t("donorUnlock.feature2"),
    t("donorUnlock.feature3"),
    t("donorUnlock.feature4"),
  ];

  const handleDonate = () => {
    trackEvent("donor_donate_clicked", source);
    window.open(DONOR_MOBILEPAY_URL, "_blank", "noopener,noreferrer");
    setStep("awaiting");
  };

  const handleConfirmDonated = () => {
    trackEvent("donor_confirmed", source);
    setDonor(true);
    setStep("thanks");
  };

  const handleNotYet = () => {
    trackEvent("donor_not_yet", source);
    setStep("ask");
  };

  const handleClose = () => {
    setStep("ask");
    onClose();
    if (step === "thanks") onUnlocked?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("donorUnlock.title")}</DialogTitle>
          <DialogDescription>{t("donorUnlock.description")}</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "ask" && (
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
                  {t("donorUnlock.headline")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {t("donorUnlock.subhead")}
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
                  {t("donorUnlock.askTitle")}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("donorUnlock.askSubtitle")}
                </p>

                <Button
                  onClick={handleDonate}
                  className="w-full h-12 text-base font-semibold rounded-none gap-2"
                >
                  <Heart className="w-4 h-4" />
                  {t("donorUnlock.donateCta")}
                </Button>

                <button
                  onClick={handleClose}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-2 w-full"
                >
                  {t("donorUnlock.skipCta")}
                </button>
              </div>
            </motion.div>
          )}

          {step === "awaiting" && (
            <motion.div
              key="awaiting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/15">
                <Heart className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t("donorUnlock.awaitingTitle")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs mx-auto">
                {t("donorUnlock.awaitingSubtitle")}
              </p>

              <div className="space-y-2">
                <Button
                  onClick={handleConfirmDonated}
                  className="w-full h-12 text-base font-semibold rounded-none gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t("donorUnlock.confirmCta")}
                </Button>
                <button
                  onClick={handleNotYet}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-2 w-full"
                >
                  {t("donorUnlock.notYetCta")}
                </button>
              </div>
            </motion.div>
          )}

          {step === "thanks" && (
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
                {t("donorUnlock.thanksTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                {t("donorUnlock.thanksSubtitle")}
              </p>
              <Button onClick={handleClose} className="gap-2 rounded-none">
                {t("donorUnlock.getStartedCta")} <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default DonorUnlockModal;
