import { createContext, useContext, type ReactNode } from "react";
import { createElement } from "react";

export type LocaleCode = "dk" | "no";

export interface LocaleConfig {
  code: LocaleCode;
  currencyLocale: string;   // "da-DK" | "nb-NO"
  currency: string;          // "DKK" | "NOK"
  currencyUnit: string;      // "kr." for both
  taxDeductionRate: number;
  hasDrLicense: boolean;     // Norway abolished NRK license 2020
  childBenefitFlat?: number; // Norway: flat NOK/month per child regardless of age
  housingTypeLabels: { lejer: string; ejer: string; andel: string };
  housingTypeDescriptions: { lejer: string; ejer: string; andel: string };
  unionLabel: string;
  propertyTaxLabel: string;
  optimization: {
    mobile: { label: string; url: string; cheapPricePerPerson: number };
    mortgage: { description: string; cta: string; url: string };
    insurance: { description: string; cta: string; url: string };
    streaming: { cta: string; url: string };
    food: { cta: string; url: string };
  };
}

export function formatCurrency(amount: number, locale: LocaleConfig): string {
  return new Intl.NumberFormat(locale.currencyLocale, {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── DK Config ────────────────────────────────────────────────

export const DK_LOCALE: LocaleConfig = {
  code: "dk",
  currencyLocale: "da-DK",
  currency: "DKK",
  currencyUnit: "kr.",
  taxDeductionRate: 0.256,
  hasDrLicense: true,
  housingTypeLabels: { lejer: "Lejer", ejer: "Ejer", andel: "Andelsbolig" },
  housingTypeDescriptions: {
    lejer: "Betaler husleje",
    ejer: "Ejer med boliglån",
    andel: "Andelsbolig",
  },
  unionLabel: "Fagforening & A-kasse",
  propertyTaxLabel: "Ejendomsværdiskat",
  optimization: {
    mobile: { label: "Se Oister →", url: "https://oister.dk", cheapPricePerPerson: 129 },
    mortgage: {
      description: "Mange boligejere kan spare 1.000–2.000 kr./md. ved at omlægge deres lån.",
      cta: "Se besparelse →",
      url: "https://parfinans.dk",
    },
    insurance: {
      description: "De der sammenligner forsikringer hvert 2. år sparer i gennemsnit 200 kr./md.",
      cta: "Sammenlign →",
      url: "https://www.forsikringsguiden.dk",
    },
    streaming: { cta: "Sammenlign →", url: "https://www.tjekdette.dk/streaming" },
    food: { cta: "Se madplan-guide →", url: "https://www.nemlig.com" },
  },
};

// ─── NO Config ────────────────────────────────────────────────

export const NO_LOCALE: LocaleConfig = {
  code: "no",
  currencyLocale: "nb-NO",
  currency: "NOK",
  currencyUnit: "kr.",
  taxDeductionRate: 0.22,
  hasDrLicense: false,
  childBenefitFlat: 1766, // 1 766 NOK/month flat per child 2025 (Nav.no)
  housingTypeLabels: { lejer: "Leier", ejer: "Selveier", andel: "Borettslag" },
  housingTypeDescriptions: {
    lejer: "Betaler husleie",
    ejer: "Selveier med boliglån",
    andel: "Borettslag",
  },
  unionLabel: "Fagforbund & dagpengekasse",
  propertyTaxLabel: "Eiendomsskatt",
  optimization: {
    mobile: { label: "Se Chilimobil →", url: "https://www.chilimobil.no", cheapPricePerPerson: 149 },
    mortgage: {
      description: "Mange boligeiere kan spare 1 000–2 000 kr./md. ved å refinansiere lånet.",
      cta: "Sammenlign →",
      url: "https://www.finansportalen.no/bank/boliglan",
    },
    insurance: {
      description: "De som sammenligner forsikringer hvert 2. år sparer i snitt 200 kr./md.",
      cta: "Sammenlign →",
      url: "https://www.finansportalen.no/forsikring",
    },
    streaming: { cta: "Sammenlign →", url: "https://www.prisjakt.no/streaming" },
    food: { cta: "Se matplan-guide →", url: "https://www.kolonial.no" },
  },
};

// ─── Context ──────────────────────────────────────────────────

const LocaleContext = createContext<LocaleConfig>(DK_LOCALE);

export function LocaleProvider({
  children,
  locale = DK_LOCALE,
}: {
  children: ReactNode;
  locale?: LocaleConfig;
}) {
  return createElement(LocaleContext.Provider, { value: locale }, children);
}

export function useLocale(): LocaleConfig {
  return useContext(LocaleContext);
}
