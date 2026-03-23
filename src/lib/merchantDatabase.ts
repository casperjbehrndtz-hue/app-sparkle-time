// ─── Category emojis ────────────────────────────────

export const CATEGORY_EMOJIS: Record<string, string> = {
  "Bolig": "🏠",
  "Forsyning": "💡",
  "Transport": "🚗",
  "Mad": "🛒",
  "Restaurant": "🍽️",
  "Streaming": "📺",
  "Sundhed": "💊",
  "Forsikring": "🛡️",
  "Fagforening": "🤝",
  "Fitness": "💪",
  "Kæledyr": "🐾",
  "Lån": "🏦",
  "Tøj": "👕",
  "Fritid": "🎮",
  "Opsparing": "💰",
  "Løn": "💵",
  "Overførsel": "🔄",
  "Andet": "📦",
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
  "netto": { kategori: "Mad", cleanName: "Netto", emoji: "🛒" },
  "føtex": { kategori: "Mad", cleanName: "Føtex", emoji: "🛒" },
  "fotex": { kategori: "Mad", cleanName: "Føtex", emoji: "🛒" },
  "bilka": { kategori: "Mad", cleanName: "Bilka", emoji: "🛒" },
  "coop": { kategori: "Mad", cleanName: "COOP", emoji: "🛒" },
  "kvickly": { kategori: "Mad", cleanName: "Kvickly", emoji: "🛒" },
  "brugsen": { kategori: "Mad", cleanName: "Brugsen", emoji: "🛒" },
  "superbrugsen": { kategori: "Mad", cleanName: "SuperBrugsen", emoji: "🛒" },
  "dagli'brugsen": { kategori: "Mad", cleanName: "Dagli'Brugsen", emoji: "🛒" },
  "irma": { kategori: "Mad", cleanName: "Irma", emoji: "🛒" },
  "rema 1000": { kategori: "Mad", cleanName: "REMA 1000", emoji: "🛒" },
  "rema1000": { kategori: "Mad", cleanName: "REMA 1000", emoji: "🛒" },
  "lidl": { kategori: "Mad", cleanName: "Lidl", emoji: "🛒" },
  "aldi": { kategori: "Mad", cleanName: "Aldi", emoji: "🛒" },
  "fakta": { kategori: "Mad", cleanName: "Fakta", emoji: "🛒" },
  "meny": { kategori: "Mad", cleanName: "Meny", emoji: "🛒" },
  "spar": { kategori: "Mad", cleanName: "SPAR", emoji: "🛒" },
  "365discount": { kategori: "Mad", cleanName: "365discount", emoji: "🛒" },
  "døgnnetto": { kategori: "Mad", cleanName: "Døgnnetto", emoji: "🛒" },
  "fleggaard": { kategori: "Mad", cleanName: "Fleggaard", emoji: "🛒" },
  "nemlig": { kategori: "Mad", cleanName: "Nemlig.com", emoji: "🛒" },
  "osuma": { kategori: "Mad", cleanName: "Osuma", emoji: "🛒" },

  // ── Restaurant / Takeaway ──
  "mcdonalds": { kategori: "Restaurant", cleanName: "McDonald's", emoji: "🍽️" },
  "mcdonald": { kategori: "Restaurant", cleanName: "McDonald's", emoji: "🍽️" },
  "burger king": { kategori: "Restaurant", cleanName: "Burger King", emoji: "🍽️" },
  "subway": { kategori: "Restaurant", cleanName: "Subway", emoji: "🍽️" },
  "sunset boulevard": { kategori: "Restaurant", cleanName: "Sunset Boulevard", emoji: "🍽️" },
  "dominos": { kategori: "Restaurant", cleanName: "Domino's", emoji: "🍽️" },
  "just eat": { kategori: "Restaurant", cleanName: "Just Eat", emoji: "🍽️" },
  "just-eat": { kategori: "Restaurant", cleanName: "Just Eat", emoji: "🍽️" },
  "wolt": { kategori: "Restaurant", cleanName: "Wolt", emoji: "🍽️" },
  "hungry": { kategori: "Restaurant", cleanName: "Hungry.dk", emoji: "🍽️" },
  "starbucks": { kategori: "Restaurant", cleanName: "Starbucks", emoji: "🍽️" },
  "espresso house": { kategori: "Restaurant", cleanName: "Espresso House", emoji: "🍽️" },
  "joe and the juice": { kategori: "Restaurant", cleanName: "Joe & The Juice", emoji: "🍽️" },
  "7-eleven": { kategori: "Restaurant", cleanName: "7-Eleven", emoji: "🍽️" },
  "cafe": { kategori: "Restaurant", cleanName: "Café", emoji: "🍽️" },

  // ── Transport ──
  "shell": { kategori: "Transport", cleanName: "Shell", emoji: "🚗" },
  "q8": { kategori: "Transport", cleanName: "Q8", emoji: "🚗" },
  "circle k": { kategori: "Transport", cleanName: "Circle K", emoji: "🚗" },
  "ok benzin": { kategori: "Transport", cleanName: "OK Benzin", emoji: "🚗" },
  "go'on": { kategori: "Transport", cleanName: "Go'on", emoji: "🚗" },
  "f24": { kategori: "Transport", cleanName: "F24", emoji: "🚗" },
  "ingo": { kategori: "Transport", cleanName: "Ingo", emoji: "🚗" },
  "uno-x": { kategori: "Transport", cleanName: "UNO-X", emoji: "🚗" },
  "dsb": { kategori: "Transport", cleanName: "DSB", emoji: "🚗" },
  "rejsekort": { kategori: "Transport", cleanName: "Rejsekort", emoji: "🚗" },
  "fynbus": { kategori: "Transport", cleanName: "FynBus", emoji: "🚗" },
  "midttrafik": { kategori: "Transport", cleanName: "Midttrafik", emoji: "🚗" },
  "movia": { kategori: "Transport", cleanName: "Movia", emoji: "🚗" },
  "nordjyllands trafikselskab": { kategori: "Transport", cleanName: "NT", emoji: "🚗" },
  "clever": { kategori: "Transport", cleanName: "Clever", emoji: "🚗" },
  "e.on drive": { kategori: "Transport", cleanName: "E.ON Drive", emoji: "🚗" },
  "spirii": { kategori: "Transport", cleanName: "Spirii", emoji: "🚗" },
  "parkering": { kategori: "Transport", cleanName: "Parkering", emoji: "🚗" },
  "easypark": { kategori: "Transport", cleanName: "EasyPark", emoji: "🚗" },
  "apcoa": { kategori: "Transport", cleanName: "APCOA", emoji: "🚗" },
  "fde": { kategori: "Transport", cleanName: "FDM", emoji: "🚗" },

  // ── Streaming ──
  "netflix": { kategori: "Streaming", cleanName: "Netflix", emoji: "📺" },
  "spotify": { kategori: "Streaming", cleanName: "Spotify", emoji: "📺" },
  "hbo max": { kategori: "Streaming", cleanName: "HBO Max", emoji: "📺" },
  "hbo nordic": { kategori: "Streaming", cleanName: "HBO", emoji: "📺" },
  "viaplay": { kategori: "Streaming", cleanName: "Viaplay", emoji: "📺" },
  "disney+": { kategori: "Streaming", cleanName: "Disney+", emoji: "📺" },
  "disney plus": { kategori: "Streaming", cleanName: "Disney+", emoji: "📺" },
  "apple tv": { kategori: "Streaming", cleanName: "Apple TV+", emoji: "📺" },
  "amazon prime": { kategori: "Streaming", cleanName: "Amazon Prime", emoji: "📺" },
  "youtube premium": { kategori: "Streaming", cleanName: "YouTube Premium", emoji: "📺" },
  "tv2 play": { kategori: "Streaming", cleanName: "TV 2 Play", emoji: "📺" },
  "drtv": { kategori: "Streaming", cleanName: "DRTV", emoji: "📺" },
  "apple music": { kategori: "Streaming", cleanName: "Apple Music", emoji: "📺" },
  "tidal": { kategori: "Streaming", cleanName: "Tidal", emoji: "📺" },
  "audible": { kategori: "Streaming", cleanName: "Audible", emoji: "📺" },
  "mofibo": { kategori: "Streaming", cleanName: "Mofibo", emoji: "📺" },
  "storytel": { kategori: "Streaming", cleanName: "Storytel", emoji: "📺" },
  "bookbeat": { kategori: "Streaming", cleanName: "BookBeat", emoji: "📺" },

  // ── Fitness ──
  "fitness world": { kategori: "Fitness", cleanName: "Fitness World", emoji: "💪" },
  "fitnessworld": { kategori: "Fitness", cleanName: "Fitness World", emoji: "💪" },
  "sats": { kategori: "Fitness", cleanName: "SATS", emoji: "💪" },
  "crossfit": { kategori: "Fitness", cleanName: "CrossFit", emoji: "💪" },
  "fit&sund": { kategori: "Fitness", cleanName: "Fit&Sund", emoji: "💪" },
  "fitnessdk": { kategori: "Fitness", cleanName: "Fitness.dk", emoji: "💪" },
  "loop fitness": { kategori: "Fitness", cleanName: "Loop Fitness", emoji: "💪" },

  // ── Sundhed ──
  "apotek": { kategori: "Sundhed", cleanName: "Apotek", emoji: "💊" },
  "matas": { kategori: "Sundhed", cleanName: "Matas", emoji: "💊" },
  "tandlæge": { kategori: "Sundhed", cleanName: "Tandlæge", emoji: "💊" },
  "tandlaege": { kategori: "Sundhed", cleanName: "Tandlæge", emoji: "💊" },
  "læge": { kategori: "Sundhed", cleanName: "Læge", emoji: "💊" },
  "fysioterapi": { kategori: "Sundhed", cleanName: "Fysioterapi", emoji: "💊" },
  "kiropraktor": { kategori: "Sundhed", cleanName: "Kiropraktor", emoji: "💊" },
  "normal": { kategori: "Sundhed", cleanName: "Normal", emoji: "💊" },

  // ── Tøj / Shopping ──
  "h&m": { kategori: "Tøj", cleanName: "H&M", emoji: "👕" },
  "zara": { kategori: "Tøj", cleanName: "Zara", emoji: "👕" },
  "jack & jones": { kategori: "Tøj", cleanName: "Jack & Jones", emoji: "👕" },
  "bestseller": { kategori: "Tøj", cleanName: "Bestseller", emoji: "👕" },
  "only": { kategori: "Tøj", cleanName: "ONLY", emoji: "👕" },
  "vero moda": { kategori: "Tøj", cleanName: "Vero Moda", emoji: "👕" },
  "zalando": { kategori: "Tøj", cleanName: "Zalando", emoji: "👕" },
  "asos": { kategori: "Tøj", cleanName: "ASOS", emoji: "👕" },
  "boozt": { kategori: "Tøj", cleanName: "Boozt", emoji: "👕" },

  // ── Bolig ──
  "ikea": { kategori: "Bolig", cleanName: "IKEA", emoji: "🏠" },
  "jysk": { kategori: "Bolig", cleanName: "JYSK", emoji: "🏠" },
  "bauhaus": { kategori: "Bolig", cleanName: "Bauhaus", emoji: "🏠" },
  "silvan": { kategori: "Bolig", cleanName: "Silvan", emoji: "🏠" },
  "harald nyborg": { kategori: "Bolig", cleanName: "Harald Nyborg", emoji: "🏠" },
  "idemøbler": { kategori: "Bolig", cleanName: "IDEmøbler", emoji: "🏠" },

  // ── Forsyning ──
  "ørsted": { kategori: "Forsyning", cleanName: "Ørsted", emoji: "💡" },
  "norlys": { kategori: "Forsyning", cleanName: "Norlys", emoji: "💡" },
  "ewii": { kategori: "Forsyning", cleanName: "Ewii", emoji: "💡" },
  "andel energi": { kategori: "Forsyning", cleanName: "Andel Energi", emoji: "💡" },
  "radius": { kategori: "Forsyning", cleanName: "Radius", emoji: "💡" },
  "youSee": { kategori: "Forsyning", cleanName: "YouSee", emoji: "💡" },
  "yousee": { kategori: "Forsyning", cleanName: "YouSee", emoji: "💡" },
  "tdc": { kategori: "Forsyning", cleanName: "TDC", emoji: "💡" },
  "telenor": { kategori: "Forsyning", cleanName: "Telenor", emoji: "💡" },
  "telia": { kategori: "Forsyning", cleanName: "Telia", emoji: "💡" },
  "3 mobil": { kategori: "Forsyning", cleanName: "3", emoji: "💡" },
  "lebara": { kategori: "Forsyning", cleanName: "Lebara", emoji: "💡" },
  "oister": { kategori: "Forsyning", cleanName: "Oister", emoji: "💡" },
  "cbb mobil": { kategori: "Forsyning", cleanName: "CBB Mobil", emoji: "💡" },
  "dr licens": { kategori: "Forsyning", cleanName: "DR Licens", emoji: "💡" },
  "medielicens": { kategori: "Forsyning", cleanName: "Medielicens", emoji: "💡" },

  // ── Forsikring ──
  "tryg": { kategori: "Forsikring", cleanName: "Tryg", emoji: "🛡️" },
  "topdanmark": { kategori: "Forsikring", cleanName: "Topdanmark", emoji: "🛡️" },
  "alm brand": { kategori: "Forsikring", cleanName: "Alm. Brand", emoji: "🛡️" },
  "alm. brand": { kategori: "Forsikring", cleanName: "Alm. Brand", emoji: "🛡️" },
  "gjensidige": { kategori: "Forsikring", cleanName: "Gjensidige", emoji: "🛡️" },
  "codan": { kategori: "Forsikring", cleanName: "Codan", emoji: "🛡️" },
  "if forsikring": { kategori: "Forsikring", cleanName: "If Forsikring", emoji: "🛡️" },

  // ── Fritid / Underholdning ──
  "elgiganten": { kategori: "Fritid", cleanName: "Elgiganten", emoji: "🎮" },
  "power": { kategori: "Fritid", cleanName: "Power", emoji: "🎮" },
  "proshop": { kategori: "Fritid", cleanName: "Proshop", emoji: "🎮" },
  "komplett": { kategori: "Fritid", cleanName: "Komplett", emoji: "🎮" },
  "bog & ide": { kategori: "Fritid", cleanName: "Bog & Idé", emoji: "🎮" },
  "saxo": { kategori: "Fritid", cleanName: "Saxo.com", emoji: "🎮" },
  "tivoli": { kategori: "Fritid", cleanName: "Tivoli", emoji: "🎮" },
  "biografen": { kategori: "Fritid", cleanName: "Biografen", emoji: "🎮" },
  "nordisk film": { kategori: "Fritid", cleanName: "Nordisk Film Bio", emoji: "🎮" },
  "cinemaxx": { kategori: "Fritid", cleanName: "CinemaxX", emoji: "🎮" },

  // ── Kæledyr ──
  "dyrlæge": { kategori: "Kæledyr", cleanName: "Dyrlæge", emoji: "🐾" },
  "animail": { kategori: "Kæledyr", cleanName: "Animail", emoji: "🐾" },
  "musti": { kategori: "Kæledyr", cleanName: "Musti", emoji: "🐾" },
  "zooplus": { kategori: "Kæledyr", cleanName: "Zooplus", emoji: "🐾" },
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
  return CATEGORY_EMOJIS[kategori] || "📦";
}
