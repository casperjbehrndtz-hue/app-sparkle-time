// Kassen Prisdatabase – alle priser i NOK/md.
// Kilde: Offisielle norske priser pr. januar 2026

// Strømmetjenester – Norge 2026
export const NO_SUBSCRIPTIONS = {
  netflix:      { label: "Netflix",        price: 179, icon: "🎬", category: "Streaming" }, // Standard
  spotify:      { label: "Spotify",        price_solo: 129, price_par: 159, icon: "🎵", category: "Musikk" },
  hbo:          { label: "Max",            price: 109, icon: "🎭", category: "Streaming" },
  viaplay:      { label: "Viaplay",        price: 249, icon: "⚽", category: "Streaming" }, // Total
  appleTV:      { label: "Apple TV+",      price: 99,  icon: "🍎", category: "Streaming" },
  amazonPrime:  { label: "Amazon Prime",   price: 119, icon: "📦", category: "Streaming" },
  disney:       { label: "Disney+",        price: 99,  icon: "✨", category: "Streaming" },
};

export const NO_UTILITIES = {
  internet: { label: "Internett",     price: 399, icon: "📡", category: "Forsyning" }, // Altibox/Telenor snitt
  electricity: {
    label: "Strøm",
    price_solo: 1000,
    price_par: 1500,
    icon: "⚡",
    category: "Forsyning",
  },
  heating: {
    label: "Oppvarming/vann",
    price_solo: 400,
    price_par: 650,
    icon: "🔥",
    category: "Forsyning",
  },
  mobile: {
    label: "Mobil",
    price_per_person: 299, // Telenor/Telia middelpris
    icon: "📱",
    category: "Forsyning",
  },
  // NB: Ingen NRK-lisens — avskaffet 1. januar 2020
};

export const NO_FOOD = {
  solo: 5500,
  par: 9000,
  per_child: 1500,
};

export const NO_INSURANCE = {
  solo:   { label: "Forsikring (innbo + ulykke)", price: 800 },
  par:    { label: "Forsikring (innbo + ulykke + bil)", price: 1500 },
  family: { label: "Forsikring (familie)", price: 1800 },
};

export const NO_PUBLIC_TRANSPORT = {
  default: { label: "Kollektivtransport", price: 700 }, // Oslo t-bane / Ruter månedskort
};

export const NO_HEALTH = {
  default: { label: "Lege, tannlege & medisin", price: 400 },
};

export const NO_HOMEOWNER_ASSOCIATION = {
  default: { label: "Huseierforbund / sameie", price: 800 },
};

// Barnehage – makspris 2025: 3 315 NOK/md. (Utdanningsdirektoratet)
// SFO: kommunal variasjon, snitt ~2 200 NOK/md.
// AKS (aktivitetsskole): Oslo ~1 900 NOK/md.
export const NO_CHILDCARE = {
  age_0_2:  { label: "Barnehage (0–2 år)",          price: 3315 },
  age_3_5:  { label: "Barnehage (3–5 år)",           price: 3315 },
  age_6_9:  { label: "SFO / AKS (6–9 år)",           price: 2000 },
  age_10_12: { label: "Fritidsordning (10–12 år)",   price: 1000 },
  age_13_plus: { label: "Ingen institusjonskostnad (13+)", price: 0 },
};

// Barnetrygd 2025: 1 766 NOK/md. per barn, flat sats 0–17 år (Nav.no)
export const NO_CHILD_BENEFIT_MONTHLY = 1766;

export function noGetChildcarePrice(age: number): { label: string; price: number } {
  if (age <= 2)  return NO_CHILDCARE.age_0_2;
  if (age <= 5)  return NO_CHILDCARE.age_3_5;
  if (age <= 9)  return NO_CHILDCARE.age_6_9;
  if (age <= 12) return NO_CHILDCARE.age_10_12;
  return NO_CHILDCARE.age_13_plus;
}

