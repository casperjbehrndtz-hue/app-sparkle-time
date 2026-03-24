import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type { BudgetProfile } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface Props {
  open: boolean;
  onClose: () => void;
  profile: BudgetProfile;
  onSave: (updated: BudgetProfile) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, suffix = "kr.", min = 0, step = 500, label }: {
  value: number; onChange: (v: number) => void; suffix?: string; min?: number; step?: number; label?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 text-right bg-muted/50 border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      <span className="text-xs text-muted-foreground">{suffix}</span>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "left-5" : "left-1"}`} />
    </button>
  );
}

function GdprSection() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const callGdpr = async (action: "export" | "delete") => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${SUPABASE_URL}/functions/v1/gdpr-request`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Request failed");
    }
    return res;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await callGdpr("export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nemtbudget-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: t("gdpr.exportSuccess") });
    } catch {
      toast({ title: t("gdpr.error"), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    const answer = window.prompt(t("gdpr.confirmDelete"));
    const expected = t("gdpr.confirmDelete").includes("SLET") ? "SLET" : "DELETE";
    if (answer !== expected) return;

    setDeleting(true);
    try {
      await callGdpr("delete");
      toast({ title: t("gdpr.deleteSuccess") });
      // Sign out and redirect after deletion
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      toast({ title: t("gdpr.error"), variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("gdpr.section")}</h3>
      <div className="rounded-xl border border-border/60 px-4 py-3 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{t("gdpr.exportDesc")}</p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {exporting ? t("gdpr.exporting") : t("gdpr.exportData")}
          </button>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">{t("gdpr.deleteDesc")}</p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? t("gdpr.deleting") : t("gdpr.deleteAccount")}
          </button>
        </div>
      </div>
    </section>
  );
}

export function ProfileEditSheet({ open, onClose, profile, onSave }: Props) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [p, setP] = useState<BudgetProfile>({ ...profile });
  const set = <K extends keyof BudgetProfile>(key: K, value: BudgetProfile[K]) =>
    setP(prev => ({ ...prev, [key]: value }));

  // Sync state when sheet opens with latest profile
  useEffect(() => {
    if (open) setP({ ...profile });
  }, [open]);

  const handleSave = () => {
    onSave(p);
    onClose();
    toast({ title: t("profile.saved"), description: t("profile.savedDesc") });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display">{t("profile.title")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-24">

          {/* ── Husstand & Indkomst ─────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("profile.householdIncome")}</h3>
            <div className="rounded-xl border border-border/60 px-4">
              <Field label={t("profile.householdType")}>
                <select
                  value={p.householdType}
                  onChange={(e) => set("householdType", e.target.value as BudgetProfile["householdType"])}
                  className="bg-muted/50 border border-border rounded-lg px-2 py-1 text-sm focus:outline-none"
                >
                  <option value="solo">{t("profile.solo")}</option>
                  <option value="par">{t("profile.couple")}</option>
                </select>
              </Field>
              <Field label={t("profile.yourIncome")}>
                <NumberInput value={p.income} onChange={(v) => set("income", v)} />
              </Field>
              {p.householdType === "par" && (
                <Field label={t("profile.partnerIncomeNet")}>
                  <NumberInput value={p.partnerIncome} onChange={(v) => set("partnerIncome", v)} />
                </Field>
              )}
              <Field label={t("profile.postalCode")}>
                <input
                  type="text"
                  value={p.postalCode}
                  maxLength={4}
                  onChange={(e) => set("postalCode", e.target.value)}
                  className="w-20 text-right bg-muted/50 border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-primary/40"
                />
              </Field>
            </div>
          </section>

          {/* ── Bolig ───────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("profile.housing")}</h3>
            <div className="rounded-xl border border-border/60 px-4">
              <Field label={t("profile.housingType")}>
                <select
                  value={p.housingType}
                  onChange={(e) => set("housingType", e.target.value as BudgetProfile["housingType"])}
                  className="bg-muted/50 border border-border rounded-lg px-2 py-1 text-sm focus:outline-none"
                >
                  <option value="leje">{t("profile.housingLeje")}</option>
                  <option value="ejer">{t("profile.housingEjer")}</option>
                  <option value="andel">{t("profile.housingAndel")}</option>
                  <option value="ungdomsbolig">{t("profile.housingUngdomsbolig")}</option>
                </select>
              </Field>
              {(p.housingType === "leje" || p.housingType === "andel" || p.housingType === "ungdomsbolig") && (
                <Field label={t("profile.rentPayment")}>
                  <NumberInput value={p.rentAmount} onChange={(v) => set("rentAmount", v)} />
                </Field>
              )}
              {p.housingType === "ejer" && (
                <>
                  <Field label={t("profile.monthlyPayment")}>
                    <NumberInput value={p.mortgageAmount} onChange={(v) => set("mortgageAmount", v)} />
                  </Field>
                  <Field label={t("profile.interestRate")}>
                    <NumberInput value={p.interestRate} onChange={(v) => set("interestRate", v)} suffix="%" step={0.1} min={0} />
                  </Field>
                </>
              )}
            </div>
          </section>

          {/* ── Forbrug ─────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("profile.spending")}</h3>
            <div className="rounded-xl border border-border/60 px-4">
              <Field label={t("profile.food")}>
                <NumberInput value={p.foodAmount} onChange={(v) => set("foodAmount", v)} />
              </Field>
              <Field label={t("profile.restaurantTakeaway")}>
                <NumberInput value={p.restaurantAmount} onChange={(v) => set("restaurantAmount", v)} />
              </Field>
              <Field label={t("profile.leisure")}>
                <NumberInput value={p.leisureAmount} onChange={(v) => set("leisureAmount", v)} />
              </Field>
              <Field label={t("profile.clothing")}>
                <NumberInput value={p.clothingAmount} onChange={(v) => set("clothingAmount", v)} />
              </Field>
              <Field label={t("profile.healthMedicine")}>
                <NumberInput value={p.healthAmount} onChange={(v) => set("healthAmount", v)} />
              </Field>
            </div>
          </section>

          {/* ── Transport ───────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("profile.transport")}</h3>
            <div className="rounded-xl border border-border/60 px-4">
              <Field label={t("profile.hasCar")}>
                <Toggle checked={p.hasCar} onChange={(v) => set("hasCar", v)} />
              </Field>
              {p.hasCar && (
                <>
                  <Field label={t("profile.carLoan")}>
                    <NumberInput value={p.carLoan} onChange={(v) => set("carLoan", v)} />
                  </Field>
                  <Field label={t("profile.carFuel")}>
                    <NumberInput value={p.carFuel} onChange={(v) => set("carFuel", v)} />
                  </Field>
                  <Field label={t("profile.carInsurance")}>
                    <NumberInput value={p.carInsurance} onChange={(v) => set("carInsurance", v)} />
                  </Field>
                </>
              )}
            </div>
          </section>

          {/* ── Abonnementer ────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("profile.subscriptions")}</h3>
            <div className="rounded-xl border border-border/60 px-4">
              {([
                [t("profile.netflix"), "hasNetflix"],
                [t("profile.spotify"), "hasSpotify"],
                [t("profile.hboMax"), "hasHBO"],
                [t("profile.viaplay"), "hasViaplay"],
                [t("profile.disneyPlus"), "hasDisney"],
                [t("profile.appleTvPlus"), "hasAppleTV"],
                [t("profile.amazonPrime"), "hasAmazonPrime"],
              ] as [string, keyof BudgetProfile][]).map(([label, key]) => (
                <Field key={key} label={label}>
                  <Toggle checked={!!p[key]} onChange={(v) => set(key, v as never)} />
                </Field>
              ))}
            </div>
          </section>

          {/* ── Lån & Opsparing ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("profile.loansAndSavings")}</h3>
            <div className="rounded-xl border border-border/60 px-4">
              <Field label={t("profile.hasLoan")}>
                <Toggle checked={p.hasLoan} onChange={(v) => set("hasLoan", v)} />
              </Field>
              {p.hasLoan && (
                <Field label={t("profile.loanPayment")}>
                  <NumberInput value={p.loanAmount} onChange={(v) => set("loanAmount", v)} />
                </Field>
              )}
              <Field label={t("profile.savesUp")}>
                <Toggle checked={p.hasSavings} onChange={(v) => set("hasSavings", v)} />
              </Field>
              {p.hasSavings && (
                <Field label={t("profile.savingsMonthly")}>
                  <NumberInput value={p.savingsAmount} onChange={(v) => set("savingsAmount", v)} />
                </Field>
              )}
              <Field label={t("profile.insurances")}>
                <Toggle checked={p.hasInsurance} onChange={(v) => set("hasInsurance", v)} />
              </Field>
              {p.hasInsurance && (
                <Field label={t("profile.insuranceMonthly")}>
                  <NumberInput value={p.insuranceAmount} onChange={(v) => set("insuranceAmount", v)} />
                </Field>
              )}
            </div>
          </section>

          {/* ── Privatliv & data (GDPR) ──────────────────────────────────── */}
          <GdprSection />
        </div>

        {/* Sticky save button */}
        <div className="fixed bottom-0 right-0 w-full sm:max-w-md px-6 py-4 bg-background border-t border-border">
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all"
          >
            {t("profile.saveChanges")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
