import { useEffect, useState, type ReactNode } from "react";
import { Lock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { isDonor } from "@/lib/donorMode";
import { DonorUnlockModal } from "./DonorUnlockModal";

interface DonorGateProps {
  children: ReactNode;
  /** Label shown on the lock overlay (e.g. "AI-rådgiver") */
  featureLabel?: string;
  /** Source key for analytics (e.g. "ai_chat", "history") */
  source?: string;
  /** If true, render only the gate UI when locked (hide children completely). If false, show children blurred under overlay. */
  blockWhenLocked?: boolean;
}

export function DonorGate({
  children,
  featureLabel,
  source = "gate",
  blockWhenLocked = true,
}: DonorGateProps) {
  const { t } = useI18n();
  const [donor, setDonorState] = useState<boolean>(() => isDonor());
  const [modalOpen, setModalOpen] = useState(false);

  // Re-check donor state when modal closes (donor-mode may have been activated)
  useEffect(() => {
    if (!modalOpen) {
      setDonorState(isDonor());
    }
  }, [modalOpen]);

  // Also listen for cross-tab donor activation
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "nb_donor_mode") {
        setDonorState(isDonor());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (donor) return <>{children}</>;

  const overlay = (
    <div className="border border-border bg-card p-6 sm:p-8 text-center">
      <div className="w-12 h-12 border border-border flex items-center justify-center mx-auto mb-3">
        <Lock className="w-5 h-5 text-foreground" />
      </div>
      {featureLabel && (
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {featureLabel}
        </p>
      )}
      <h3 className="text-base font-semibold text-foreground mb-2">
        {t("donorGate.lockedTitle")}
      </h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto leading-relaxed">
        {t("donorGate.lockedSubtitle")}
      </p>
      <Button
        onClick={() => setModalOpen(true)}
        className="rounded-none gap-2"
      >
        <Heart className="w-4 h-4" />
        {t("donorGate.unlockCta")}
      </Button>
      <DonorUnlockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        source={source}
        onUnlocked={() => setDonorState(true)}
      />
    </div>
  );

  if (blockWhenLocked) return overlay;

  // Non-blocking: render children blurred under overlay
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {overlay}
      </div>
    </div>
  );
}

export default DonorGate;
