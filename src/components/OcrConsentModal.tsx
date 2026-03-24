import { useState } from "react";
import { Shield, Eye, Clock, Trash2, Server, Check, FileText } from "lucide-react";
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
            {da ? "Før vi scanner" : "Before we scan"} {docLabel}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {redactedPreview
              ? (da ? "Tjek billedet herunder og læs betingelserne inden du fortsætter." : "Check the image below and read the conditions before continuing.")
              : (da ? "Læs venligst nedenstående inden du fortsætter." : "Please read the following before continuing.")}
          </DialogDescription>
        </DialogHeader>

        {/* Redacted image preview */}
        {redactedPreview && (
          <div className="space-y-2">
            <div className="relative rounded-lg border border-border overflow-hidden bg-muted/20">
              <img
                src={`data:image/jpeg;base64,${redactedPreview}`}
                alt={da ? "Sløret billede der sendes" : "Redacted image to be sent"}
                className="w-full h-auto max-h-56 object-contain"
              />
            </div>
            {hasRedactions && (
              <div className="flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  {da
                    ? `${cprCount} CPR-nr. og ${accountCount} kontonr. sløret`
                    : `${cprCount} CPR no. and ${accountCount} account no. redacted`}
                </span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground text-center">
              {da
                ? "↑ Dette er præcis det billede der sendes. Sorte felter kan ikke genskabes."
                : "↑ This is exactly the image that will be sent. Black boxes cannot be reversed."}
            </p>
          </div>
        )}

        {/* PDF notice */}
        {isPdf && !redactedPreview && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {da ? "PDF-fil uploadet" : "PDF file uploaded"}
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                {da
                  ? "Vi kan ikke vise et preview af PDF'er, og CPR-numre kan ikke auto-sløres i PDF-filer. Sørg selv for at følsomme data er fjernet inden upload."
                  : "We cannot preview PDFs, and CPR numbers cannot be auto-redacted in PDF files. Make sure sensitive data is removed before uploading."}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3 my-2">
          {/* CPR auto-redaction — only show if no preview and not PDF */}
          {!redactedPreview && !isPdf && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
            <Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {da ? "CPR-numre sløres automatisk" : "CPR numbers auto-redacted"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {da
                  ? "Vi kører lokal tekstgenkendelse i din browser (Tesseract.js) og maler sort over CPR-numre og kontonumre FØR billedet forlader din enhed."
                  : "We run local text recognition in your browser (Tesseract.js) and paint over CPR and account numbers BEFORE the image leaves your device."}
              </p>
            </div>
          </div>
          )}

          {/* Where data goes */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Server className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {da ? "Billedet sendes til Anthropic (USA)" : "Image sent to Anthropic (USA)"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {da
                  ? "Det slørede billede sendes via sikker TLS-forbindelse til Anthropic's Claude API i USA for at aflæse tal. Overførsel sker på baggrund af EU-Kommissionens standardkontraktbestemmelser (SCCs), jf. GDPR art. 46(2)(c)."
                  : "The redacted image is sent via secure TLS to Anthropic's Claude API in the US. Transfer based on EU Standard Contractual Clauses (SCCs), GDPR art. 46(2)(c)."}
              </p>
            </div>
          </div>

          {/* Retention */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {da ? "Opbevares maks. 7 dage" : "Retained max 7 days"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {da
                  ? "Anthropic opbevarer API-input i op til 7 dage jf. deres API-vilkår, herefter automatisk sletning. Data bruges IKKE til modeltræning."
                  : "Anthropic retains API input for up to 7 days per their API terms, then auto-deleted. Data is NOT used for model training."}
              </p>
            </div>
          </div>

          {/* No persistence */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Trash2 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {da ? "Vi gemmer ingenting" : "We store nothing"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {da
                  ? "NemtBudget gemmer aldrig dit billede, din lønseddel eller dit kontoudtog. Alt processeres i hukommelsen og kasseres efter svar."
                  : "NemtBudget never stores your image. Everything is processed in memory and discarded after response."}
              </p>
            </div>
          </div>
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
              ? `Jeg forstår at det slørede billede af ${docLabel} sendes til Anthropic (USA) via sikker forbindelse, opbevares maks. 7 dage, og ikke bruges til træning.`
              : `I understand the redacted image of ${docLabel} is sent to Anthropic (USA) via secure connection, retained max 7 days, and not used for training.`}
          </span>
        </label>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-1">
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
            Anthropic Data Processing Addendum
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
