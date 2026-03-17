import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, CreditCard, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatKr } from "@/lib/budgetCalculator";
import { useLocale } from "@/lib/locale";
import { useI18n } from "@/lib/i18n";
import type { BudgetProfile } from "@/lib/types";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  is_active: boolean;
}

const DETECTED_SUBS: { key: keyof BudgetProfile; name: string; price: number; category: string }[] = [
  { key: "hasNetflix", name: "Netflix", price: 149, category: "streaming" },
  { key: "hasSpotify", name: "Spotify", price: 99, category: "streaming" },
  { key: "hasHBO", name: "HBO Max", price: 109, category: "streaming" },
  { key: "hasViaplay", name: "Viaplay", price: 149, category: "streaming" },
  { key: "hasAppleTV", name: "Apple TV+", price: 79, category: "streaming" },
  { key: "hasDisney", name: "Disney+", price: 89, category: "streaming" },
  { key: "hasAmazonPrime", name: "Amazon Prime", price: 49, category: "streaming" },
  { key: "hasFitness", name: "Fitness", price: 0, category: "fitness" },
  { key: "hasInsurance", name: "Forsikring", price: 0, category: "insurance" },
  { key: "hasUnion", name: "Fagforening", price: 0, category: "union" },
];

interface Props {
  profile: BudgetProfile;
}

export function SubscriptionTracker({ profile }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const locale = useLocale();
  const lc = locale.currencyLocale;
  const [customSubs, setCustomSubs] = useState<Subscription[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  // Detect subscriptions from profile
  const detected = DETECTED_SUBS.filter((s) => profile[s.key as keyof BudgetProfile]).map((s) => ({
    name: t(`cat.${s.name}`) !== `cat.${s.name}` ? t(`cat.${s.name}`) : s.name,
    amount: s.key === "hasFitness" ? profile.fitnessAmount
      : s.key === "hasInsurance" ? profile.insuranceAmount
      : s.key === "hasUnion" ? profile.unionAmount
      : s.price,
    category: s.category,
  }));

  const totalMonthly = detected.reduce((s, d) => s + d.amount, 0) + customSubs.filter(s => s.is_active).reduce((s, d) => s + d.amount, 0);

  // Load custom subs from DB if logged in
  useEffect(() => {
    if (!user) return;
    supabase.from("subscriptions").select("*").eq("user_id", user.id).then(({ data }) => {
      if (data) setCustomSubs(data as Subscription[]);
    });
  }, [user]);

  const addSub = async () => {
    if (!newName || !newAmount) return;
    const sub: Omit<Subscription, "id"> & { user_id?: string } = {
      name: newName,
      amount: parseInt(newAmount, 10) || 0,
      frequency: "monthly",
      category: "other",
      is_active: true,
    };
    if (user) {
      sub.user_id = user.id;
      const { data } = await supabase.from("subscriptions").insert(sub as any).select().single();
      if (data) setCustomSubs([...customSubs, data as Subscription]);
    } else {
      setCustomSubs([...customSubs, { ...sub, id: crypto.randomUUID() }]);
    }
    setNewName("");
    setNewAmount("");
    setShowAdd(false);
  };

  const removeSub = async (id: string) => {
    if (user) await supabase.from("subscriptions").delete().eq("id", id);
    setCustomSubs(customSubs.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 border border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg">{t("subs.title")}</h3>
          </div>
          <div className="text-right">
            <span className="font-display font-black text-2xl text-primary">{formatKr(totalMonthly, lc)}</span>
            <span className="text-sm text-muted-foreground ml-1">{t("unit.krMonth")}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          = {formatKr(totalMonthly * 12, lc)} {t("unit.krYear")} · {detected.length + customSubs.length} {t("subs.activeCount")}
        </p>
        {totalMonthly > 2000 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-kassen-gold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t("subs.warning")}</span>
          </div>
        )}
      </motion.div>

      {/* Detected */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{t("subs.foundInBudget")}</p>
        {detected.map((sub, i) => (
          <motion.div key={sub.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60">
            <div className="flex items-center gap-3">
              <span className="text-lg">{sub.category === "streaming" ? "📺" : sub.category === "fitness" ? "💪" : sub.category === "insurance" ? "🛡️" : "📋"}</span>
              <span className="text-sm font-medium">{sub.name}</span>
            </div>
            <span className="text-sm font-bold text-foreground">{formatKr(sub.amount, lc)} {t("unit.currency")}</span>
          </motion.div>
        ))}
      </div>

      {/* Custom */}
      {customSubs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{t("subs.addedManually")}</p>
          {customSubs.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60">
              <div className="flex items-center gap-3">
                <span className="text-lg">📌</span>
                <span className="text-sm font-medium">{sub.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{formatKr(sub.amount, lc)} {t("unit.currency")}</span>
                <button onClick={() => removeSub(sub.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add */}
      {showAdd ? (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-primary/20 p-4 space-y-3">
          <input placeholder={t("subs.namePlaceholder")} value={newName} onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input placeholder={t("subs.pricePlaceholder")} type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <div className="flex gap-2">
            <button onClick={addSub} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">{t("subs.add")}</button>
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg border border-border text-sm">{t("subs.cancel")}</button>
          </div>
        </motion.div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="w-full py-3 rounded-xl border border-dashed border-border hover:border-primary/30 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> {t("subs.addSubscription")}
        </button>
      )}
    </div>
  );
}
