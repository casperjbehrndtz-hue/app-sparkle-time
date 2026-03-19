import {
  SUBSCRIPTIONS,
  TRANSPORT,
  UTILITIES,
  FOOD,
  PUBLIC_TRANSPORT,
  HEALTH,
  HOMEOWNER_ASSOCIATION,
  TAX_DEDUCTION_RATE,
  getChildcarePrice,
  getChildBenefit,
  getPropertyValueEstimate,
} from "@/data/priceDatabase";
import {
  NO_SUBSCRIPTIONS, NO_UTILITIES, NO_FOOD, NO_PUBLIC_TRANSPORT,
  NO_HOMEOWNER_ASSOCIATION, noGetChildcarePrice, noGetChildBenefit,
  noGetPropertyValueEstimate, noCalcPropertyTax,
} from "@/data/priceDatabase.no";
import type { BudgetProfile, ComputedBudget, ExpenseItem } from "./types";
import { frequencyToMonthly, frequencyLabel } from "./types";
import type { MarketData } from "./marketData";
import { getLiveElCost } from "./marketData";
import type { LocaleConfig } from "./locale";
import { DK_LOCALE } from "./locale";

// Average annual kWh usage
const ANNUAL_KWH_SOLO = 2000;
const ANNUAL_KWH_PAR = 3500;

// Ejendomsværdiskat 2026 (L211/2022 — ny boligbeskatning gældende fra 2024)
// Sats 1: 0,51 % af vurderingspris op til 9.200.000 kr.
// Sats 2: 1,40 % af vurderingspris over 9.200.000 kr.
// Kilde: Skattestyrelsen / Boligskatteloven § 7
function calcEjendomsvaerdiskat(propertyValue: number): number {
  if (propertyValue <= 0) return 800; // fallback
  const THRESHOLD = 9_200_000;
  const annual =
    propertyValue <= THRESHOLD
      ? propertyValue * 0.0051
      : THRESHOLD * 0.0051 + (propertyValue - THRESHOLD) * 0.014;
  return Math.round(annual / 12);
}

export { calcEjendomsvaerdiskat };

