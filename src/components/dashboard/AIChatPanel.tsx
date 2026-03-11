import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Loader2, Bell } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { BudgetProfile, ComputedBudget } from "@/lib/types";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { useAIStream } from "@/hooks/useAIStream";

interface Props {
  profile: BudgetProfile;
  budget: ComputedBudget;
}

type Msg = { role: "user" | "assistant"; content: string };

function getSmartQuestions(profile: BudgetProfile, budget: ComputedBudget, lang: string): string[] {
  const month = new Date().getMonth();
  const questions: string[] = [];
  const isDa = lang === "da";

  if (month >= 10 || month === 0) questions.push(isDa ? "Hvordan klarer mit budget julen?" : "How does my budget handle Christmas?");
  if (month >= 4 && month <= 6) questions.push(isDa ? "Kan jeg spare op til sommerferie?" : "Can I save for summer vacation?");
  if (month >= 0 && month <= 2) questions.push(isDa ? "Skal jeg skifte forsikring ved fornyelse?" : "Should I switch insurance at renewal?");

  if (budget.disposableIncome < 3000) questions.push(isDa ? "Hvor kan jeg skære mest?" : "Where can I cut the most?");
  if (profile.hasCar) questions.push(isDa ? "Hvad koster min bil reelt?" : "What does my car really cost?");
  const streamCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime].filter(Boolean).length;
  if (streamCount >= 3) questions.push(isDa ? "Hvilken streaming kan jeg droppe?" : "Which streaming can I drop?");
  if (profile.housingType === "ejer") questions.push(isDa ? "Hvad hvis renten stiger 2%?" : "What if rates rise 2%?");
  if (!profile.hasSavings) questions.push(isDa ? "Hvordan starter jeg med at spare op?" : "How do I start saving?");

  return questions.slice(0, 4);
}

export function AIChatPanel({ profile, budget }: Props) {
  const config = useWhiteLabel();
  const { t, lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialAnalysis, setHasInitialAnalysis] = useState(false);
  const [hasProactiveNudge, setHasProactiveNudge] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const aiStream = useAIStream();

  const smartQuestions = useMemo(() => getSmartQuestions(profile, budget, lang), [profile, budget, lang]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const runOptimize = useCallback(() => {
    if (hasInitialAnalysis || isLoading) return;
    setIsLoading(true);
    let assistantSoFar = "";

    aiStream.stream({
      functionName: "budget-ai",
      body: { profile, budget, mode: "optimize" },
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
      },
      onError: (err) => {
        setIsLoading(false);
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${err}` }]);
      },
    });
  }, [hasInitialAnalysis, isLoading, profile, budget, aiStream]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    aiStream.stream({
      functionName: "budget-ai",
      body: { profile, budget, mode: "chat", messages: newMessages },
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
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${err}` }]);
      },
    });
  }, [isLoading, messages, profile, budget, aiStream]);

  const handleOpen = () => {
    setIsOpen(true);
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
          title="Spørg AI om din økonomi"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">Spørg AI</span>
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
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] rounded-2xl border border-border bg-background shadow-2xl shadow-black/10 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">{config.brandName} AI</p>
                  <p className="text-[10px] text-muted-foreground">Din personlige rådgiver</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Sparkles className="w-8 h-8 text-primary/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">AI analyserer din økonomi...</p>
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
                    className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Stil et spørgsmål om din økonomi..."
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
