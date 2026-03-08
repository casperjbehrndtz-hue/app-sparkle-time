import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search, TrendingUp, Calculator, PiggyBank, Home } from "lucide-react";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { AppFooter } from "@/components/AppFooter";

const articles = [
  {
    slug: "hvad-koster-det-at-bo-i-koebenhavn",
    title: "Hvad koster det at bo i København i 2026?",
    excerpt: "Vi gennemgår alle faste udgifter for en gennemsnitlig husstand i København — fra husleje til transport og dagligvarer.",
    icon: <Home className="w-5 h-5" />,
    category: "Boligøkonomi",
    readTime: "5 min",
  },
  {
    slug: "spar-penge-paa-abonnementer",
    title: "Sådan sparer du 3.000 kr./år på abonnementer",
    excerpt: "De fleste danskere har 4-6 streaming-tjenester. Her er en guide til at skære ned uden at miste indhold.",
    icon: <PiggyBank className="w-5 h-5" />,
    category: "Besparelser",
    readTime: "4 min",
  },
  {
    slug: "budget-for-par",
    title: "Budgetguide for par: Fælles eller adskilte konti?",
    excerpt: "73% af danske par er uenige om penge. Her er de mest populære modeller og hvad der virker bedst.",
    icon: <TrendingUp className="w-5 h-5" />,
    category: "Parøkonomi",
    readTime: "6 min",
  },
  {
    slug: "foerste-budget-guide",
    title: "Dit første budget: En komplet begynderguide",
    excerpt: "Aldrig lavet et budget? Start her. Vi guider dig fra 0 til fuld kontrol over din økonomi på 15 minutter.",
    icon: <Calculator className="w-5 h-5" />,
    category: "Kom i gang",
    readTime: "7 min",
  },
];

export default function Blog() {
  const config = useWhiteLabel();
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {config.brandName}
          </Link>
          <h1 className="font-display font-bold text-base">Guides & tips</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-muted/30 py-10 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display font-black text-2xl sm:text-3xl text-foreground mb-3">
            Bliv klogere på din økonomi
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Praktiske guides, sparetips og beregninger bygget til dansk privatøkonomi.
          </p>
          <div className="relative max-w-sm mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Søg i guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="flex-1 py-8">
        <div className="max-w-3xl mx-auto px-4 grid sm:grid-cols-2 gap-4">
          {filtered.map((article, i) => (
            <motion.div
              key={article.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={`/guides/${article.slug}`}
                className="block rounded-2xl border border-border/60 p-5 bg-card hover:shadow-md hover:border-primary/20 transition-all h-full"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {article.icon}
                  </div>
                  <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">{article.category}</span>
                </div>
                <h3 className="font-semibold text-[15px] mb-2 text-foreground leading-snug">{article.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{article.excerpt}</p>
                <span className="text-xs text-muted-foreground/60">{article.readTime} læsetid</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-12">
        <div className="max-w-md mx-auto px-4 text-center">
          <h3 className="font-display font-bold text-xl text-primary-foreground mb-2">Prøv {config.brandName} gratis</h3>
          <p className="text-primary-foreground/60 text-sm mb-5">Beregn dit rådighedsbeløb på 3 minutter</p>
          <Link to="/" className="inline-block px-6 py-3 rounded-xl bg-background text-foreground font-semibold text-sm hover:bg-background/90 transition-colors">
            Kom i gang →
          </Link>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