export function computeBudget(profile: BudgetProfile, marketData?: MarketData | null, locale: LocaleConfig = DK_LOCALE): ComputedBudget {
  const isNO = locale.code === "no";
  const isPar = profile.householdType === "par";
  const additionalMonthly = (profile.additionalIncome || []).reduce((sum, s) => sum + frequencyToMonthly(s.amount, s.frequency), 0);

  // Børnepenge / Barnetrygd — tax-free income
  let childBenefitTotal = 0;
  if (profile.hasChildren && profile.childrenAges.length > 0) {
    if (isNO) {
      childBenefitTotal = profile.childrenAges.reduce((sum, age) => sum + noGetChildBenefit(age).monthly, 0);
    } else {
      childBenefitTotal = profile.childrenAges.reduce((sum, age) => sum + getChildBenefit(age).monthly, 0);
    }
  }
  
  const totalIncome = profile.income + (isPar ? profile.partnerIncome : 0) + additionalMonthly + childBenefitTotal;
  const fixedExpenses: ExpenseItem[] = [];
  const variableExpenses: ExpenseItem[] = [];

  // Housing
  if (profile.housingType === "ejer" && profile.mortgageAmount > 0) {
    fixedExpenses.push({
      category: "Bolig",
      label: "Boliglån",
      amount: profile.mortgageAmount,
      colorVar: "--nemt-blue",
    });
  } else if (profile.housingType === "andel") {
    if (profile.rentAmount > 0) {
      fixedExpenses.push({
        category: "Bolig",
        label: "Boligafgift (andel)",
        amount: profile.rentAmount,
        colorVar: "--nemt-blue",
      });
    }
    if (profile.mortgageAmount > 0) {
      fixedExpenses.push({
        category: "Bolig",
        label: "Andelslån",
        amount: profile.mortgageAmount,
        colorVar: "--nemt-blue",
      });
    }
  } else if (profile.housingType === "lejer" && profile.rentAmount > 0) {
    fixedExpenses.push({
      category: "Bolig",
      label: "Husleje",
      amount: profile.rentAmount,
      colorVar: "--nemt-blue",
    });
  }

  // Rentefradrag / Rentefradrag NO (mortgage interest tax deduction)
  if ((profile.housingType === "ejer" || profile.housingType === "andel") && profile.mortgageAmount > 0) {
    const interestRatePct = profile.interestRate > 0 ? profile.interestRate : 4.0;
    const interestFraction = Math.min(0.85, 0.4 + (interestRatePct * 0.06));
    const estimatedMonthlyInterest = Math.round(profile.mortgageAmount * interestFraction);
    const deductionRate = locale.taxDeductionRate;
    const monthlyDeduction = Math.round(estimatedMonthlyInterest * deductionRate);
    if (monthlyDeduction > 0) {
      const deductionLabel = isNO
        ? `Rentefradrag (skattefordel ~${Math.round(deductionRate * 100)}%)`
        : `Rentefradrag (skatteværdi ~${Math.round(deductionRate * 100)}%)`;
      fixedExpenses.push({
        category: "Bolig",
        label: deductionLabel,
        amount: -monthlyDeduction,
        colorVar: "--nemt-green",
      });
    }
  }

  // Utilities — always included, user can override amounts
  const utilDb = isNO ? NO_UTILITIES : UTILITIES;
  fixedExpenses.push({
    category: "Forsyning",
    label: isNO ? "Internett" : "Internet",
    amount: profile.internetAmount ?? utilDb.internet.price,
    colorVar: "--nemt-blue",
  });

  // Electricity: use profile override > live price > default (live price only for DK)
  const liveElCost = !isNO ? getLiveElCost(marketData ?? null, isPar ? ANNUAL_KWH_PAR : ANNUAL_KWH_SOLO) : null;
  const elDefault = liveElCost ?? (isPar ? utilDb.electricity.price_par : utilDb.electricity.price_solo);
  const elAmount = profile.electricityAmount ?? elDefault;
  const elLabel = isNO ? "Strøm" : ((!profile.electricityAmount && liveElCost) ? "El (live-pris)" : "El");
  fixedExpenses.push({
    category: "Forsyning",
    label: elLabel,
    amount: elAmount,
    colorVar: "--nemt-blue",
  });

  fixedExpenses.push({
    category: "Forsyning",
    label: isNO ? "Oppvarming/vann" : "Varme & vand",
    amount: profile.heatingAmount ?? (isPar ? utilDb.heating.price_par : utilDb.heating.price_solo),
    colorVar: "--nemt-blue",
  });
  fixedExpenses.push({
    category: "Forsyning",
    label: isPar ? "Mobil (2 pers.)" : "Mobil",
    amount: profile.mobileAmount ?? utilDb.mobile.price_per_person * (isPar ? 2 : 1),
    colorVar: "--nemt-blue",
  });

  // DR medielicens — only in Denmark (Norway abolished NRK license Jan 2020)
  if (!isNO) {
    fixedExpenses.push({
      category: "Forsyning",
      label: "DR (medielicens)",
      amount: profile.drAmount ?? UTILITIES.dr_licens.price,
      colorVar: "--nemt-blue",
    });
  }

  // Subscriptions
  const subDb = isNO ? NO_SUBSCRIPTIONS : SUBSCRIPTIONS;
  const subMap: { key: keyof BudgetProfile; label: string; amount: number }[] = [
    { key: "hasNetflix", label: "Netflix", amount: subDb.netflix.price },
    { key: "hasSpotify", label: "Spotify", amount: isPar ? subDb.spotify.price_par : subDb.spotify.price_solo },
    { key: "hasHBO", label: isNO ? "Max" : "HBO Max", amount: subDb.hbo.price },
    { key: "hasViaplay", label: "Viaplay", amount: subDb.viaplay.price },
    { key: "hasAppleTV", label: "Apple TV+", amount: subDb.appleTV.price },
    { key: "hasDisney", label: "Disney+", amount: subDb.disney.price },
    { key: "hasAmazonPrime", label: "Amazon Prime", amount: subDb.amazonPrime.price },
  ];
  subMap.forEach(({ key, label, amount }) => {
    if (profile[key]) {
      fixedExpenses.push({ category: "Abonnementer", label, amount, colorVar: "--nemt-green" });
    }
  });

  // Transport (detailed)
  if (profile.hasCar) {
    if (profile.carLoan > 0) {
      fixedExpenses.push({ category: "Transport", label: "Billån / leasing", amount: profile.carLoan, colorVar: "--nemt-gold" });
    }
    if (profile.carFuel > 0) {
      fixedExpenses.push({ category: "Transport", label: "Benzin / opladning", amount: profile.carFuel, colorVar: "--nemt-gold" });
    }
    if (profile.carInsurance > 0) {
      const monthly = Math.round(profile.carInsurance / 12);
      fixedExpenses.push({ category: "Transport", label: `Bilforsikring (${formatKr(profile.carInsurance)} kr./år)`, amount: monthly, colorVar: "--nemt-gold" });
    }
    if (profile.carTax > 0) {
      const monthly = Math.round(profile.carTax / 12);
      fixedExpenses.push({ category: "Transport", label: `Vægtafgift (${formatKr(profile.carTax)} kr./år)`, amount: monthly, colorVar: "--nemt-gold" });
    }
    if (profile.carService > 0) {
      const monthly = Math.round(profile.carService / 6);
      fixedExpenses.push({ category: "Transport", label: `Bilservice (${formatKr(profile.carService)} kr./halvår)`, amount: monthly, colorVar: "--nemt-gold" });
    }
  } else {
    fixedExpenses.push({
      category: "Transport", label: "Offentlig transport",
      amount: PUBLIC_TRANSPORT.default.price, colorVar: "--nemt-gold",
    });
  }

  // Grundejerforening / huseierforbund + ejendomsværdiskat / eiendomsskatt (auto for ejere)
  if (profile.housingType === "ejer") {
    fixedExpenses.push({
      category: "Bolig",
      label: isNO ? "Huseierforbund / sameie" : "Grundejerforening / ejerforening",
      amount: isNO ? NO_HOMEOWNER_ASSOCIATION.default.price : HOMEOWNER_ASSOCIATION.default.price,
      colorVar: "--nemt-blue",
    });
    const propValue = profile.propertyValue > 0
      ? profile.propertyValue
      : (isNO ? noGetPropertyValueEstimate(profile.postalCode) : getPropertyValueEstimate(profile.postalCode));
    const propertySkat = isNO
      ? noCalcPropertyTax(propValue, profile.postalCode)
      : calcEjendomsvaerdiskat(propValue);
    if (propertySkat > 0) {
      fixedExpenses.push({
        category: "Bolig",
        label: locale.propertyTaxLabel,
        amount: propertySkat,
        colorVar: "--nemt-blue",
      });
    }
  }

  // Insurance
  if (profile.hasInsurance) {
    fixedExpenses.push({
      category: "Forsikring",
      label: "Forsikringer",
      amount: profile.insuranceAmount,
      colorVar: "--nemt-blue",
    });
  }

  // Union
  if (profile.hasUnion) {
    fixedExpenses.push({
      category: "Fagforening",
      label: "Fagforening & A-kasse",
      amount: profile.unionAmount,
      colorVar: "--nemt-blue",
    });
  }

  // Pets
  if (profile.hasPet) {
    fixedExpenses.push({
      category: "Kæledyr",
      label: "Kæledyr (foder, dyrlæge, forsikring)",
      amount: profile.petAmount,
      colorVar: "--nemt-gold",
    });
  }

  // Loans (SU-lån, billån etc.)
  if (profile.hasLoan) {
    fixedExpenses.push({
      category: "Lån",
      label: "Lån (SU-lån, forbrugslån etc.)",
      amount: profile.loanAmount,
      colorVar: "--nemt-blue",
    });
  }

  // Fitness
  if (profile.hasFitness) {
    fixedExpenses.push({
      category: "Fitness",
      label: "Fitness / sport",
      amount: profile.fitnessAmount,
      colorVar: "--nemt-green",
    });
  }

  // Children — childcare costs
  if (profile.hasChildren && profile.childrenAges.length > 0) {
    profile.childrenAges.forEach((age, i) => {
      const care = isNO ? noGetChildcarePrice(age) : getChildcarePrice(age);
      if (care.price > 0) {
        const childLabel = `barn ${i + 1}`;
        fixedExpenses.push({
          category: isNO ? "Barn" : "Børn",
          label: `${care.label} (${childLabel})`,
          amount: care.price,
          colorVar: "--nemt-gold",
        });
      }
    });
  }

  // Custom expenses (with frequency)
  if (profile.customExpenses?.length > 0) {
    profile.customExpenses.forEach((ce) => {
      const monthly = frequencyToMonthly(ce.amount, ce.frequency || "monthly");
      const freqNote = ce.frequency && ce.frequency !== "monthly"
        ? ` (${formatKr(ce.amount)} kr./${frequencyLabel(ce.frequency)})`
        : "";
      fixedExpenses.push({
        category: "Andet",
        label: `${ce.label}${freqNote}`,
        amount: monthly,
        colorVar: "--nemt-blue",
      });
    });
  }

  // Savings
  if (profile.hasSavings && profile.savingsAmount > 0) {
    fixedExpenses.push({
      category: "Opsparing",
      label: "Opsparing / investering",
      amount: profile.savingsAmount,
      colorVar: "--nemt-green",
    });
  }

  // Variable expenses (use profile values — user can edit these)
  variableExpenses.push({
    category: isNO ? "Mat & dagligvarer" : "Mad & dagligvarer",
    label: isNO ? "Mat & dagligvarer" : "Mad & dagligvarer",
    amount: profile.foodAmount,
    colorVar: "--nemt-red",
  });
  variableExpenses.push({
    category: "Fritid",
    label: isNO ? "Fritid & opplevelser" : "Fritid & oplevelser",
    amount: profile.leisureAmount,
    colorVar: "--nemt-red",
  });
  variableExpenses.push({
    category: isNO ? "Klær" : "Tøj",
    label: isNO ? "Klær & personlig pleie" : "Tøj & personlig pleje",
    amount: profile.clothingAmount,
    colorVar: "--nemt-red",
  });
  variableExpenses.push({
    category: isNO ? "Helse" : "Sundhed",
    label: isNO ? "Lege, tannlege & medisin" : "Læge, tandlæge & medicin",
    amount: profile.healthAmount,
    colorVar: "--nemt-red",
  });
  variableExpenses.push({
    category: "Restaurant",
    label: "Restaurant & takeaway",
    amount: profile.restaurantAmount,
    colorVar: "--nemt-red",
  });

  const allExpenses = [...fixedExpenses, ...variableExpenses];
  const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const disposableIncome = totalIncome - totalExpenses;

  return { totalIncome, fixedExpenses, variableExpenses, totalExpenses, disposableIncome };
}

