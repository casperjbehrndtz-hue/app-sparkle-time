import {
  SUBSCRIPTIONS,
  TRANSPORT,
  UTILITIES,
  FOOD,
  PUBLIC_TRANSPORT,
  HEALTH,
  HOMEOWNER_ASSOCIATION,
  PROPERTY_TAX,
  getChildcarePrice,
} from "@/data/priceDatabase";
import type { BudgetProfile, ComputedBudget, ExpenseItem } from "./types";
import { frequencyToMonthly, frequencyLabel } from "./types";
import type { MarketData } from "./marketData";
import { getLiveElCost } from "./marketData";

// Average annual kWh usage
const ANNUAL_KWH_SOLO = 2000;
const ANNUAL_KWH_PAR = 3500;

export function computeBudget(profile: BudgetProfile, marketData?: MarketData | null): ComputedBudget {
  const isPar = profile.householdType === "par";
  const additionalMonthly = (profile.additionalIncome || []).reduce((sum, s) => sum + frequencyToMonthly(s.amount, s.frequency), 0);
  const totalIncome = profile.income + (isPar ? profile.partnerIncome : 0) + additionalMonthly;
  const fixedExpenses: ExpenseItem[] = [];
  const variableExpenses: ExpenseItem[] = [];

  // Housing
  if (profile.housingType === "ejer" && profile.mortgageAmount > 0) {
    fixedExpenses.push({
      category: "Bolig",
      label: "Boliglån",
      amount: profile.mortgageAmount,
      colorVar: "--kassen-blue",
    });
  } else if (profile.housingType === "andel") {
    if (profile.rentAmount > 0) {
      fixedExpenses.push({
        category: "Bolig",
        label: "Boligafgift (andel)",
        amount: profile.rentAmount,
        colorVar: "--kassen-blue",
      });
    }
    if (profile.mortgageAmount > 0) {
      fixedExpenses.push({
        category: "Bolig",
        label: "Andelslån",
        amount: profile.mortgageAmount,
        colorVar: "--kassen-blue",
      });
    }
  } else if (profile.housingType === "lejer" && profile.rentAmount > 0) {
    fixedExpenses.push({
      category: "Bolig",
      label: "Husleje",
      amount: profile.rentAmount,
      colorVar: "--kassen-blue",
    });
  }

  // Utilities
  fixedExpenses.push({
    category: "Forsyning",
    label: "Internet",
    amount: UTILITIES.internet.price,
    colorVar: "--kassen-blue",
  });

  // Electricity: use live price if available
  const liveElCost = getLiveElCost(marketData ?? null, isPar ? ANNUAL_KWH_PAR : ANNUAL_KWH_SOLO);
  const elAmount = liveElCost ?? (isPar ? UTILITIES.electricity.price_par : UTILITIES.electricity.price_solo);
  const elLabel = liveElCost ? "El (live-pris)" : "El";
  fixedExpenses.push({
    category: "Forsyning",
    label: elLabel,
    amount: elAmount,
    colorVar: "--kassen-blue",
  });

  fixedExpenses.push({
    category: "Forsyning",
    label: "Varme & vand",
    amount: isPar ? UTILITIES.heating.price_par : UTILITIES.heating.price_solo,
    colorVar: "--kassen-blue",
  });
  fixedExpenses.push({
    category: "Forsyning",
    label: isPar ? "Mobil (2 pers.)" : "Mobil",
    amount: UTILITIES.mobile.price_per_person * (isPar ? 2 : 1),
    colorVar: "--kassen-blue",
  });

  // Subscriptions
  const subMap: { key: keyof BudgetProfile; label: string; amount: number }[] = [
    { key: "hasNetflix", label: "Netflix", amount: SUBSCRIPTIONS.netflix.price },
    { key: "hasSpotify", label: "Spotify", amount: isPar ? SUBSCRIPTIONS.spotify.price_par : SUBSCRIPTIONS.spotify.price_solo },
    { key: "hasHBO", label: "HBO Max", amount: SUBSCRIPTIONS.hbo.price },
    { key: "hasViaplay", label: "Viaplay", amount: SUBSCRIPTIONS.viaplay.price },
    { key: "hasAppleTV", label: "Apple TV+", amount: SUBSCRIPTIONS.appleTV.price },
    { key: "hasDisney", label: "Disney+", amount: SUBSCRIPTIONS.disney.price },
    { key: "hasAmazonPrime", label: "Amazon Prime", amount: SUBSCRIPTIONS.amazonPrime.price },
  ];
  subMap.forEach(({ key, label, amount }) => {
    if (profile[key]) {
      fixedExpenses.push({ category: "Abonnementer", label, amount, colorVar: "--kassen-green" });
    }
  });

  // Transport (detailed)
  if (profile.hasCar) {
    if (profile.carLoan > 0) {
      fixedExpenses.push({ category: "Transport", label: "Billån / leasing", amount: profile.carLoan, colorVar: "--kassen-gold" });
    }
    if (profile.carFuel > 0) {
      fixedExpenses.push({ category: "Transport", label: "Benzin / opladning", amount: profile.carFuel, colorVar: "--kassen-gold" });
    }
    if (profile.carInsurance > 0) {
      const monthly = Math.round(profile.carInsurance / 12);
      fixedExpenses.push({ category: "Transport", label: `Bilforsikring (${formatKr(profile.carInsurance)} kr./år)`, amount: monthly, colorVar: "--kassen-gold" });
    }
    if (profile.carTax > 0) {
      const monthly = Math.round(profile.carTax / 12);
      fixedExpenses.push({ category: "Transport", label: `Vægtafgift (${formatKr(profile.carTax)} kr./år)`, amount: monthly, colorVar: "--kassen-gold" });
    }
    if (profile.carService > 0) {
      const monthly = Math.round(profile.carService / 6);
      fixedExpenses.push({ category: "Transport", label: `Bilservice (${formatKr(profile.carService)} kr./halvår)`, amount: monthly, colorVar: "--kassen-gold" });
    }
  } else {
    fixedExpenses.push({
      category: "Transport", label: "Offentlig transport",
      amount: PUBLIC_TRANSPORT.default.price, colorVar: "--kassen-gold",
    });
  }

  // Grundejerforening + ejendomsskat (auto for ejere)
  if (profile.housingType === "ejer") {
    fixedExpenses.push({
      category: "Bolig",
      label: "Grundejerforening / ejerforening",
      amount: HOMEOWNER_ASSOCIATION.default.price,
      colorVar: "--kassen-blue",
    });
    fixedExpenses.push({
      category: "Bolig",
      label: "Ejendomsskat",
      amount: PROPERTY_TAX.default.price,
      colorVar: "--kassen-blue",
    });
  }

  // Insurance
  if (profile.hasInsurance) {
    fixedExpenses.push({
      category: "Forsikring",
      label: "Forsikringer",
      amount: profile.insuranceAmount,
      colorVar: "--kassen-blue",
    });
  }

  // Union
  if (profile.hasUnion) {
    fixedExpenses.push({
      category: "Fagforening",
      label: "Fagforening & A-kasse",
      amount: profile.unionAmount,
      colorVar: "--kassen-blue",
    });
  }

  // Pets
  if (profile.hasPet) {
    fixedExpenses.push({
      category: "Kæledyr",
      label: "Kæledyr (foder, dyrlæge, forsikring)",
      amount: profile.petAmount,
      colorVar: "--kassen-gold",
    });
  }

  // Loans (SU-lån, billån etc.)
  if (profile.hasLoan) {
    fixedExpenses.push({
      category: "Lån",
      label: "Lån (SU-lån, forbrugslån etc.)",
      amount: profile.loanAmount,
      colorVar: "--kassen-blue",
    });
  }

  // Fitness
  if (profile.hasFitness) {
    fixedExpenses.push({
      category: "Fitness",
      label: "Fitness / sport",
      amount: profile.fitnessAmount,
      colorVar: "--kassen-green",
    });
  }

  // Children
  if (profile.hasChildren && profile.childrenAges.length > 0) {
    profile.childrenAges.forEach((age, i) => {
      const care = getChildcarePrice(age);
      if (care.price > 0) {
        fixedExpenses.push({
          category: "Børn",
          label: `${care.label} (barn ${i + 1})`,
          amount: care.price,
          colorVar: "--kassen-gold",
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
        colorVar: "--kassen-blue",
      });
    });
  }

  // Savings
  if (profile.hasSavings && profile.savingsAmount > 0) {
    fixedExpenses.push({
      category: "Opsparing",
      label: "Opsparing / investering",
      amount: profile.savingsAmount,
      colorVar: "--kassen-green",
    });
  }

  // Variable expenses (use profile values — user can edit these)
  variableExpenses.push({
    category: "Mad & dagligvarer",
    label: "Mad & dagligvarer",
    amount: profile.foodAmount,
    colorVar: "--kassen-red",
  });
  variableExpenses.push({
    category: "Fritid",
    label: "Fritid & oplevelser",
    amount: profile.leisureAmount,
    colorVar: "--kassen-red",
  });
  variableExpenses.push({
    category: "Tøj",
    label: "Tøj & personlig pleje",
    amount: profile.clothingAmount,
    colorVar: "--kassen-red",
  });
  variableExpenses.push({
    category: "Sundhed",
    label: "Læge, tandlæge & medicin",
    amount: profile.healthAmount,
    colorVar: "--kassen-red",
  });
  variableExpenses.push({
    category: "Restaurant",
    label: "Restaurant & takeaway",
    amount: profile.restaurantAmount,
    colorVar: "--kassen-red",
  });

  const allExpenses = [...fixedExpenses, ...variableExpenses];
  const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const disposableIncome = totalIncome - totalExpenses;

  return { totalIncome, fixedExpenses, variableExpenses, totalExpenses, disposableIncome };
}

export function generateOptimizations(
  profile: BudgetProfile,
  budget: ComputedBudget
) {
  const actions = [];
  const isPar = profile.householdType === "par";

  // Mobile savings
  const currentMobile = UTILITIES.mobile.price_per_person * (isPar ? 2 : 1);
  const cheapMobile = isPar ? 258 : 129;
  if (currentMobile > cheapMobile) {
    actions.push({
      rank: 0, handling: "Skift til billigere mobilabonnement",
      beskrivelse: isPar
        ? "Oister eller Lebara tilbyder samme dækning til 129 kr./md. per linje."
        : "Oister tilbyder fuld dækning til 129 kr./md.",
      besparelse_kr: currentMobile - cheapMobile,
      cta_tekst: "Se Oister →", cta_url: "https://oister.dk", category: "Forsyning",
    });
  }

  // Streaming overlap
  const streamingCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV, profile.hasDisney, profile.hasAmazonPrime].filter(Boolean).length;
  if (streamingCount >= 3) {
    actions.push({
      rank: 0, handling: "Skær én streamingtjeneste",
      beskrivelse: `I har ${streamingCount} streamingtjenester. Skær den mindst brugte og spar ~149 kr./md.`,
      besparelse_kr: 149,
      cta_tekst: "Sammenlign →", cta_url: "https://www.tjekdette.dk/streaming", category: "Abonnementer",
    });
  }

  // Food
  const foodExpense = budget.variableExpenses.find((e) => e.category === "Mad & dagligvarer");
  if (foodExpense) {
    const saving = Math.round(foodExpense.amount * 0.12);
    actions.push({
      rank: 0, handling: "Reducer madbudgettet med 12%",
      beskrivelse: `Familier med samme profil bruger 12% mindre ved at handle tilbud og planlægge. Spar ${saving} kr./md.`,
      besparelse_kr: saving, cta_tekst: "Se madplan-guide →", cta_url: "https://www.nemlig.com", category: "Mad",
    });
  }

  // Mortgage
  if (profile.housingType === "ejer" && profile.mortgageAmount > 0) {
    actions.push({
      rank: 0, handling: "Refinansier boliglånet",
      beskrivelse: "Mange familier kan spare 1.000–2.000 kr./md. ved at omlægge deres lån.",
      besparelse_kr: 1580, cta_tekst: "Se besparelse →", cta_url: "https://parfinans.dk", category: "Bolig",
    });
  }

  // Insurance
  if (profile.hasInsurance) {
    actions.push({
      rank: 0, handling: "Tjek jeres forsikringer",
      beskrivelse: "Familier der sammenligner forsikringer hvert 2. år sparer i gennemsnit 200 kr./md.",
      besparelse_kr: 200, cta_tekst: "Sammenlign →", cta_url: "https://www.forsikringsguiden.dk", category: "Forsikring",
    });
  }

  return actions
    .sort((a, b) => b.besparelse_kr - a.besparelse_kr)
    .slice(0, 5)
    .map((a, i) => ({ ...a, rank: i + 1 }));
}

export function formatKr(amount: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}
