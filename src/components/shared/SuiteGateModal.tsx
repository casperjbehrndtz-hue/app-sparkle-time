/**
 * SuiteGateModal — Shared email gate component for the product suite.
 *
 * Each product customizes via props:
 *   - source: which product ("nemtbudget", "parfinans", "boerneskat", "institutionsguide")
 *   - gate: which feature triggered the gate ("budget_save", "pdf_report", etc.)
 *   - headline/subline: the value proposition
 *   - freeItems: what the user already got for free
 *   - gatedItems: what email unlocks
 *   - cta: button text
 *   - metadata: product-specific context to store with the lead
 *
 * Calls the centralized capture-suite-lead edge function on ParFinans Supabase.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, Lock, Mail, Shield, Loader2 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Indtast en gyldig email");

// ParFinans Supabase URL — all products call this central endpoint
const SUITE_API_URL = import.meta.env.VITE_SUITE_API_URL
  || "https://xahajjypbnrpitzdnpjg.supabase.co/functions/v1";

interface SuiteGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which product is this? */
  source: "nemtbudget" | "parfinans" | "boerneskat" | "institutionsguide";
  /** Which feature triggered the gate */
  gate: string;
  /** Main headline, e.g. "Dit budget er klar — gem det gratis" */
  headline: string;
  /** Optional subline below headline */
  subline?: string;
  /** What the user already got for free */
  freeItems: string[];
  /** What email unlocks */
  gatedItems: string[];
  /** CTA button text, e.g. "Gem mit budget" */
  cta: string;
  /** Product-specific metadata to store with the lead */
  metadata?: Record<string, unknown>;
  /** Called after successful email capture with the email */
  onSuccess: (email: string, response: { existing_products: string[] }) => void;
  /** Optional: called when user dismisses without entering email */
  onDismiss?: () => void;
}

export function SuiteGateModal({
  open,
  onOpenChange,
  source,
  gate,
  headline,
  subline,
  freeItems,
  gatedItems,
  cta,
  metadata,
  onSuccess,
  onDismiss,
}: SuiteGateModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${SUITE_API_URL}/capture-suite-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source,
          gate,
          consent_marketing: consent,
          consent_cross_sell: consent,
          metadata: metadata || {},
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Der opstod en fejl. Prøv igen.");
        setLoading(false);
        return;
      }

      // Store email locally so we don't gate again
      try {
        localStorage.setItem("suite_email", email.trim().toLowerCase());
        localStorage.setItem(`suite_gate_${source}_${gate}`, "unlocked");
      } catch {}

      onSuccess(email.trim().toLowerCase(), {
        existing_products: data.existing_products || [],
      });

      onOpenChange(false);
    } catch {
      setError("Kunne ikke forbinde. Tjek din internetforbindelse.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && onDismiss) onDismiss();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold leading-tight">
              {headline}
            </DialogTitle>
            {subline && (
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {subline}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        {/* Two-column value comparison */}
        <div className="grid grid-cols-2 gap-0 border-t border-b border-border">
          {/* Free column */}
          <div className="p-4 space-y-2 border-r border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Det har du fået
            </p>
            <ul className="space-y-1.5">
              {freeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gated column */}
          <div className="p-4 space-y-2 bg-primary/[0.03]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Lås op gratis
            </p>
            <ul className="space-y-1.5">
              {gatedItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <Lock className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="din@email.dk"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium">{error}</p>
          )}

          {/* Consent */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span className="text-[11px] text-muted-foreground leading-tight">
              Send mig relevante tips om privatøkonomi
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>{cta}</>
            )}
          </button>

          <p className="text-center text-[10px] text-muted-foreground/60">
            Vi deler aldrig din email · afmeld når som helst
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Helper: check if a gate has been unlocked (email already provided) */
export function isGateUnlocked(source: string, gate: string): boolean {
  try {
    return localStorage.getItem(`suite_gate_${source}_${gate}`) === "unlocked";
  } catch {
    return false;
  }
}

/** Helper: get the stored suite email */
export function getSuiteEmail(): string | null {
  try {
    return localStorage.getItem("suite_email");
  } catch {
    return null;
  }
}