export function generateOptimizations(
  profile: BudgetProfile,
  budget: ComputedBudget,
  locale: LocaleConfig = DK_LOCALE,
) {
  const actions = [];
  const isPar = profile.householdType === "par";
  const isNO = locale.code === "no";
  const utilDb = isNO ? NO_UTILITIES : UTILITIES;
  const opt = locale.optimization;

  // Mobile savings
  const currentMobile = utilDb.mobile.price_per_person * (isPar ? 2 : 1);
  const cheapMobile = opt.mobile.cheapPricePerPerson * (isPar ? 2 : 1);
  if (currentMobile > cheapMobile) {
    actions.push({
      rank: 0,
      handling: isNO ? "Bytt til billigere mobilabonnement" : "Skift til billigere mobilabonnement",
      beskrivelse: isPar
        ? (isNO
          ? `Chilimobil eller Fjordkraft tilbyr samme dekning til ${opt.mobile.cheapPricePerPerson} kr./md. per linje.`
          : `Oister eller Lebara tilbyder samme dækning til ${opt.mobile.cheapPricePerPerson} kr./md. per linje.`)
        : (isNO
          ? `Chilimobil tilbyr full dekning til ${opt.mobile.cheapPricePerPerson} kr./md.`
          : `Oister tilbyder fuld dækning til ${opt.mobile.cheapPricePerPerson} kr./md.`),
      besparelse_kr: currentMobile - cheapMobile,
      cta_tekst: opt.mobile.label,
      cta_url: opt.mobile.url,
      category: "Forsyning",
    });
  }

  // Streaming overlap — suggest cutting cheapest service
  const subs = isNO ? NO_SUBSCRIPTIONS : SUBSCRIPTIONS;
  const activeStreamPrices = [
    profile.hasNetflix && subs.netflix.price,
    profile.hasHBO && subs.hbo.price,
    profile.hasViaplay && subs.viaplay.price,
    profile.hasAppleTV && subs.appleTV.price,
    profile.hasDisney && subs.disney.price,
    profile.hasAmazonPrime && subs.amazonPrime.price,
  ].filter((p): p is number => typeof p === "number");
  if (activeStreamPrices.length >= 3) {
    const cheapest = Math.min(...activeStreamPrices);
    actions.push({
      rank: 0,
      handling: isNO ? "Kutt én strømmetjeneste" : "Skær én streamingtjeneste",
      beskrivelse: isNO
        ? `Du har ${activeStreamPrices.length} strømmetjenester. Kutt den minst brukte og spar ~${cheapest} kr./md.`
        : `I har ${activeStreamPrices.length} streamingtjenester. Skær den mindst brukte og spar ~${cheapest} kr./md.`,
      besparelse_kr: cheapest,
      cta_tekst: opt.streaming.cta,
      cta_url: opt.streaming.url,
      category: "Abonnementer",
    });
  }

  // Food
  const foodCategory = isNO ? "Mat & dagligvarer" : "Mad & dagligvarer";
  const foodExpense = budget.variableExpenses.find((e) => e.category === foodCategory);
  if (foodExpense) {
    const saving = Math.round(foodExpense.amount * 0.12);
    actions.push({
      rank: 0,
      handling: isNO ? "Reduser matbudsjettet med 12%" : "Reducer madbudgettet med 12%",
      beskrivelse: isNO
        ? `Andre med samme profil bruker 12% mindre ved å handle tilbud og planlegge. Spar ${saving} kr./md.`
        : `Andre med samme profil bruger 12% mindre ved at handle tilbud og planlægge. Spar ${saving} kr./md.`,
      besparelse_kr: saving,
      cta_tekst: opt.food.cta,
      cta_url: opt.food.url,
      category: isNO ? "Mat" : "Mad",
    });
  }

  // Mortgage
  if (profile.housingType === "ejer" && profile.mortgageAmount > 0) {
    actions.push({
      rank: 0,
      handling: isNO ? "Refinansier boliglånet" : "Refinansier boliglånet",
      beskrivelse: opt.mortgage.description,
      besparelse_kr: Math.round(profile.mortgageAmount * 0.15),
      cta_tekst: opt.mortgage.cta,
      cta_url: opt.mortgage.url,
      category: "Bolig",
    });
  }

  // Insurance
  if (profile.hasInsurance) {
    actions.push({
      rank: 0,
      handling: isNO ? "Sjekk forsikringene dine" : "Tjek jeres forsikringer",
      beskrivelse: opt.insurance.description,
      besparelse_kr: Math.round(profile.insuranceAmount * 0.15),
      cta_tekst: opt.insurance.cta,
      cta_url: opt.insurance.url,
      category: "Forsikring",
    });
  }

  return actions
    .sort((a, b) => b.besparelse_kr - a.besparelse_kr)
    .slice(0, 5)
    .map((a, i) => ({ ...a, rank: i + 1 }));
}

export function formatKr(amount: number, localeCode = "da-DK"): string {
  return new Intl.NumberFormat(localeCode, {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}