// Barnetrygd: flat sats uavhengig av alder (0–17 år)
export function noGetChildBenefit(age: number): { label: string; monthly: number } {
  if (age <= 17) return { label: "Barnetrygd", monthly: NO_CHILD_BENEFIT_MONTHLY };
  return { label: "Ingen barnetrygd (18+ år)", monthly: 0 };
}

// Boliglån-estimater i NOK per postnummer (ydelse + renter, 25 år, ~80% belåning, 5% rente)
export const NO_MORTGAGE_ESTIMATES: Record<string, number> = {
  default: 12000,
  // Oslo (0xxx)
  "0100": 28000, "0150": 27000, "0180": 24000,
  "0250": 32000, // Frogner
  "0350": 26000, // Majorstuen
  "0450": 21000, // Grünerløkka
  "0550": 19000, // Tøyen
  "0650": 17000, // Helsfyr
  "0750": 20000, // Manglerud
  "0850": 18000, // Lambertseter
  "0950": 22000, // Nordstrand
  // Akershus
  "1300": 15000, "1400": 18000, "1440": 19000,
  "2000": 13000, // Lillestrøm
  // Stavanger (4xxx)
  "4000": 16000, "4020": 14000, "4050": 15000,
  // Bergen (5xxx)
  "5000": 17000, "5003": 16000, "5020": 14000, "5072": 13000,
  // Trondheim (7xxx)
  "7010": 14000, "7030": 13000, "7040": 12000,
  // Tromsø (9xxx)
  "9000": 12000, "9008": 11000,
  // Kristiansand (4600)
  "4600": 11000,
};

// Husleie-estimater i NOK
export const NO_RENT_ESTIMATES: Record<string, { solo: number; par: number }> = {
  default: { solo: 10000, par: 14000 },
  "0100": { solo: 16000, par: 21000 },
  "0150": { solo: 15000, par: 20000 },
  "0250": { solo: 18000, par: 24000 }, // Frogner
  "0350": { solo: 16000, par: 21000 }, // Majorstuen
  "0450": { solo: 14000, par: 18000 }, // Grünerløkka
  "0550": { solo: 12000, par: 16000 }, // Tøyen
  "0750": { solo: 11000, par: 15000 },
  "1300": { solo: 9000,  par: 12000 },
  "2000": { solo: 9000,  par: 12000 }, // Lillestrøm
  "4000": { solo: 10000, par: 13000 }, // Stavanger
  "5000": { solo: 11000, par: 14000 }, // Bergen
  "5003": { solo: 10500, par: 13500 },
  "7010": { solo: 9500,  par: 13000 }, // Trondheim
  "7030": { solo: 9000,  par: 12500 },
  "9000": { solo: 9000,  par: 12000 }, // Tromsø
  "4600": { solo: 8500,  par: 11500 }, // Kristiansand
};

// Borettslag-estimater (felleskostnader) i NOK
export const NO_BORETTSLAG_ESTIMATES: Record<string, { solo: number; par: number }> = {
  default: { solo: 4500, par: 6000 },
  "0100": { solo: 6000, par: 8000 },
  "0250": { solo: 7000, par: 9000 },
  "0350": { solo: 6000, par: 8000 },
  "0450": { solo: 5500, par: 7500 },
  "5000": { solo: 5000, par: 7000 }, // Bergen
  "7010": { solo: 4500, par: 6500 }, // Trondheim
  "9000": { solo: 4500, par: 6000 }, // Tromsø
};

