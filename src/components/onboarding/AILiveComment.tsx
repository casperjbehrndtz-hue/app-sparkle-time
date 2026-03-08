import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { BudgetProfile, OnboardingStep } from "@/lib/types";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-ai`;

interface Props {
  profile: BudgetProfile;
  step: OnboardingStep;
}

export function AILiveComment({ profile, step }: Props) {
  const [comment, setComment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchKey = useRef<string>("");

  // Only fetch for certain steps, and debounce
  useEffect(() => {
    const validSteps = ["income", "housing", "children", "expenses"];
    if (!validSteps.includes(step)) {
      setComment(null);
      return;
    }

    // Create a key to avoid redundant calls
    const key = `${step}-${profile.income}-${profile.partnerIncome}-${profile.postalCode}-${profile.housingType}-${profile.rentAmount}-${profile.mortgageAmount}-${profile.hasChildren}-${profile.hasCar}-${profile.hasInsurance}`;
    if (key === lastFetchKey.current) return;

    const timer = setTimeout(async () => {
      lastFetchKey.current = key;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const resp = await fetch(AI_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ mode: "live-comment", profile, step }),
          signal: controller.signal,
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.comment && !controller.signal.aborted) {
            setComment(data.comment);
          }
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          console.error("AI comment error:", e);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 1200); // 1.2s debounce

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [step, profile.income, profile.partnerIncome, profile.postalCode, profile.housingType, profile.rentAmount, profile.mortgageAmount, profile.hasChildren, profile.hasCar, profile.hasInsurance]);

  return (
    <AnimatePresence mode="wait">
      {(comment || isLoading) && (
        <motion.div
          key={comment || "loading"}
          initial={{ opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="flex gap-2.5 rounded-xl bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] border border-primary/10 px-4 py-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className={`w-3 h-3 text-primary ${isLoading ? "animate-pulse" : ""}`} />
            </div>
            <div className="flex-1 min-w-0">
              {isLoading && !comment ? (
                <div className="flex gap-1 py-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-primary/40"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">{comment}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
