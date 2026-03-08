import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import { formatKr } from "@/lib/budgetCalculator";
import { calculateHealth } from "@/lib/healthScore";
import { useI18n } from "@/lib/i18n";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-ai`;

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
  onContinue: () => void;
}

export function AIWelcomeInsight({ profile, budget, onContinue }: Props) {
  const { t } = useI18n();
  const [insight, setInsight] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [numberAnimDone, setNumberAnimDone] = useState(false);

  const health = calculateHealth(profile, budget);
  const scoreColor = health.score >= 70 ? "text-emerald-500" : health.score >= 40 ? "text-amber-500" : "text-red-500";

  // Animated number counter
  const [displayedAmount, setDisplayedAmount] = useState(0);
  useEffect(() => {
    const target = budget.disposableIncome;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(target, Math.round(increment * step));
      setDisplayedAmount(current);
      if (step >= steps) {
        clearInterval(timer);
        setDisplayedAmount(target);
        setTimeout(() => {
          setNumberAnimDone(true);
          setShowContent(true);
        }, 400);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [budget.disposableIncome]);

  // Stream AI insight
  useEffect(() => {
    if (!showContent) return;

    const fetchInsight = async () => {
      try {
        const resp = await fetch(AI_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ mode: "welcome-insight", profile, budget }),
        });

        if (!resp.ok || !resp.body) {
          setInsight("Din økonomi er klar til analyse. Gå videre til dit dashboard for det fulde overblik.");
          setIsStreaming(false);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulated += content;
                setInsight(accumulated);
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
        setIsStreaming(false);
      } catch {
        setInsight("Din økonomi er klar til analyse. Gå videre til dit dashboard.");
        setIsStreaming(false);
      }
    };

    fetchInsight();
  }, [showContent]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
      <div className="max-w-md w-full space-y-8">
        {/* Animated score reveal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          {/* Circular score */}
          <div className="relative w-36 h-36 mx-auto mb-6">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none"
                stroke={health.score >= 70 ? "#10b981" : health.score >= 40 ? "#f59e0b" : "#ef4444"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - health.score / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className={`font-display font-black text-3xl ${scoreColor}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {health.score}
              </motion.span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("health.freedom")}</span>
            </div>
          </div>

          {/* Disposable income counter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{t("health.freedomSub")}</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className={`font-display font-black text-5xl ${budget.disposableIncome >= 5000 ? "text-primary" : budget.disposableIncome > 0 ? "text-amber-500" : "text-red-500"}`}>
                {formatKr(displayedAmount)}
              </span>
              <span className="text-lg text-muted-foreground font-display">{t("currency")}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* AI Insight (streams in after number animation) */}
        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className={`w-3.5 h-3.5 text-primary ${isStreaming ? "animate-pulse" : ""}`} />
                </div>
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">AI Indsigt</span>
              </div>
              <div className="prose prose-sm prose-neutral max-w-none text-sm [&_p]:mb-2 [&_strong]:text-foreground">
                <ReactMarkdown>{insight || "Analyserer din økonomi..."}</ReactMarkdown>
              </div>
              {isStreaming && (
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-2 h-4 bg-primary/40 rounded-sm inline-block ml-0.5"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue button */}
        <AnimatePresence>
          {numberAnimDone && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <button
                onClick={onContinue}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {t("step.review.seeDashboard")} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
