// ─── Category emojis ────────────────────────────────

export const CATEGORY_EMOJIS: Record<string, string> = {
  "Bolig": "home",
  "Forsyning": "zap",
  "Transport": "car",
  "Mad": "shopping-cart",
  "Restaurant": "utensils",
  "Streaming": "tv",
  "Sundhed": "pill",
  "Forsikring": "shield",
  "Fagforening": "handshake",
  "Fitness": "dumbbell",
  "Kæledyr": "paw-print",
  "Lån": "building",
  "Tøj": "shirt",
  "Fritid": "gamepad-2",
  "Opsparing": "banknote",
  "Løn": "wallet",
  "Overførsel": "refresh-cw",
  "Andet": "package",
};

// ─── Merchant → category mapping ────────────────────

interface MerchantMatch {
  kategori: string;
  cleanName: string;
  emoji: string;
}

// Key = lowercase substring to match against transaction text
const MERCHANTS: Record<string, MerchantMatch> = {
  // ── Mad / Dagligvarer ──
  "netto": { kategori: "Mad", cleanName: "Netto", emoji: "shopping-cart" },
  "føtex": { kategori: "Mad", cleanName: "Føtex", emoji: "shopping-cart" },
  "fotex": { kategori: "Mad", cleanName: "Føtex", emoji: "shopping-cart" },
  "bilka": { kategori: "Mad", cleanName: "Bilka", emoji: "shopping-cart" },
  "coop": { kategori: "Mad", cleanName: "COOP", emoji: "shopping-cart" },
  "kvickly": { kategori: "Mad", cleanName: "Kvickly", emoji: "shopping-cart" },
  "brugsen": { kategori: "Mad", cleanName: "Brugsen", emoji: "shopping-cart" },
  "superbrugsen": { kategori: "Mad", cleanName: "SuperBrugsen", emoji: "shopping-cart" },
  "dagli'brugsen": { kategori: "Mad", cleanName: "Dagli'Brugsen", emoji: "shopping-cart" },
  "irma": { kategori: "Mad", cleanName: "Irma", emoji: "shopping-cart" },
  "rema 1000": { kategori: "Mad", cleanName: "REMA 1000", emoji: "shopping-cart" },
  "rema1000": { kategori: "Mad", cleanName: "REMA 1000", emoji: "shopping-cart" },
  "lidl": { kategori: "Mad", cleanName: "Lidl", emoji: "shopping-cart" },
  "aldi": { kategori: "Mad", cleanName: "Aldi", emoji: "shopping-cart" },
  "fakta": { kategori: "Mad", cleanName: "Fakta", emoji: "shopping-cart" },
  "meny": { kategori: "Mad", cleanName: "Meny", emoji: "shopping-cart" },
  "spar": { kategori: "Mad", cleanName: "SPAR", emoji: "shopping-cart" },
  "365discount": { kategori: "Mad", cleanName: "365discount", emoji: "shopping-cart" },
  "døgnnetto": { kategori: "Mad", cleanName: "Døgnnetto", emoji: "shopping-cart" },
  "fleggaard": { kategori: "Mad", cleanName: "Fleggaard", emoji: "shopping-cart" },
  "nemlig": { kategori: "Mad", cleanName: "Nemlig.com", emoji: "shopping-cart" },
  "osuma": { kategori: "Mad", cleanName: "Osuma", emoji: "shopping-cart" },

  // ── Restaurant / Takeaway ──
  "mcdonalds": { kategori: "Restaurant", cleanName: "McDonald's", emoji: "utensils" },
  "mcdonald": { kategori: "Restaurant", cleanName: "McDonald's", emoji: "utensils" },
  "burger king": { kategori: "Restaurant", cleanName: "Burger King", emoji: "utensils" },
  "subway": { kategori: "Restaurant", cleanName: "Subway", emoji: "utensils" },
  "sunset boulevard": { kategori: "Restaurant", cleanName: "Sunset Boulevard", emoji: "utensils" },
  "dominos": { kategori: "Restaurant", cleanName: "Domino's", emoji: "utensils" },
  "just eat": { kategori: "Restaurant", cleanName: "Just Eat", emoji: "utensils" },
  "just-eat": { kategori: "Restaurant", cleanName: "Just Eat", emoji: "utensils" },
  "wolt": { kategori: "Restaurant", cleanName: "Wolt", emoji: "utensils" },
  "hungry": { kategori: "Restaurant", cleanName: "Hungry.dk", emoji: "utensils" },
  "starbucks": { kategori: "Restaurant", cleanName: "Starbucks", emoji: "utensils" },
  "espresso house": { kategori: "Restaurant", cleanName: "Espresso House", emoji: "utensils" },
  "joe and the juice": { kategori: "Restaurant", cleanName: "Joe & The Juice", emoji: "utensils" },
  "7-eleven": { kategori: "Restaurant", cleanName: "7-Eleven", emoji: "utensils" },
  "cafe": { kategori: "Restaurant", cleanName: "Café", emoji: "utensils" },

  // ── Transport ──
  "shell": { kategori: "Transport", cleanName: "Shell", emoji: "car" },
  "q8": { kategori: "Transport", cleanName: "Q8", emoji: "car" },
  "circle k": { kategori: "Transport", cleanName: "Circle K", emoji: "car" },
  "ok benzin": { kategori: "Transport", cleanName: "OK Benzin", emoji: "car" },
  "go'on": { kategori: "Transport", cleanName: "Go'on", emoji: "car" },
  "f24": { kategori: "Transport", cleanName: "F24", emoji: "car" },
  "ingo": { kategori: "Transport", cleanName: "Ingo", emoji: "car" },
  "uno-x": { kategori: "Transport", cleanName: "UNO-X", emoji: "car" },
  "dsb": { kategori: "Transport", cleanName: "DSB", emoji: "car" },
  "rejsekort": { kategori: "Transport", cleanName: "Rejsekort", emoji: "car" },
  "fynbus": { kategori: "Transport", cleanName: "FynBus", emoji: "car" },
  "midttrafik": { kategori: "Transport", cleanName: "Midttrafik", emoji: "car" },
  "movia": { kategori: "Transport", cleanName: "Movia", emoji: "car" },
  "nordjyllands trafikselskab": { kategori: "Transport", cleanName: "NT", emoji: "car" },
  "clever": { kategori: "Transport", cleanName: "Clever", emoji: "car" },
  "e.on drive": { kategori: "Transport", cleanName: "E.ON Drive", emoji: "car" },
  "spirii": { kategori: "Transport", cleanName: "Spirii", emoji: "car" },
  "parkering": { kategori: "Transport", cleanName: "Parkering", emoji: "car" },
  "easypark": { kategori: "Transport", cleanName: "EasyPark", emoji: "car" },
  "apcoa": { kategori: "Transport", cleanName: "APCOA", emoji: "car" },
  "fde": { kategori: "Transport", cleanName: "FDM", emoji: "car" },

  // ── Streaming ──
  "netflix": { kategori: "Streaming", cleanName: "Netflix", emoji: "tv" },
  "spotify": { kategori: "Streaming", cleanName: "Spotify", emoji: "tv" },
  "hbo max": { kategori: "Streaming", cleanName: "HBO Max", emoji: "tv" },
  "hbo nordic": { kategori: "Streaming", cleanName: "HBO", emoji: "tv" },
  "viaplay": { kategori: "Streaming", cleanName: "Viaplay", emoji: "tv" },
  "disney+": { kategori: "Streaming", cleanName: "Disney+", emoji: "tv" },
  "disney plus": { kategori: "Streaming", cleanName: "Disney+", emoji: "tv" },
  "apple tv": { kategori: "Streaming", cleanName: "Apple TV+", emoji: "tv" },
  "amazon prime": { kategori: "Streaming", cleanName: "Amazon Prime", emoji: "tv" },
  "youtube premium": { kategori: "Streaming", cleanName: "YouTube Premium", emoji: "tv" },
  "tv2 play": { kategori: "Streaming", cleanName: "TV 2 Play", emoji: "tv" },
  "drtv": { kategori: "Streaming", cleanName: "DRTV", emoji: "tv" },
  "apple music": { kategori: "Streaming", cleanName: "Apple Music", emoji: "tv" },
  "tidal": { kategori: "Streaming", cleanName: "Tidal", emoji: "tv" },
  "audible": { kategori: "Streaming", cleanName: "Audible", emoji: "tv" },
  "mofibo": { kategori: "Streaming", cleanName: "Mofibo", emoji: "tv" },
  "storytel": { kategori: "Streaming", cleanName: "Storytel", emoji: "tv" },
  "bookbeat": { kategori: "Streaming", cleanName: "BookBeat", emoji: "tv" },

  // ── Fitness ──
  "fitness world": { kategori: "Fitness", cleanName: "Fitness World", emoji: "dumbbell" },
  "fitnessworld": { kategori: "Fitness", cleanName: "Fitness World", emoji: "dumbbell" },
  "sats": { kategori: "Fitness", cleanName: "SATS", emoji: "dumbbell" },
  "crossfit": { kategori: "Fitness", cleanName: "CrossFit", emoji: "dumbbell" },
  "fit&sund": { kategori: "Fitness", cleanName: "Fit&Sund", emoji: "dumbbell" },
  "fitnessdk": { kategori: "Fitness", cleanName: "Fitness.dk", emoji: "dumbbell" },
  "loop fitness": { kategori: "Fitness", cleanName: "Loop Fitness", emoji: "dumbbell" },

  // ── Sundhed ──
  "apotek": { kategori: "Sundhed", cleanName: "Apotek", emoji: "pill" },
  "matas": { kategori: "Sundhed", cleanName: "Matas", emoji: "pill" },
  "tandlæge": { kategori: "Sundhed", cleanName: "Tandlæge", emoji: "pill" },
  "tandlaege": { kategori: "Sundhed", cleanName: "Tandlæge", emoji: "pill" },
  "læge": { kategori: "Sundhed", cleanName: "Læge", emoji: "pill" },
  "fysioterapi": { kategori: "Sundhed", cleanName: "Fysioterapi", emoji: "pill" },
  "kiropraktor": { kategori: "Sundhed", cleanName: "Kiropraktor", emoji: "pill" },
  "normal": { kategori: "Sundhed", cleanName: "Normal", emoji: "pill" },

  // ── Tøj / Shopping ──
  "h&m": { kategori: "Tøj", cleanName: "H&M", emoji: "shirt" },
  "zara": { kategori: "Tøj", cleanName: "Zara", emoji: "shirt" },
  "jack & jones": { kategori: "Tøj", cleanName: "Jack & Jones", emoji: "shirt" },
  "bestseller": { kategori: "Tøj", cleanName: "Bestseller", emoji: "shirt" },
  "only": { kategori: "Tøj", cleanName: "ONLY", emoji: "shirt" },
  "vero moda": { kategori: "Tøj", cleanName: "Vero Moda", emoji: "shirt" },
  "zalando": { kategori: "Tøj", cleanName: "Zalando", emoji: "shirt" },
  "asos": { kategori: "Tøj", cleanName: "ASOS", emoji: "shirt" },
  "boozt": { kategori: "Tøj", cleanName: "Boozt", emoji: "shirt" },

  // ── Bolig ──
  "ikea": { kategori: "Bolig", cleanName: "IKEA", emoji: "home" },
  "jysk": { kategori: "Bolig", cleanName: "JYSK", emoji: "home" },
  "bauhaus": { kategori: "Bolig", cleanName: "Bauhaus", emoji: "home" },
  "silvan": { kategori: "Bolig", cleanName: "Silvan", emoji: "home" },
  "harald nyborg": { kategori: "Bolig", cleanName: "Harald Nyborg", emoji: "home" },
  "idemøbler": { kategori: "Bolig", cleanName: "IDEmøbler", emoji: "home" },

  // ── Forsyning ──
  "ørsted": { kategori: "Forsyning", cleanName: "Ørsted", emoji: "zap" },
  "norlys": { kategori: "Forsyning", cleanName: "Norlys", emoji: "zap" },
  "ewii": { kategori: "Forsyning", cleanName: "Ewii", emoji: "zap" },
  "andel energi": { kategori: "Forsyning", cleanName: "Andel Energi", emoji: "zap" },
  "radius": { kategori: "Forsyning", cleanName: "Radius", emoji: "zap" },
  "youSee": { kategori: "Forsyning", cleanName: "YouSee", emoji: "zap" },
  "yousee": { kategori: "Forsyning", cleanName: "YouSee", emoji: "zap" },
  "tdc": { kategori: "Forsyning", cleanName: "TDC", emoji: "zap" },
  "telenor": { kategori: "Forsyning", cleanName: "Telenor", emoji: "zap" },
  "telia": { kategori: "Forsyning", cleanName: "Telia", emoji: "zap" },
  "3 mobil": { kategori: "Forsyning", cleanName: "3", emoji: "zap" },
  "lebara": { kategori: "Forsyning", cleanName: "Lebara", emoji: "zap" },
  "oister": { kategori: "Forsyning", cleanName: "Oister", emoji: "zap" },
  "cbb mobil": { kategori: "Forsyning", cleanName: "CBB Mobil", emoji: "zap" },
  "dr licens": { kategori: "Forsyning", cleanName: "DR Licens", emoji: "zap" },
  "medielicens": { kategori: "Forsyning", cleanName: "Medielicens", emoji: "zap" },

  // ── Forsikring ──
  "tryg": { kategori: "Forsikring", cleanName: "Tryg", emoji: "shield" },
  "topdanmark": { kategori: "Forsikring", cleanName: "Topdanmark", emoji: "shield" },
  "alm brand": { kategori: "Forsikring", cleanName: "Alm. Brand", emoji: "shield" },
  "alm. brand": { kategori: "Forsikring", cleanName: "Alm. Brand", emoji: "shield" },
  "gjensidige": { kategori: "Forsikring", cleanName: "Gjensidige", emoji: "shield" },
  "codan": { kategori: "Forsikring", cleanName: "Codan", emoji: "shield" },
  "if forsikring": { kategori: "Forsikring", cleanName: "If Forsikring", emoji: "shield" },

  // ── Fritid / Underholdning ──
  "elgiganten": { kategori: "Fritid", cleanName: "Elgiganten", emoji: "gamepad-2" },
  "power": { kategori: "Fritid", cleanName: "Power", emoji: "gamepad-2" },
  "proshop": { kategori: "Fritid", cleanName: "Proshop", emoji: "gamepad-2" },
  "komplett": { kategori: "Fritid", cleanName: "Komplett", emoji: "gamepad-2" },
  "bog & ide": { kategori: "Fritid", cleanName: "Bog & Idé", emoji: "gamepad-2" },
  "saxo": { kategori: "Fritid", cleanName: "Saxo.com", emoji: "gamepad-2" },
  "tivoli": { kategori: "Fritid", cleanName: "Tivoli", emoji: "gamepad-2" },
  "biografen": { kategori: "Fritid", cleanName: "Biografen", emoji: "gamepad-2" },
  "nordisk film": { kategori: "Fritid", cleanName: "Nordisk Film Bio", emoji: "gamepad-2" },
  "cinemaxx": { kategori: "Fritid", cleanName: "CinemaxX", emoji: "gamepad-2" },

  // ── Kæledyr ──
  "dyrlæge": { kategori: "Kæledyr", cleanName: "Dyrlæge", emoji: "paw-print" },
  "animail": { kategori: "Kæledyr", cleanName: "Animail", emoji: "paw-print" },
  "musti": { kategori: "Kæledyr", cleanName: "Musti", emoji: "paw-print" },
  "zooplus": { kategori: "Kæledyr", cleanName: "Zooplus", emoji: "paw-print" },
};

// ─── Lookup function ────────────────────────────────

export function matchMerchant(text: string): MerchantMatch | null {
  const lower = text.toLowerCase();
  // Try longest keys first for better matching (e.g. "superbrugsen" before "brugsen")
  const sorted = Object.entries(MERCHANTS).sort((a, b) => b[0].length - a[0].length);
  for (const [key, val] of sorted) {
    if (lower.includes(key)) return val;
  }
  return null;
}

export function getCategoryEmoji(kategori: string): string {
  return CATEGORY_EMOJIS[kategori] || "package";
}
