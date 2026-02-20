import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { computeBudget, formatKr } from "@/lib/budgetCalculator";
import type { BudgetProfile, OnboardingStep } from "@/lib/types";

interface Props {
  onComplete: (profile: BudgetProfile) => void;
}

const defaultProfile: BudgetProfile = {
  householdType: "solo",
  income: 35000,
  partnerIncome: 0,
  postalCode: "8000",
  housingType: "lejer",
  hasMortgage: false,
  hasChildren: false,
  childrenAges: [],
  hasNetflix: false,
  hasSpotify: false,
  hasHBO: false,
  hasViaplay: false,
  hasAppleTV: false,
  hasCar: false,
  hasInternet: true,
};

const INCOME_OPTIONS = [
  { label: "15.000", value: 15000 },
  { label: "20.000", value: 20000 },
  { label: "25.000", value: 25000 },
  { label: "30.000", value: 30000 },
  { label: "35.000", value: 35000 },
  { label: "40.000", value: 40000 },
  { label: "45.000", value: 45000 },
  { label: "50.000", value: 50000 },
  { label: "55.000+", value: 58000 },
];

const CHILD_AGE_OPTIONS = [
  { label: "0–2 år", value: 1 },
  { label: "3–5 år", value: 4 },
  { label: "6–9 år", value: 7 },
  { label: "10–14 år", value: 12 },
  { label: "15+ år", value: 16 },
];

type AnswerRecord = { label: string; value: string };

function StepTag({ label }: { label: string }) {
  return (
    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2 block">
      {label}
    </span>
  );
}

function AnsweredItem({ answer }: { answer: AnswerRecord }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40 text-sm"
    >
      <span className="text-muted-foreground">{answer.label}</span>
      <span className="text-kassen-green font-semibold">{answer.value}</span>
    </motion.div>
  );
}

function YesNoButtons({
  onYes,
  onNo,
  yesLabel = "Ja",
  noLabel = "Nej",
  yesSub,
}: {
  onYes: () => void;
  onNo: () => void;
  yesLabel?: string;
  noLabel?: string;
  yesSub?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onYes}
        className="relative flex flex-col items-center justify-center p-5 rounded-xl border border-kassen-green/30 bg-kassen-green/10 hover:bg-kassen-green/20 transition-all group"
      >
        <span className="font-display font-bold text-xl text-kassen-green">{yesLabel}</span>
        {yesSub && (
          <span className="text-xs text-kassen-green/70 mt-1">→ {yesSub}</span>
        )}
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNo}
        className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-all"
      >
        <span className="font-display font-bold text-xl text-foreground/70">{noLabel}</span>
      </motion.button>
    </div>
  );
}

