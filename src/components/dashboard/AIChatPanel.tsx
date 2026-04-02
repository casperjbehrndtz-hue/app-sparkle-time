import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Loader2, Bell, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { useAIStream } from "@/hooks/useAIStream";
import { usePartnerTracking } from "@/hooks/usePartnerTracking";

// ─── Chat history persistence (sessionStorage — cleared on browser close) ──
const CHAT_SESSION_KEY = "nb_ai_chat";

function loadChatSession(): { messages: Msg[]; hasAnalyzed: boolean } {
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (!raw) return { messages: [], hasAnalyzed: false };
    const parsed = JSON.parse(raw);
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      hasAnalyzed: !!parsed.hasAnalyzed,
    };
  } catch {
    return { messages: [], hasAnalyzed: false };
  }
}

function saveChatSession(messages: Msg[], hasAnalyzed: boolean) {
  try {
    sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify({ messages, hasAnalyzed }));
  } catch {
    // Private browsing or quota exceeded — silently ignore
  }
}

function clearChatSession() {
  try {
    sessionStorage.removeItem(CHAT_SESSION_KEY);
  } catch {
    // ignore
  }
}

// ─── Freemium: 5 AI interactions free per month ────────────────────────────
const FREE_LIMIT = 5;
const STORAGE_KEY = "nb_ai_usage";

function getUsage(): { count: number; month: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, month: "" };
    return JSON.parse(raw);
  } catch {
    return { count: 0, month: "" };
  }
}

function incrementUsage(): number {
  const now = new Date();
  const month = `${now.getFullYear()}-${now.getMonth()}`;
  const prev = getUsage();
  const count = prev.month === month ? prev.count + 1 : 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, month }));
  return count;
}

function getRemainingFree(): number {
  const now = new Date();
  const month = `${now.getFullYear()}-${now.getMonth()}`;
  const { count, month: savedMonth } = getUsage();
  if (savedMonth !== month) return FREE_LIMIT;
  return Math.max(0, FREE_LIMIT - count);
}

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

type Msg = { role: "user" | "assistant"; content: string };

function getSmartQuestions(profile: BudgetProfile, budget: ComputedBudget, t: (key: string) => string): string[] {
  const month = new Date().getMonth();
  const questions: string[] = [];

  if (month >= 10 || month === 0) questions.push(t("ai.q.christmasBudget"));
  if (month >= 4 && month <= 6) questions.push(t("ai.q.summerSavings"));
  if (month >= 0 && month <= 2) questions.push(t("ai.q.switchInsurance"));

  if (budget.disposableIncome < 3000) questions.push(t("ai.q.cutMost"));
  if (profile.hasCar) questions.push(t("ai.q.carCost"));
  const streamCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime].filter(Boolean).length;
  if (streamCount >= 3) questions.push(t("ai.q.dropStreaming"));
  if (profile.housingType === "ejer") questions.push(t("ai.q.rateRise"));
  if (!profile.hasSavings) questions.push(t("ai.q.startSaving"));

  return questions.slice(0, 4);
}

export function AIChatPanel({ profile, budget }: Props) {
  const config = useWhiteLabel();
  const { t, lang } = useI18n();
  const { track } = usePartnerTracking(config.brandKey ?? "nemtbudget");
  const [isOpen, setIsOpen] = useState(false);
  const [cachedSession] = useState(loadChatSession);
  const [messages, setMessages] = useState<Msg[]>(cachedSession.messages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialAnalysis, setHasInitialAnalysis] = useState(cachedSession.hasAnalyzed);
  const [hasProactiveNudge, setHasProactiveNudge] = useState(false);
  const [remaining, setRemaining] = useState(getRemainingFree);
  const isLimitReached = remaining <= 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const aiStream = useAIStream();

  const smartQuestions = useMemo(() => getSmartQuestions(profile, budget, t), [profile, budget, t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Persist chat to sessionStorage
  useEffect(() => {
    saveChatSession(messages, hasInitialAnalysis);
  }, [messages, hasInitialAnalysis]);

  const runOptimize = useCallback(() => {
    if (hasInitialAnalysis || isLoading || isLimitReached) return;
    incrementUsage();
    setRemaining(getRemainingFree());
    setIsLoading(true);
    let assistantSoFar = "";

    aiStream.stream({
      functionName: "budget-ai",
      body: { profile, budget, mode: "optimize", lang },
      onDelta: (chunk) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      },
      onDone: () => {
        setIsLoading(false);
        setHasInitialAnalysis(true);
        setRemaining(getRemainingFree());
      },
      onError: (err) => {
        setIsLoading(false);
        setMessages((prev) => [...prev, { role: "assistant", content: `${err}` }]);
      },
    });
  }, [hasInitialAnalysis, isLoading, profile, budget, aiStream]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isLoading || isLimitReached) return;
    incrementUsage();
    setRemaining(getRemainingFree());
    track("ai_message_sent");
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    aiStream.stream({
      functionName: "budget-ai",
      body: { profile, budget, mode: "chat", messages: newMessages, lang },
      onDelta: (chunk) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          if (prev[prev.length - 1]?.role === "assistant" && prev[prev.length - 2]?.content === userMsg.content) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      },
      onDone: () => setIsLoading(false),
      onError: (err) => {
        setIsLoading(false);
        setMessages((prev) => [...prev, { role: "assistant", content: `${err}` }]);
      },
    });
  }, [isLoading, messages, profile, budget, aiStream]);

  const handleOpen = () => {
    setIsOpen(true);
    track("ai_chat_open");
    if (!hasInitialAnalysis && messages.length === 0) {
      setTimeout(runOptimize, 300);
    }
  };

  // Proactive nudge
  useEffect(() => {
    if (isOpen || hasProactiveNudge) return;
    const timer = setTimeout(() => setHasProactiveNudge(true), 10000);
    return () => clearTimeout(timer);
  }, [isOpen, hasProactiveNudge]);

  return (
    <>
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: "spring", bounce: 0.4 }}
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:brightness-110 transition-all px-5 gap-2"
          title={t("ai.askAbout")}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">{t("ai.askShort")}</span>
          {hasProactiveNudge && !hasInitialAnalysis && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
            >
              <Bell className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="AI budget-rådgiver"
            onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false); }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] rounded-2xl border border-border bg-background shadow-2xl shadow-black/10 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">{config.brandName} AI</p>
                  <p className="text-[10px] text-muted-foreground">{t("ai.personalAdvisor")}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={scrollRef} aria-live="polite" className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-primary/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t("ai.analyzing")}</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted/50 border border-border/50 rounded-bl-md"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-neutral max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_li]:text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            {hasInitialAnalysis && messages.length <= 2 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {smartQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={isLoading}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {isLimitReached ? (
              <div className="px-4 py-4 border-t border-border bg-muted/20">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                  <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground mb-1">{t("ai.usedFreeAnswers")}</p>
                  <p className="text-xs text-muted-foreground mb-3">{t("ai.limitReached")}</p>
                  <a
                    href="/login"
                    className="inline-block px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all"
                  >
                    {t("ai.createAccount")}
                  </a>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-border bg-muted/20">
                {remaining < FREE_LIMIT && (
                  <p className="text-[10px] text-muted-foreground/60 text-right mb-1.5">{remaining} {t("ai.answersLeft")}</p>
                )}
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t("ai.placeholder")}
                    aria-label={t("ai.placeholder")}
                    disabled={isLoading}
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/40 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:brightness-110 transition-all flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
