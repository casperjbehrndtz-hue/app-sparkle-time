import { createContext, useContext, type ReactNode } from "react";

export interface WhiteLabelConfig {
  // Brand
  brandKey?: string; // matches partner brand_key for tracking
  brandName: string;
  brandLogo?: string; // URL or import path
  brandTagline?: string;

  // Theme (HSL values for CSS variables)
  theme: {
    primary: string;        // e.g. "152 69% 32%"
    primaryForeground: string;
    accent?: string;
    destructive?: string;
  };

  // Display font override
  displayFont?: string;

  // CTA links (banks link to their own products)
  ctaLinks: {
    mortgage?: { label: string; url: string };
    insurance?: { label: string; url: string };
    savings?: { label: string; url: string };
    investment?: { label: string; url: string };
    loans?: { label: string; url: string };
    contact?: { label: string; url: string };
  };

  // Features to show/hide
  features: {
    showAIChat: boolean;
    showShareCard: boolean;
    showBankReport: boolean;
    showOptimizations: boolean;
    showNeighborComparison: boolean;
  };

  // Footer
  footer?: {
    text: string;
    disclaimerText?: string;
    privacyUrl?: string;
  };

  // Social proof (can be replaced per bank)
  testimonials?: Array<{
    quote: string;
    name: string;
    location: string;
  }>;

  // Landing page
  hero: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    ctaLabel: string;
    stats: Array<{ value: string; label: string }>;
  };
}

// ─── Default "Kassen" config ─────────────────────────────────

export const defaultConfig: WhiteLabelConfig = {
  brandName: "Kassen",
  brandTagline: "Smart budgetværktøj",
  theme: {
    primary: "216 56% 22%",
    primaryForeground: "0 0% 100%",
  },
  ctaLinks: {
    mortgage: { label: "Se refinansiering →", url: "https://parfinans.dk" },
    insurance: { label: "Sammenlign forsikringer →", url: "https://www.forsikringsguiden.dk" },
    savings: { label: "Læs mere om nødopsparinger →", url: "https://www.raadtilpenge.dk/penge-og-pension/opsparing" },
    investment: { label: "Læs mere om investering →", url: "https://www.raadtilpenge.dk/investering" },
  },
  features: {
    showAIChat: true,
    showShareCard: true,
    showBankReport: true,
    showOptimizations: true,
    showNeighborComparison: true,
  },
  hero: {
    title: "Tag kontrol over",
    titleHighlight: "din privatøkonomi.",
    subtitle: "Find skjulte udgifter, se hvad du reelt har til overs og stå stærkt til fremtiden — gratis og på 3 minutter.",
    ctaLabel: "Tjek din økonomi gratis",
    stats: [
      { value: "3 min", label: "At udfylde" },
      { value: "2.400 kr.", label: "Gns. besparelse/md." },
      { value: "100%", label: "Privat & gratis" },
    ],
  },
  testimonials: [
    { quote: "Jeg troede jeg havde styr på det, men Kassen viste mig 2.800 kr. i abonnementer jeg havde glemt.", name: "Sofie, 31", location: "Aalborg" },
    { quote: "Vi brugte rapporten som udgangspunkt til et møde med banken — super nemt.", name: "Jonas & Katrine", location: "København" },
    { quote: "Det tog bogstaveligt 3 minutter. Ingen login, ingen regneark. Bare overblik.", name: "Mads, 42", location: "Aarhus" },
  ],
};

// ─── Demo: Nordea white-label ────────────────────────────────

export const nordeaConfig: WhiteLabelConfig = {
  brandName: "Nordea Budget",
  brandTagline: "Din økonomi – ét overblik",
  theme: {
    primary: "213 100% 30%", // Nordea dark blue
    primaryForeground: "0 0% 100%",
  },
  displayFont: "'Inter', system-ui, sans-serif",
  ctaLinks: {
    mortgage: { label: "Tal med din rådgiver →", url: "https://nordea.dk/bolig" },
    insurance: { label: "Se Nordea Forsikring →", url: "https://nordea.dk/forsikring" },
    savings: { label: "Åbn MånedsOpsparing →", url: "https://nordea.dk/opsparing" },
    investment: { label: "Start Nordea Invest →", url: "https://nordea.dk/investering" },
    contact: { label: "Book rådgivermøde →", url: "https://nordea.dk/booking" },
  },
  features: {
    showAIChat: true,
    showShareCard: true,
    showBankReport: true,
    showOptimizations: true,
    showNeighborComparison: true,
  },
  hero: {
    title: "Få overblik over",
    titleHighlight: "hele din økonomi.",
    subtitle: "Nordeas budgetværktøj giver dig et komplet billede af din økonomi på 3 minutter.",
    ctaLabel: "Start dit budget",
    stats: [
      { value: "3 min", label: "At udfylde" },
      { value: "100%", label: "Gratis for alle" },
      { value: "AI", label: "Personlige råd" },
    ],
  },
  footer: {
    text: "© 2026 Nordea Danmark A/S",
    disclaimerText: "Beregningerne er vejledende og erstatter ikke personlig rådgivning.",
    privacyUrl: "https://nordea.dk/privatliv",
  },
  testimonials: [
    { quote: "Endeligt et budget-værktøj der virker i min netbank.", name: "Nordea-kunde", location: "København" },
    { quote: "Perfekt forberedelse til mit rådgivermøde.", name: "Nordea-kunde", location: "Aarhus" },
    { quote: "3 minutter og jeg havde overblik over alt.", name: "Nordea-kunde", location: "Odense" },
  ],
};

