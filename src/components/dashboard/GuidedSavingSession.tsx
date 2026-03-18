import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check, SkipForward, Sparkles, Target, Undo2 } from "lucide-react";
import { formatKr } from "@/lib/budgetCalculator";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";

interface Change {
  field: string;
  old_value: unknown;
  new_value: unknown;
  label: string;
  monthly_saving: number;
  emoji: string;
}

interface Message {
  type: "ai" | "accept" | "skip";
  text: string;
  saving?: number;
}

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  onClose: () => void;
  onProfileChange: (p: BudgetProfile) => void;
}

const GOAL_OPTIONS = [500, 1000, 1500, 2000, 3000, 5000];

export function GuidedSavingSession({ profile, budget, onClose, onProfileChange }: Props) {
  const { t, lang } = useI18n();
  const locale = useLocale();
  const lc = locale.currencyLocale;
  const [phase, setPhase] = useState<"goal" | "loading" | "suggestion" | "complete">("goal");
  const [goalAmount, setGoalAmount] = useState(1500);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestion, setSuggestion] = useState<Change | null>(null);
  const [acceptedChanges, setAcceptedChanges] = useState<Change[]>([]);
  const [rejectedFields, setRejectedFields] = useState<string[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [currentProfile, setCurrentProfile] = useState<BudgetProfile>({ ...profile });
  const [doneMessage, setDoneMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, suggestion]);

  const fetchNextSuggestion = async (
    prof: BudgetProfile,
    rejected: string[],
    accepted: Change[],
    found: number
  ) => {
    setPhase("loading");
    setSuggestion(null);

    try {
      const { data, error } = await supabase.functions.invoke("budget-ai", {
        body: {
          mode: "guided-session",
          profile: prof,
          budget,
          goal_amount: goalAmount,
          rejected_fields: rejected,
          accepted_changes: accepted,
          found_total: found,
          lang,
        },
      });

      if (error || !data) throw new Error(t("guided.noResponse"));

      setMessages(prev => [...prev, { type: "ai", text: data.message }]);

      if (data.done || !data.suggestion) {
        setDoneMessage(data.message);
        setPhase("complete");
      } else {
        setSuggestion(data.suggestion);
        setPhase("suggestion");
      }
    } catch {
      setMessages(prev => [...prev, { type: "ai", text: t("guided.errorRetry") }]);
      setPhase("suggestion");
    }
  };

  const startSession = () => {
    fetchNextSuggestion(currentProfile, [], [], 0);
  };

  const handleUndo = () => {
    if (acceptedChanges.length === 0) return;
    const last = acceptedChanges[acceptedChanges.length - 1];
    const restored = { ...currentProfile, [last.field]: last.old_value };
    setCurrentProfile(restored);
    onProfileChange(restored);
    const remaining = acceptedChanges.slice(0, -1);
    setAcceptedChanges(remaining);
    const newFound = Math.max(0, totalFound - last.monthly_saving);
    setTotalFound(newFound);
    setMessages(prev => [...prev, { type: "skip", text: `↩ ${t("guided.undone").replace("{label}", last.label)}` }]);
    // If we were complete, go back to suggestion mode
    if (phase === "complete") {
      fetchNextSuggestion(restored, rejectedFields, remaining, newFound);
    }
  };

  const handleAccept = () => {
    if (!suggestion) return;

    const change: Change = { ...suggestion, old_value: (currentProfile as any)[suggestion.field] };
    const updated = { ...currentProfile, [suggestion.field]: suggestion.new_value };
    setCurrentProfile(updated);
    onProfileChange(updated);

    const newAccepted = [...acceptedChanges, change];
    const newFound = totalFound + suggestion.monthly_saving;

    setAcceptedChanges(newAccepted);
    setTotalFound(newFound);
    setMessages(prev => [...prev, {
      type: "accept",
      text: `✓ ${suggestion.label}`,
      saving: suggestion.monthly_saving,
    }]);

    if (newFound >= goalAmount) {
      setDoneMessage(`${t("guided.goalReached")} 🎉 ${t("guided.goalReachedDesc").replace("{amount}", formatKr(newFound, lc))}`);
      setPhase("complete");
      return;
    }

    fetchNextSuggestion(updated, rejectedFields, newAccepted, newFound);
  };

  const handleSkip = () => {
    if (!suggestion) return;
    const newRejected = [...rejectedFields, suggestion.field];
    setRejectedFields(newRejected);
    setMessages(prev => [...prev, { type: "skip", text: t("guided.skipped").replace("{label}", suggestion.label) }]);
    fetchNextSuggestion(currentProfile, newRejected, acceptedChanges, totalFound);
  };

  const progressPct = Math.min(100, (totalFound / goalAmount) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-sm">{t("guided.title")}</span>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Phase: Goal setting */}
      {phase === "goal" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6 w-full">
            <div>
              <Target className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="font-display font-black text-2xl sm:text-3xl text-foreground mb-2">{t("guided.whatIsYourGoal")}</h2>
              <p className="text-muted-foreground text-sm">{t("guided.goalDesc")}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {GOAL_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setGoalAmount(opt)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    goalAmount === opt
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {formatKr(opt, lc)} {t("currency")}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-muted/50 p-4 text-left">
              <p className="text-xs text-muted-foreground">
                {t("guided.currentDisposable").replace("{amount}", formatKr(budget.disposableIncome, lc))}
                {" "}{t("guided.goalExtra").replace("{amount}", formatKr(goalAmount, lc))}{" "}
                <span className="font-bold text-primary">{formatKr(budget.disposableIncome + goalAmount, lc)} {t("unit.krMonth")}</span>
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={startSession}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {t("guided.findGoal").replace("{amount}", `${formatKr(goalAmount, lc)} ${t("unit.krMonth")}`)} <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Phase: Active session */}
      {(phase === "loading" || phase === "suggestion") && (
        <>
          {/* Progress bar */}
          <div className="px-5 py-3 border-b border-border/50">
            <div className="max-w-lg mx-auto">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{t("guided.found")}</span>
                <span className="font-bold text-foreground">{t("guided.progressLabel").replace("{found}", formatKr(totalFound, lc)).replace("{goal}", formatKr(goalAmount, lc))} {t("unit.krMonth")}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 max-w-lg mx-auto w-full space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {msg.type === "ai" && (
                    <div className="flex gap-2.5 items-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm text-foreground max-w-[85%]">
                        {msg.text}
                      </div>
                    </div>
                  )}
                  {msg.type === "accept" && (
                    <div className="flex justify-end">
                      <div className="rounded-2xl rounded-tr-sm bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm max-w-[85%] flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-primary font-medium">{msg.text}</span>
                        <span className="text-primary/70 text-xs ml-auto">+{formatKr(msg.saving!, lc)} {t("currency")}</span>
                      </div>
                    </div>
                  )}
                  {msg.type === "skip" && (
                    <div className="flex justify-end">
                      <div className="rounded-2xl rounded-tr-sm bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground max-w-[85%]">
                        {msg.text}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {phase === "loading" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestion card */}
          {phase === "suggestion" && suggestion && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-5 pb-6 max-w-lg mx-auto w-full"
            >
              <div className="rounded-2xl border-2 border-primary/20 bg-primary/[0.03] p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{suggestion.emoji}</span>
                    <span className="font-semibold text-foreground">{suggestion.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-black text-lg text-primary">+{formatKr(suggestion.monthly_saving, lc)}</p>
                    <p className="text-[10px] text-muted-foreground">{t("unit.krMonth")}</p>
                  </div>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/30 rounded-full"
                    style={{ width: `${Math.min(100, ((totalFound + suggestion.monthly_saving) / goalAmount) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t("guided.withThis").replace("{found}", formatKr(totalFound + suggestion.monthly_saving, lc)).replace("{goal}", `${formatKr(goalAmount, lc)} ${t("currency")}`)}
                </p>
              </div>

              <div className="flex gap-3">
                {acceptedChanges.length > 0 && (
                  <button
                    onClick={handleUndo}
                    className="py-3.5 px-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center justify-center"
                    title={t("guided.undo")}
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleSkip}
                  className="flex-1 py-3.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center justify-center gap-2"
                >
                  <SkipForward className="w-4 h-4" /> {t("guided.skip")}
                </button>
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleAccept}
                  className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all"
                >
                  <Check className="w-4 h-4" /> {t("guided.apply")}
                </motion.button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Phase: Complete */}
      {phase === "complete" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center space-y-6 w-full">

            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h2 className="font-display font-black text-2xl text-foreground mb-2">
                {totalFound >= goalAmount ? t("guided.goalReachedTitle") : t("guided.sessionDone")}
              </h2>
              <p className="text-muted-foreground text-sm">{doneMessage || t("guided.reviewedAll")}</p>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-border p-4 text-left space-y-2">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">{t("guided.acceptedChanges")}</p>
              {acceptedChanges.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("guided.noChanges")}</p>
              ) : (
                <>
                  {acceptedChanges.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span>{c.emoji}</span>
                        <span>{c.label}</span>
                      </div>
                      <span className="text-sm font-bold text-primary">+{formatKr(c.monthly_saving, lc)} {t("unit.krMonth")}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-sm font-bold">{t("guided.totalFreed")}</span>
                    <span className="font-display font-black text-lg text-primary">+{formatKr(totalFound, lc)} {t("unit.krMonth")}</span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-base shadow-lg shadow-primary/20"
              >
                {t("guided.seeUpdated")}
              </button>
              {acceptedChanges.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="w-full py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center justify-center gap-2"
                >
                  <Undo2 className="w-4 h-4" /> {t("guided.undoLast")}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
