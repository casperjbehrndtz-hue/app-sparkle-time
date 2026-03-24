import { useState, useEffect } from "react";
import { Shield, Eye, Clock, Trash2, Server, Check, ChevronDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

interface OcrConsentModalProps {
  open: boolean;
  /** "payslip" or "bank" — changes the wording slightly */
  type: "payslip" | "bank";
  /** Base64 of the redacted image (optional — only for images, not PDFs) */
  redactedPreview?: string;
  /** How many CPR patterns were auto-redacted */
  cprCount?: number;
  /** How many account patterns were auto-redacted */
  accountCount?: number;
  /** True if the uploaded file is a PDF */
  isPdf?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const OcrConsentModal = ({ open, type, redactedPreview, cprCount = 0, accountCount = 0, isPdf, onAccept, onDecline }: OcrConsentModalProps) => {
  const { t, lang } = useI18n();
  const [understood, setUnderstood] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setUnderstood(false);
      setDetailsOpen(false);
    }
  }, [open]);
  const da = lang === "da" || lang === "nb";

  const docLabel = type === "payslip"
    ? (da ? "din lønseddel" : "your payslip")
    : (da ? "dit kontoudtog" : "your bank statement");

  const hasRedactions = cprCount > 0 || accountCount > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDecline(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-display">
            {da ? "Tjek billedet inden vi scanner" : "Check the image before we scan"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {da
              ? "Dette er præcis det billede der sendes. Sorte felter kan ikke genskabes."
              : "This is exactly the image that will be sent. Black boxes cannot be reversed."}
          </DialogDescription>
        </DialogHeader>

        {/* Redacted image preview — large and prominent */}
        {redactedPreview && (
          <div className="space-y-2">
            <div className="relative rounded-lg border border-border overflow-hidden bg-muted/20">
              <img
                src={`data:image/jpeg;base64,${redactedPreview}`}
                alt={da ? "Sløret billede der sendes" : "Redacted image to be sent"}
                className="w-full h-auto max-h-[50vh] object-contain"
              />
            </div>
            {hasRedactions ? (
              <div className="flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  {da
                    ? `${cprCount} CPR-nr. og ${accountCount} kontonr. automatisk sløret`
                    : `${cprCount} CPR no. and ${accountCount} account no. auto-redacted`}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  {da
                    ? "Ingen CPR-numre fundet — tjek selv at følsomme data er dækket"
                    : "No CPR numbers found — check that sensitive data is covered"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Compact privacy summary — one line with expandable details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>
              {da
                ? "Sendes krypteret til Anthropic (USA) · slettet efter 7 dage · bruges ikke til træning"
                : "Sent encrypted to Anthropic (USA) · deleted after 7 days · not used for training"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
            {da ? "Vis detaljer" : "Show details"}
          </button>

          {detailsOpen && (
            <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 text-xs">
                <Server className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  {da
                    ? "Billedet sendes via sikker TLS til Anthropic's Claude API i USA. Overførsel baseret på EU-standardkontraktbestemmelser (SCCs), jf. GDPR art. 46(2)(c)."
                    : "Image sent via secure TLS to Anthropic's Claude API in the US. Transfer based on EU SCCs, GDPR art. 46(2)(c)."}
                </p>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 text-xs">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  {da
                    ? "Anthropic opbevarer API-input i op til 7 dage, herefter automatisk sletning. Data bruges IKKE til modeltræning."
                    : "Anthropic retains API input up to 7 days, then auto-deleted. NOT used for model training."}
                </p>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 text-xs">
                <Trash2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">
                  {da
                    ? "NemtBudget gemmer aldrig dit billede. Alt processeres i hukommelsen og kasseres efter svar."
                    : "NemtBudget never stores your image. Processed in memory and discarded after response."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Consent checkbox */}
        <label className="flex items-start gap-3 cursor-pointer py-2 border-t border-border">
          <Checkbox
            checked={understood}
            onCheckedChange={(v) => setUnderstood(v === true)}
            className="mt-0.5"
          />
          <span className="text-xs text-foreground leading-relaxed">
            {da
              ? `Jeg forstår at billedet af ${docLabel} sendes til Anthropic (USA), opbevares maks. 7 dage, og ikke bruges til træning.`
              : `I understand the image of ${docLabel} is sent to Anthropic (USA), retained max 7 days, and not used for training.`}
          </span>
        </label>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onAccept}
            disabled={!understood}
            className="flex-1 gap-2"
          >
            <Eye className="w-4 h-4" />
            {da ? "Scan" : "Scan"} {docLabel}
          </Button>
          <Button variant="ghost" onClick={onDecline} className="text-muted-foreground">
            {da ? "Annuller" : "Cancel"}
          </Button>
        </div>

        {/* DPA link */}
        <p className="text-[10px] text-muted-foreground/50 text-center">
          <a
            href="https://www.anthropic.com/legal/data-processing-addendum"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-muted-foreground"
          >
            Anthropic DPA
          </a>
          {" · "}
          <a href="/privatliv" className="underline hover:text-muted-foreground">
            {da ? "Privatlivspolitik" : "Privacy Policy"}
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default OcrConsentModal;