// ─── Demo: Danske Bank white-label ───────────────────────────

export const danskeConfig: WhiteLabelConfig = {
  brandName: "Danske Budget",
  brandTagline: "Gør det der gør en forskel",
  theme: {
    primary: "195 100% 25%", // Danske Bank teal
    primaryForeground: "0 0% 100%",
  },
  ctaLinks: {
    mortgage: { label: "Beregn dit boliglån →", url: "https://danskebank.dk/bolig" },
    savings: { label: "Åbn Flexinvest →", url: "https://danskebank.dk/investering" },
    contact: { label: "Kontakt din rådgiver →", url: "https://danskebank.dk/kontakt" },
  },
  features: {
    showAIChat: true,
    showShareCard: true,
    showBankReport: true,
    showOptimizations: true,
    showNeighborComparison: true,
  },
  hero: {
    title: "Forstå din økonomi",
    titleHighlight: "på 3 minutter.",
    subtitle: "Danske Banks AI-budgetværktøj viser hvad du reelt har til overs — og hvordan du optimerer.",
    ctaLabel: "Lav dit budget",
    stats: [
      { value: "3 min", label: "Hurtig opsætning" },
      { value: "AI", label: "Personlige anbefalinger" },
      { value: "100%", label: "Gratis" },
    ],
  },
  footer: {
    text: "© 2026 Danske Bank A/S",
    disclaimerText: "Beregningerne er vejledende. Kontakt din rådgiver for personlig rådgivning.",
  },
  testimonials: [
    { quote: "Meget bedre end det gamle budgetskema.", name: "Danske Bank-kunde", location: "København" },
    { quote: "AI-rådene hjalp mig spare 2.800 kr./md.", name: "Danske Bank-kunde", location: "Aalborg" },
    { quote: "Tog det med til mit rådgivermøde — perfekt forberedelse.", name: "Danske Bank-kunde", location: "Aarhus" },
  ],
};

// ─── Context ─────────────────────────────────────────────────

const WhiteLabelContext = createContext<WhiteLabelConfig>(defaultConfig);

export function WhiteLabelProvider({ config = defaultConfig, children }: { config?: WhiteLabelConfig; children: ReactNode }) {
  return (
    <WhiteLabelContext.Provider value={config}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel() {
  return useContext(WhiteLabelContext);
}

// ─── Norwegian default config ─────────────────────────────────

export const kassenNoConfig: WhiteLabelConfig = {
  brandName: "Kassen NO",
  brandTagline: "Smart budsjetteringsverktøy",
  theme: {
    primary: "216 56% 22%",
    primaryForeground: "0 0% 100%",
  },
  ctaLinks: {
    mortgage: { label: "Sammenlign boliglån →", url: "https://www.finansportalen.no/bank/boliglan" },
    insurance: { label: "Sammenlign forsikringer →", url: "https://www.finansportalen.no/forsikring" },
    savings: { label: "Les mer om buffersparing →", url: "https://www.dinepenger.no/sparing" },
    investment: { label: "Les mer om investering →", url: "https://www.finansportalen.no/investering" },
  },
  features: {
    showAIChat: true,
    showShareCard: true,
    showBankReport: true,
    showOptimizations: true,
    showNeighborComparison: true,
  },
  hero: {
    title: "Ta kontroll over",
    titleHighlight: "din privatøkonomi.",
    subtitle: "Finn skjulte utgifter, se hva du reelt har til overs og stå sterkt for fremtiden — gratis og på 3 minutter.",
    ctaLabel: "Sjekk økonomien din gratis",
    stats: [
      { value: "3 min", label: "Å fylle ut" },
      { value: "2 400 kr.", label: "Gj.sn. besparelse/md." },
      { value: "100%", label: "Privat & gratis" },
    ],
  },
  testimonials: [
    { quote: "Jeg trodde jeg hadde kontroll, men Kassen viste meg 2 800 kr. i abonnementer jeg hadde glemt.", name: "Sofie, 31", location: "Stavanger" },
    { quote: "Vi brukte rapporten som utgangspunkt til et møte med banken — veldig enkelt.", name: "Jonas & Katrine", location: "Oslo" },
    { quote: "Det tok bokstavelig talt 3 minutter. Ingen innlogging, ingen regneark. Bare oversikt.", name: "Mads, 42", location: "Bergen" },
  ],
};

// ─── Available configs (for demo/showcase) ───────────────────

export const AVAILABLE_CONFIGS: Record<string, WhiteLabelConfig> = {
  kassen: { ...defaultConfig, brandKey: "kassen" },
  nordea: { ...nordeaConfig, brandKey: "nordea" },
  danske: danskeConfig,
  danskebank: danskeConfig,
  no: { ...kassenNoConfig, brandKey: "no" },
  sparebank1: { ...kassenNoConfig, brandName: "SpareBank 1 Budsjett", brandKey: "sparebank1" },
  dnb: { ...kassenNoConfig, brandName: "DNB Budsjett", brandKey: "dnb" },
};
