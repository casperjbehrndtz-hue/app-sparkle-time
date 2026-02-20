import {
  SUBSCRIPTIONS,
  TRANSPORT,
  UTILITIES,
  FOOD,
  getMortgageEstimate,
  getChildcarePrice,
} from "@/data/priceDatabase";
import type { BudgetProfile, ComputedBudget, ExpenseItem } from "./types";

export function computeBudget(profile: BudgetProfile): ComputedBudget {
  const isPar = profile.householdType === "par";
  const totalIncome = profile.income + (isPar ? profile.partnerIncome : 0);
  const fixedExpenses: ExpenseItem[] = [];
  const variableExpenses: ExpenseItem[] = [];

  // Housing
  if (profile.housingType === "ejer" && profile.hasMortgage) {
    const mortgageAmt = getMortgageEstimate(profile.postalCode);
    fixedExpenses.push({
      category: "Bolig",
      label: "Boliglån (estimat)",
      amount: mortgageAmt,
      colorVar: "--kassen-blue",
    });
  } else if (profile.housingType === "lejer") {
    const rentAmt = isPar ? 9500 : 7000; // default estimate
    fixedExpenses.push({
      category: "Bolig",
      label: "Husleje (estimat)",
      amount: rentAmt,
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
  fixedExpenses.push({
    category: "Forsyning",
    label: "El",
    amount: isPar ? UTILITIES.electricity.price_par : UTILITIES.electricity.price_solo,
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
  if (profile.hasNetflix) {
    fixedExpenses.push({
      category: "Abonnementer",
      label: "Netflix",
      amount: SUBSCRIPTIONS.netflix.price,
      colorVar: "--kassen-green",
    });
  }
  if (profile.hasSpotify) {
    fixedExpenses.push({
      category: "Abonnementer",
      label: "Spotify",
      amount: isPar ? SUBSCRIPTIONS.spotify.price_par : SUBSCRIPTIONS.spotify.price_solo,
      colorVar: "--kassen-green",
    });
  }
  if (profile.hasHBO) {
    fixedExpenses.push({
      category: "Abonnementer",
      label: "HBO Max",
      amount: SUBSCRIPTIONS.hbo.price,
      colorVar: "--kassen-green",
    });
  }
  if (profile.hasViaplay) {
    fixedExpenses.push({
      category: "Abonnementer",
      label: "Viaplay",
      amount: SUBSCRIPTIONS.viaplay.price,
      colorVar: "--kassen-green",
    });
  }
  if (profile.hasAppleTV) {
    fixedExpenses.push({
      category: "Abonnementer",
      label: "Apple TV+",
      amount: SUBSCRIPTIONS.appleTV.price,
      colorVar: "--kassen-green",
    });
  }

  // Transport
  if (profile.hasCar) {
    fixedExpenses.push({
      category: "Transport",
      label: "Bil (total gennemsnit)",
      amount: TRANSPORT.car.price,
      colorVar: "--kassen-gold",
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

  // Variable expenses
  const foodAmount =
    FOOD[isPar ? "par" : "solo"] +
    (profile.hasChildren ? FOOD.per_child * profile.childrenAges.length : 0);
  variableExpenses.push({
    category: "Mad & dagligvarer",
    label: "Mad & dagligvarer",
    amount: foodAmount,
    colorVar: "--kassen-red",
  });

  variableExpenses.push({
    category: "Fritid",
    label: "Fritid & oplevelser",
    amount: isPar ? 2500 : 1500,
    colorVar: "--kassen-red",
  });

  variableExpenses.push({
    category: "Tøj",
    label: "Tøj & personlig pleje",
    amount: isPar ? 1200 : 800,
    colorVar: "--kassen-red",
  });

  const allExpenses = [...fixedExpenses, ...variableExpenses];
  const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const disposableIncome = totalIncome - totalExpenses;

  return {
    totalIncome,
    fixedExpenses,
    variableExpenses,
    totalExpenses,
    disposableIncome,
  };
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
      rank: 0,
      handling: `Skift til billigere mobilabonnement`,
      beskrivelse: isPar
        ? "Oister eller Lebara tilbyder samme dækning til 129 kr./md. per linje – en besparelse på over 5.000 kr./år."
        : "Oister tilbyder fuld dækning til 129 kr./md.",
      besparelse_kr: currentMobile - cheapMobile,
      cta_tekst: "Se Oister →",
      cta_url: "https://oister.dk",
      category: "Forsyning",
    });
  }

  // Streaming overlap
  const streamingCount = [profile.hasNetflix, profile.hasHBO, profile.hasViaplay, profile.hasAppleTV].filter(Boolean).length;
  if (streamingCount >= 3) {
    actions.push({
      rank: 0,
      handling: "Skær én streamingtjeneste",
      beskrivelse: `I har ${streamingCount} streamingtjenester. De fleste serier overlapper. Skær den mindst brugte fra og spar ${149} kr./md. – 1.788 kr. om året.`,
      besparelse_kr: 149,
      cta_tekst: "Sammenlign tjenester →",
      cta_url: "https://www.tjekdette.dk/streaming",
      category: "Abonnementer",
    });
  }

  // Food budget optimization
  const foodExpense = budget.variableExpenses.find((e) => e.category === "Mad & dagligvarer");
  if (foodExpense) {
    const potentialSaving = Math.round(foodExpense.amount * 0.12);
    actions.push({
      rank: 0,
      handling: "Reducer madbudgettet med 12%",
      beskrivelse: `Familier med samme profil som jer bruger i gennemsnit 12% mindre på mad ved at handle mere på tilbud og planlægge aftensmad. Det svarer til ${potentialSaving} kr. om måneden.`,
      besparelse_kr: potentialSaving,
      cta_tekst: "Se madplan-guide →",
      cta_url: "https://www.nemlig.com",
      category: "Mad",
    });
  }

  // Mortgage refinancing
  if (profile.housingType === "ejer" && profile.hasMortgage) {
    actions.push({
      rank: 0,
      handling: "Refinansier boliglånet",
      beskrivelse:
        "Med de nuværende renter kan mange familier spare 1.000-2.000 kr./md. ved at omlægge deres lån. Parfinans beregner gratis hvad I kan spare.",
      besparelse_kr: 1580,
      cta_tekst: "Se hvad I kan spare →",
      cta_url: "https://parfinans.dk",
      category: "Bolig",
    });
  }

  // Insurance check
  actions.push({
    rank: 0,
    handling: "Tjek jeres forsikringer",
    beskrivelse:
      "Familier der sammenligner forsikringer hvert 2. år sparer i gennemsnit 2.400 kr./år. Brug en uafhængig sammenligning.",
    besparelse_kr: 200,
    cta_tekst: "Sammenlign forsikringer →",
    cta_url: "https://www.forsikringsguiden.dk",
    category: "Forsikring",
  });

  // Sort by savings
  return actions
    .sort((a, b) => b.besparelse_kr - a.besparelse_kr)
    .slice(0, 4)
    .map((a, i) => ({ ...a, rank: i + 1 }));
}

export function formatKr(amount: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}
