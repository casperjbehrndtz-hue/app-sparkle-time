/**
 * Batch consent gallery — shows all redacted payslip previews in a grid.
 * User can toggle individual files on/off, then approve all at once.
 * Replaces the old per-file OcrConsentModal for batch flows.
 */
import { useState, useEffect } from "react";
import { Shield, Check, Eye, XCircle, ChevronDown, Clock, Trash2, Server, AlertTriangle } from "lucide-react";
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
import type { RedactedFile } from "@/hooks/usePayslipBatchOCR";

interface BatchConsentGalleryProps {
  open: boolean;
  files: RedactedFile[];
  onToggleFile: (index: number) => void;
  onAccept: () => void;
  onDecline: () => void;
}

const BatchConsentGallery = ({ open, files, onToggleFile, onAccept, onDecline }: BatchConsentGalleryProps) => {
  const { lang } = useI18n();
  const [understood, setUnderstood] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const da = lang === "da" || lang === "nb";

  useEffect(() => {
    if (open) {
      setUnderstood(false);
      setDetailsOpen(false);
    }
  }, [open]);

  const validFiles = files.filter((f) => !f.error);
  const includedCount = validFiles.filter((f) => !f.excluded).length;
  const totalRedactions = validFiles.reduce((sum, f) => sum + f.cprCount + f.accountCount, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDecline(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-display">
            {da ? `Tjek ${validFiles.length} slørede billeder` : `Check ${validFiles.length} redacted images`}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {da
              ? "Alle billeder er sløret automatisk. Fravælg dem du ikke vil sende, og godkend samlet."
              : "All images are auto-redacted. Deselect any you don't want to send, then approve together."}
          </DialogDescription>
        </DialogHeader>

        {/* Image grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file, i) => {
            if (file.error) {
              return (
                <div key={i} className="relative rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3 flex flex-col items-center justify-center gap-1.5 min-h-[120px]">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-[10px] text-red-500 text-center truncate w-full">{file.fileName}</span>
                  <span className="text-[10px] text-red-400">{file.error}</span>
                </div>
              );
            }

            const isIncluded = !file.excluded;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onToggleFile(i)}
                className={`relative rounded-lg border-2 overflow-hidden transition-all group cursor-pointer ${
                  isIncluded
                    ? "border-primary ring-1 ring-primary/20"
                    : "border-border opacity-50 grayscale"
                }`}
              >
                {file.base64 && (
                  <img
                    src={`data:image/jpeg;base64,${file.base64}`}
                    alt={file.fileName}
                    className="w-full h-auto max-h-[200px] object-contain bg-muted/20"
                  />
                )}

                {/* Overlay badge */}
                <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  isIncluded
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isIncluded ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                </div>

                {/* File name + redaction count */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-[10px] text-white truncate">{file.fileName}</p>
                  {(file.cprCount > 0 || file.accountCount > 0) && (
                    <p className="text-[9px] text-emerald-300">
                      {file.cprCount > 0 && `${file.cprCount} CPR`}
                      {file.cprCount > 0 && file.accountCount > 0 && " + "}
                      {file.accountCount > 0 && `${file.accountCount} ${da ? "kontonr" : "acct"}`}
                      {da ? " sløret" : " redacted"}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {da
              ? `${includedCount} af ${validFiles.length} billeder valgt`
              : `${includedCount} of ${validFiles.length} images selected`}
          </span>
          {totalRedactions > 0 && (
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" />
              {da
                ? `${totalRedactions} følsomme felter sløret`
                : `${totalRedactions} sensitive fields redacted`}
            </span>
          )}
        </div>

        {/* Privacy line */}
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
                    ? "Billederne sendes via sikker TLS til Anthropic's Claude API i USA. Overførsel baseret på EU-standardkontraktbestemmelser (SCCs), jf. GDPR art. 46(2)(c)."
                    : "Images sent via secure TLS to Anthropic's Claude API in the US. Transfer based on EU SCCs, GDPR art. 46(2)(c)."}
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
                    ? "NemtBudget gemmer aldrig dine billeder. Alt processeres i hukommelsen og kasseres efter svar."
                    : "NemtBudget never stores your images. Processed in memory and discarded after response."}
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
              ? `Jeg forstår at ${includedCount} billede${includedCount !== 1 ? "r" : ""} sendes til Anthropic (USA), opbevares maks. 7 dage, og ikke bruges til træning.`
              : `I understand that ${includedCount} image${includedCount !== 1 ? "s" : ""} will be sent to Anthropic (USA), retained max 7 days, and not used for training.`}
          </span>
        </label>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onAccept}
            disabled={!understood || includedCount === 0}
            className="flex-1 gap-2"
          >
            <Eye className="w-4 h-4" />
            {da
              ? `Scan ${includedCount} lønseddel${includedCount !== 1 ? "er" : ""}`
              : `Scan ${includedCount} payslip${includedCount !== 1 ? "s" : ""}`}
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

export default BatchConsentGallery;