// Eiendomsverdier i NOK per postnummer (kvm-pris × typisk areal)
export const NO_PROPERTY_VALUE_ESTIMATES: Record<string, number> = {
  default: 3500000,
  // Oslo
  "0100": 7500000, "0150": 7000000, "0180": 6500000,
  "0250": 9000000, // Frogner
  "0350": 7500000, // Majorstuen
  "0450": 6000000, // Grünerløkka
  "0550": 5000000, // Tøyen
  "0750": 5500000,
  // Akershus
  "1300": 5000000, "1400": 5500000,
  "2000": 4500000, // Lillestrøm
  // Stavanger
  "4000": 5000000, "4020": 4500000,
  // Bergen
  "5000": 5500000, "5003": 5000000, "5020": 4000000,
  // Trondheim
  "7010": 4500000, "7030": 4000000,
  // Tromsø
  "9000": 4000000,
  // Kristiansand
  "4600": 3500000,
};

// Eiendomsskatt: Oslo avskaffet 2023. Andre kommuner: typisk 3-5‰ av eiendomsverdi.
// For norske eiendommer beregner vi 4‰ av verdien, men sett til 0 for Oslo (0xxx).
export function noCalcPropertyTax(propertyValue: number, postalCode: string): number {
  if (postalCode.startsWith("0")) return 0; // Oslo: ingen eiendomsskatt
  if (propertyValue <= 0) return 500; // fallback
  return Math.round((propertyValue * 0.004) / 12);
}

export const NO_POSTAL_NAMES: Record<string, string> = {
  "0100": "Oslo sentrum", "0150": "Oslo sentrum", "0180": "Grønland",
  "0250": "Frogner", "0350": "Majorstuen", "0450": "Grünerløkka",
  "0550": "Tøyen", "0650": "Helsfyr", "0750": "Manglerud",
  "0850": "Lambertseter", "0950": "Nordstrand",
  "1300": "Sandvika", "1400": "Ski", "1440": "Drøbak",
  "2000": "Lillestrøm",
  "4000": "Stavanger", "4020": "Stavanger V", "4050": "Sola",
  "4600": "Kristiansand",
  "5000": "Bergen sentrum", "5003": "Bergen", "5020": "Bergen N", "5072": "Bergen S",
  "7010": "Trondheim", "7030": "Trondheim N", "7040": "Trondheim Ø",
  "9000": "Tromsø", "9008": "Tromsø N",
};

export function noGetMortgageEstimate(postalCode: string): number {
  return NO_MORTGAGE_ESTIMATES[postalCode]
    ?? NO_MORTGAGE_ESTIMATES[postalCode.substring(0, 2) + "00"]
    ?? NO_MORTGAGE_ESTIMATES.default;
}

export function noGetRentEstimate(postalCode: string, isPar: boolean): number {
  const entry = NO_RENT_ESTIMATES[postalCode]
    ?? NO_RENT_ESTIMATES[postalCode.substring(0, 2) + "00"]
    ?? NO_RENT_ESTIMATES.default;
  return isPar ? entry.par : entry.solo;
}

export function noGetBorettslagEstimate(postalCode: string, isPar: boolean): number {
  const entry = NO_BORETTSLAG_ESTIMATES[postalCode]
    ?? NO_BORETTSLAG_ESTIMATES[postalCode.substring(0, 2) + "00"]
    ?? NO_BORETTSLAG_ESTIMATES.default;
  return isPar ? entry.par : entry.solo;
}

export function noGetPropertyValueEstimate(postalCode: string): number {
  return NO_PROPERTY_VALUE_ESTIMATES[postalCode]
    ?? NO_PROPERTY_VALUE_ESTIMATES[postalCode.substring(0, 2) + "00"]
    ?? NO_PROPERTY_VALUE_ESTIMATES.default;
}

export function noGetPostalName(postalCode: string): string | null {
  return NO_POSTAL_NAMES[postalCode] ?? null;
}

export function noGetEstimateSource(housingType: string): string {
  if (housingType === "ejer") return "Basert på gjennomsnittlig boliglån for selveiere i området (kilde: Finansportalen 2025)";
  if (housingType === "andel") return "Basert på gjennomsnittlige felleskostnader for borettslag i området (kilde: NBBL 2025)";
  return "Basert på gjennomsnittlig husleie for leieboliger i området (kilde: Leieboerforeningen 2025)";
}