function ChoiceGrid({
  options,
  onSelect,
  selected,
}: {
  options: { label: string; value: number | string; sub?: string }[];
  onSelect: (value: number | string) => void;
  selected?: number | string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {options.map((opt) => (
        <motion.button
          key={opt.value}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(opt.value)}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
            selected === opt.value
              ? "border-kassen-green bg-kassen-green/15 text-kassen-green"
              : "border-border bg-muted/30 hover:border-kassen-green/40 hover:bg-muted/60"
          }`}
        >
          <span className="font-display font-bold text-sm">{opt.label}</span>
          {opt.sub && <span className="text-xs text-muted-foreground mt-0.5">{opt.sub}</span>}
        </motion.button>
      ))}
    </div>
  );
}

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [profile, setProfile] = useState<BudgetProfile>(defaultProfile);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [childCount, setChildCount] = useState(0);
  const [collectingChildAge, setCollectingChildAge] = useState(0);
  const [postalInput, setPostalInput] = useState("");
  const [liveDisposable, setLiveDisposable] = useState<number | null>(null);

  // Live update disposable
  useEffect(() => {
    if (step !== "welcome" && step !== "household" && step !== "income") {
      const computed = computeBudget(profile);
      setLiveDisposable(computed.disposableIncome);
    }
  }, [profile, step]);

  const addAnswer = (label: string, value: string) => {
    setAnswers((prev) => [...prev, { label, value }]);
  };

  const updateProfile = (update: Partial<BudgetProfile>) => {
    setProfile((p) => ({ ...p, ...update }));
  };

  // STEP RENDERERS

  if (step === "welcome") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-sm"
        >
          <div className="mb-6">
            <span className="font-display font-black text-5xl gradient-text-green">Kassen</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-foreground mb-3">
            Overblik over din økonomi på under 3 minutter.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed mb-8">
            Ingen lange skemaer. Ingen priser at slå op. Bare ja og nej – vi klarer resten.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setStep("household")}
            className="w-full py-4 rounded-xl bg-kassen-green text-background font-display font-bold text-lg hover:opacity-90 transition-all animate-pulse-green"
          >
            Start her →
          </motion.button>
          <p className="text-xs text-muted-foreground mt-4">
            Dine data gemmes kun lokalt på din enhed.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto">
      {/* Live rådighedsbeløb badge */}
      <AnimatePresence>
        {liveDisposable !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="glass-card rounded-full px-4 py-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rådighedsbeløb</span>
              <span
                className={`font-display font-bold text-sm ${
                  liveDisposable > 5000
                    ? "text-kassen-green"
                    : liveDisposable > 0
                    ? "text-kassen-gold"
                    : "text-kassen-red"
                }`}
              >
                {formatKr(liveDisposable)} kr.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previous answers */}
      <div className="space-y-2 mb-6 mt-8">
        {answers.map((a, i) => (
          <AnsweredItem key={i} answer={a} />
        ))}
      </div>

      {/* Current question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-2xl p-6"
        >
          {/* HOUSEHOLD */}
          {step === "household" && (
            <>
              <StepTag label="Husstand" />
              <h2 className="font-display font-bold text-2xl mb-2">
                Er du alene eller er I et par?
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Vi tilpasser hele flowet til jeres situation.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    updateProfile({ householdType: "solo", partnerIncome: 0 });
                    addAnswer("Husstand", "Kun mig");
                    setStep("income");
                  }}
                  className="p-5 rounded-xl border border-border bg-muted/30 hover:border-kassen-green/40 hover:bg-kassen-green/10 transition-all"
                >
                  <div className="text-3xl mb-2">🧍</div>
                  <div className="font-display font-bold">Kun mig</div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    updateProfile({ householdType: "par" });
                    addAnswer("Husstand", "Vi er to");
                    setStep("income");
                  }}
                  className="p-5 rounded-xl border border-border bg-muted/30 hover:border-kassen-green/40 hover:bg-kassen-green/10 transition-all"
                >
                  <div className="text-3xl mb-2">👫</div>
                  <div className="font-display font-bold">Vi er to</div>
                </motion.button>
              </div>
            </>
          )}

          {/* INCOME */}
          {step === "income" && (
            <>
              <StepTag label="Indkomst" />
              <h2 className="font-display font-bold text-2xl mb-2">
                Hvad tjener du om måneden <span className="text-kassen-green">efter skat</span>?
              </h2>
              <ChoiceGrid
                options={INCOME_OPTIONS.map((o) => ({ label: o.label, value: o.value, sub: "kr." }))}
                onSelect={(val) => {
                  const v = val as number;
                  updateProfile({ income: v });
                  addAnswer("Din indkomst", `${formatKr(v)} kr./md.`);
                  if (profile.householdType === "par") {
                    setStep("partnerIncome");
                  } else {
                    setStep("housing");
                  }
                }}
              />
            </>
          )}

          {/* PARTNER INCOME */}
          {step === "partnerIncome" && (
            <>
              <StepTag label="Indkomst" />
              <h2 className="font-display font-bold text-2xl mb-2">
                Og hvad tjener din partner?
              </h2>
              <ChoiceGrid
                options={INCOME_OPTIONS.map((o) => ({ label: o.label, value: o.value, sub: "kr." }))}
                onSelect={(val) => {
                  const v = val as number;
                  updateProfile({ partnerIncome: v });
                  addAnswer("Partners indkomst", `${formatKr(v)} kr./md.`);
                  setStep("housing");
                }}
              />
            </>
          )}

          {/* HOUSING */}
          {step === "housing" && (
            <>
              <StepTag label="Bolig" />
              <h2 className="font-display font-bold text-2xl mb-2">
                Bor I til leje eller ejer I jeres hjem?
              </h2>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    updateProfile({ housingType: "lejer", hasMortgage: false });
                    addAnswer("Bolig", "Lejebolig");
                    setStep("children");
                  }}
                  className="p-5 rounded-xl border border-border bg-muted/30 hover:border-kassen-blue/40 hover:bg-kassen-blue/10 transition-all"
                >
                  <div className="text-3xl mb-2">🏢</div>
                  <div className="font-display font-bold">Lejer</div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    updateProfile({ housingType: "ejer" });
                    addAnswer("Bolig", "Ejerbolig");
                    setStep("mortgage");
                  }}
                  className="p-5 rounded-xl border border-border bg-muted/30 hover:border-kassen-blue/40 hover:bg-kassen-blue/10 transition-all"
                >
                  <div className="text-3xl mb-2">🏡</div>
                  <div className="font-display font-bold">Ejer</div>
                </motion.button>
              </div>
            </>
          )}

          {/* MORTGAGE */}
          {step === "mortgage" && (
            <>
              <StepTag label="Bolig" />
              <h2 className="font-display font-bold text-2xl mb-1">Har I boliglån?</h2>
              <p className="text-muted-foreground text-sm mb-2">Vi estimerer ydelsen automatisk ud fra jeres postnummer.</p>
              <YesNoButtons
                yesSub="vi estimerer ydelsen"
                onYes={() => {
                  updateProfile({ hasMortgage: true });
                  addAnswer("Boliglån", "Ja");
                  // ask postal code
                  setStep("done" as any); // temporary - go to postal
                  setStep("children");
                  // We'll use default postal
                }}
                onNo={() => {
                  updateProfile({ hasMortgage: false });
                  addAnswer("Boliglån", "Nej – ejer uden lån");
                  setStep("children");
                }}
              />
              <div className="mt-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={postalInput}
                  onChange={(e) => {
                    setPostalInput(e.target.value);
                    if (e.target.value.length === 4) {
                      updateProfile({ postalCode: e.target.value });
                    }
                  }}
                  placeholder="Postnummer (4 cifre)"
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-kassen-green/60 transition-all"
                />
              </div>
            </>
          )}

          {/* CHILDREN */}
          {step === "children" && (
            <>
              <StepTag label="Familie" />
              <h2 className="font-display font-bold text-2xl mb-2">Har I børn under 18 år?</h2>
              <p className="text-muted-foreground text-sm mb-1">
                Vi præudfylder institutionsudgifter automatisk.
              </p>
              <YesNoButtons
                yesSub="vi finder institutionspriser"
                onYes={() => {
                  updateProfile({ hasChildren: true });
                  addAnswer("Børn", "Ja");
                  setStep("childAges");
                }}
                onNo={() => {
                  updateProfile({ hasChildren: false, childrenAges: [] });
                  addAnswer("Børn", "Ingen");
                  setStep("subscriptions");
                }}
              />
            </>
          )}

          {/* CHILD AGES */}
          {step === "childAges" && (
            <>
              <StepTag label="Familie" />
              {collectingChildAge < childCount ? (
                <>
                  <h2 className="font-display font-bold text-2xl mb-2">
                    Barn {collectingChildAge + 1} – hvilken aldersgruppe?
                  </h2>
                  <ChoiceGrid
                    options={CHILD_AGE_OPTIONS}
                    onSelect={(val) => {
                      const newAges = [...profile.childrenAges, val as number];
                      updateProfile({ childrenAges: newAges });
                      if (collectingChildAge + 1 < childCount) {
                        setCollectingChildAge((c) => c + 1);
                      } else {
                        addAnswer("Børn", `${childCount} barn${childCount > 1 ? "" : ""}`);
                        setStep("subscriptions");
                      }
                    }}
                  />
                </>
              ) : (
                <>
                  <h2 className="font-display font-bold text-2xl mb-2">Hvor mange børn?</h2>
                  <ChoiceGrid
                    options={[
                      { label: "1", value: 1 },
                      { label: "2", value: 2 },
                      { label: "3+", value: 3 },
                    ]}
                    onSelect={(val) => {
                      setChildCount(val as number);
                      setCollectingChildAge(0);
                    }}
                  />
                </>
              )}
            </>
          )}

          {/* SUBSCRIPTIONS */}
          {step === "subscriptions" && (
            <>
              <StepTag label="Abonnementer" />
              <h2 className="font-display font-bold text-xl mb-1">
                Hvilke abonnementer har I?
              </h2>
              <p className="text-muted-foreground text-sm mb-4">Vælg alle der passer.</p>
              <div className="space-y-2">
                {[
                  { key: "hasNetflix", label: "Netflix", price: "149 kr.", emoji: "🎬" },
                  { key: "hasSpotify", label: "Spotify", price: profile.householdType === "par" ? "159 kr." : "99 kr.", emoji: "🎵" },
                  { key: "hasHBO", label: "HBO Max", price: "109 kr.", emoji: "🎭" },
                  { key: "hasViaplay", label: "Viaplay", price: "149 kr.", emoji: "⚽" },
                  { key: "hasAppleTV", label: "Apple TV+", price: "59 kr.", emoji: "🍎" },
                ].map((sub) => (
                  <motion.button
                    key={sub.key}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() =>
                      updateProfile({
                        [sub.key]: !profile[sub.key as keyof BudgetProfile],
                      } as any)
                    }
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      profile[sub.key as keyof BudgetProfile]
                        ? "border-kassen-green bg-kassen-green/15 text-kassen-green"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span>{sub.emoji}</span>
                      <span className="font-medium">{sub.label}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">{sub.price}/md.</span>
                  </motion.button>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const subs = [
                    profile.hasNetflix && "Netflix",
                    profile.hasSpotify && "Spotify",
                    profile.hasHBO && "HBO",
                    profile.hasViaplay && "Viaplay",
                    profile.hasAppleTV && "Apple TV+",
                  ]
                    .filter(Boolean)
                    .join(", ");
                  addAnswer("Abonnementer", subs || "Ingen");
                  setStep("car");
                }}
                className="w-full mt-4 py-3 rounded-xl bg-kassen-green/15 border border-kassen-green/30 text-kassen-green font-semibold hover:bg-kassen-green/25 transition-all"
              >
                Fortsæt →
              </motion.button>
            </>
          )}

          {/* CAR */}
          {step === "car" && (
            <>
              <StepTag label="Transport" />
              <h2 className="font-display font-bold text-2xl mb-2">Har I bil?</h2>
              <p className="text-muted-foreground text-sm">
                Vi beregner gennemsnitlig biludgift inkl. forsikring, benzin og afgift.
              </p>
              <YesNoButtons
                yesSub="≈ 3.800 kr./md. samlet"
                onYes={() => {
                  updateProfile({ hasCar: true });
                  addAnswer("Transport", "Bil inkluderet");
                  setStep("done");
                }}
                onNo={() => {
                  updateProfile({ hasCar: false });
                  addAnswer("Transport", "Ingen bil");
                  setStep("done");
                }}
              />
            </>
          )}

          {/* DONE */}
          {step === "done" && (
            <>
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="text-5xl mb-4"
                >
                  ✨
                </motion.div>
                <h2 className="font-display font-bold text-2xl mb-2">
                  Overblik skabt.
                </h2>
                <p className="text-muted-foreground text-sm mb-1">
                  Nu ved I præcis hvor I står.
                </p>
                {liveDisposable !== null && (
                  <div className="mt-4 mb-6">
                    <p className="text-xs text-muted-foreground mb-1">Estimeret rådighedsbeløb</p>
                    <span
                      className={`font-display font-black text-4xl ${
                        liveDisposable > 5000
                          ? "text-kassen-green"
                          : liveDisposable > 0
                          ? "text-kassen-gold"
                          : "text-kassen-red"
                      }`}
                    >
                      {formatKr(liveDisposable)} kr.
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">om måneden</p>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onComplete(profile)}
                  className="w-full py-4 rounded-xl bg-kassen-green text-background font-display font-bold text-lg hover:opacity-90 transition-all"
                >
                  Se dit dashboard →
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
