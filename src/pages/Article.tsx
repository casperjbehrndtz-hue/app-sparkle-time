import { useParams, Link, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { AppFooter } from "@/components/AppFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";

// ─── Static fallback articles ─────────────────────────────────────────────────
const STATIC_ARTICLES: Record<string, { title: string; category: string; readTime: string; content: string }> = {
  "hvad-koster-det-at-bo-i-koebenhavn": {
    title: "Hvad koster det at bo i København i 2026?",
    category: "Boligøkonomi",
    readTime: "5 min",
    content: `
## Gennemsnitlige udgifter i København

At bo i København er dyrt — men hvor dyrt? Vi har samlet de nyeste tal fra Danmarks Statistik og Boliga.dk for at give dig et realistisk billede.

### Husleje

En gennemsnitlig 2-værelses lejlighed i København koster **12.000–16.000 kr./md.** i husleje. Andelsboliger er typisk billigere, men kræver en større kontant indskud.

- **Indre by / Frederiksberg:** 15.000–20.000 kr./md.
- **Østerbro / Nørrebro:** 12.000–16.000 kr./md.
- **Amager / Valby:** 9.000–13.000 kr./md.

### Transport

En månedlig rejsekort koster **430 kr.** for zoner 1-2. Har du cykel, kan du spare det meste af dette.

### Dagligvarer

En enkelt person bruger typisk **3.000–4.500 kr./md.** på mad i København. Et par bruger **5.000–7.000 kr./md.**

### Samlet overblik for en person

| Post | Beløb/md. |
|------|-----------|
| Husleje (2-vær, Nørrebro) | 13.500 kr. |
| Dagligvarer | 3.500 kr. |
| Transport | 430 kr. |
| Telefon & internet | 400 kr. |
| Forsikringer | 600 kr. |
| **Total** | **~18.430 kr.** |

Vil du se hvad du konkret har til overs? Brug Kassens beregner — den tager højde for dit specifikke postnummer.
    `,
  },
  "spar-penge-paa-abonnementer": {
    title: "Sådan sparer du 3.000 kr./år på abonnementer",
    category: "Besparelser",
    readTime: "4 min",
    content: `
## Danskernes abonnementsfælde

Den gennemsnitlige dansker betaler for **4-6 streaming- og abonnementstjenester** — men bruger kun halvdelen aktivt. Det er let at spare 250 kr./md. uden at miste noget du faktisk ser.

### Trin 1: Kortlæg dine abonnementer

Gennemgå dine kontoudtog og list alle tilbagevendende betalinger. De fleste finder 2-3 de har glemt.

Typiske abonnementer danskere betaler for:
- Netflix (149 kr./md.)
- Disney+ (99 kr./md.)
- Spotify (109 kr./md.)
- HBO Max (99 kr./md.)
- Amazon Prime (89 kr./md.)
- Diverse apps og tjenester

### Trin 2: Prioriter og skær til

Behold de 2-3 du bruger mest. Opsig resten — du kan altid oprette dem igen.

**Tip:** Skift med din partner. Én betaler Netflix en måned, den anden HBO. Halvér udgiften.

### Trin 3: Bundling og studentepriser

Mange tjenester tilbyder studenterabonnement til halv pris. Tjek også om din bank eller forsikring giver rabat på bestemte tjenester.

### Potentiel besparelse

Skærer du 3 abonnementer fra til 250 kr./md. samlet = **3.000 kr./år**.

Det svarer til en weekend i Berlin eller en ekstra måneds opsparing.
    `,
  },
  "budget-for-par": {
    title: "Budgetguide for par: Fælles eller adskilte konti?",
    category: "Parøkonomi",
    readTime: "6 min",
    content: `
## Penge og kærlighed

73% af danske par er uenige om økonomi på et tidspunkt. Det er ikke et tegn på problemer — det er normalt. Spørgsmålet er bare: hvad virker?

### Model 1: Fælles konto til alt

Begge parter sætter alle penge ind på én fælles konto. Alt betales derfra.

**Fordele:** Enkelt, fuld gennemsigtighed, følelse af fællesskab.
**Ulemper:** Kan skabe konflikter hvis I har forskellig forbrugsadfærd.

**Passer til:** Par med nogenlunde samme indkomst og udgiftsvaner.

### Model 2: Fælles konto til faste udgifter

I har hver jeres personlige konto + en fælles til husleje, mad og faste udgifter.

**Fordele:** Personlig frihed, men fælles ansvar for hushold.
**Ulemper:** Kræver aftale om hvem betaler hvad.

**Passer til:** De fleste par — dette er den mest populære model i Danmark.

### Model 3: Adskilte konti + overførsler

Alle udgifter deles og der overføres til hinanden løbende.

**Fordele:** Maksimal personlig frihed.
**Ulemper:** Administrativt besværligt, kan skabe afstand.

**Passer til:** Par med meget forskellig indkomst eller livsstil.

### Hvad anbefaler vi?

Model 2 fungerer for de fleste. Sæt et fast beløb ind på fælles konto til hushold — og behold resten som personlige penge uden at skulle spørge om lov.

Brug Kassens par-beregner til at se jeres samlede rådighedsbeløb.
    `,
  },
  "foerste-budget-guide": {
    title: "Dit første budget: En komplet begynderguide",
    category: "Kom i gang",
    readTime: "7 min",
    content: `
## Du behøver ikke et regneark

Mange tror et budget kræver timer med Excel. Det gør det ikke. Et simpelt budget kan laves på 15 minutter — og det kan ændre din økonomi fundamentalt.

### Hvad er et budget egentlig?

Et budget er bare svaret på: **"Hvad har jeg til overs hver måned?"**

Indkomst minus udgifter = rådighedsbeløb. Det er det hele.

### Trin 1: Find din indkomst

Start med din løn efter skat (det der lander på kontoen). Har du andre indkomster — tillæg, SU, freelance — så læg dem til.

### Trin 2: Kortlæg dine faste udgifter

Faste udgifter er dem der er ens hver måned:
- Husleje / boligydelse
- Forsikringer
- Transport (månedkort, billån)
- Telefon & internet
- Streaming og abonnementer

### Trin 3: Estimer de variable udgifter

Variable udgifter skifter fra måned til måned:
- Mad og dagligvarer
- Restauranter og kaffe
- Tøj og fritid
- Diverse

Kig i din netbank på de seneste 3 måneder og tag et gennemsnit.

### Trin 4: Beregn rådighedsbeløbet

Indkomst − (faste udgifter + variable udgifter) = rådighedsbeløb

Er det positivt? Godt. Er det negativt eller tæt på nul? Så er der noget at arbejde med.

### Trin 5: Sæt et mål

Beslut hvad du vil med pengene du har til overs:
- **Nødbuffer:** Mål: 3 måneders udgifter i reserve
- **Opsparing:** 10-20% af indkomsten
- **Gældsnedbringelse:** Betal ekstra af på dyreste lån først

### Brug Kassen

Det nemmeste er at lade Kassen beregne det hele for dig. Svar på 6 spørgsmål og få dit rådighedsbeløb på 3 minutter.
    `,
  },
};

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} className="font-display font-bold text-xl mt-8 mb-3">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="font-semibold text-base mt-6 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold my-1">{line.slice(2, -2)}</p>;
    if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm text-muted-foreground list-disc">{line.slice(2)}</li>;
    if (line.startsWith("| ") && line.includes("|")) {
      const cells = line.split("|").filter(Boolean).map(c => c.trim());
      return <tr key={i}>{cells.map((c, j) => <td key={j} className="border border-border px-3 py-1.5 text-sm">{c.replace(/\*\*/g, "")}</td>)}</tr>;
    }
    if (line.trim() === "") return <br key={i} />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    if (parts.length > 1) return <p key={i} className="text-sm text-foreground/80 leading-relaxed my-1">{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
    return <p key={i} className="text-sm text-foreground/80 leading-relaxed my-1">{line}</p>;
  });
}

export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  const config = useWhiteLabel();
  const [article, setArticle] = useState<{ title: string; category: string; readTime: string; content: string } | null | "loading">("loading");

  useEffect(() => {
    if (!slug) { setArticle(null); return; }

    // Supabase is primary — static articles are fallback only
    supabase
      .from("articles")
      .select("title, category, read_time, content")
      .eq("slug", slug)
      .eq("status", "published")
      .single()
      .then(({ data }) => {
        if (data) {
          setArticle({ title: data.title, category: data.category, readTime: data.read_time, content: data.content });
        } else {
          // Not in DB — try static fallback
          setArticle(STATIC_ARTICLES[slug] ?? null);
        }
      })
      .catch(() => {
        // DB unreachable — try static fallback
        setArticle(STATIC_ARTICLES[slug] ?? null);
      });
  }, [slug]);

  const title = article && article !== "loading" ? article.title : "";
  const content = article && article !== "loading" ? article.content : "";
  const description = content ? content.slice(0, 155).replace(/[#\n*|]/g, "").trim() : "Læs guides om dansk privatøkonomi.";
  const canonicalUrl = `https://kassen.dk/guides/${slug}`;

  usePageMeta(
    title ? `${title} — Kassen` : "Guide — Kassen",
    description
  );

  // Canonical link + JSON-LD Article schema
  useEffect(() => {
    if (!title) return;

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // JSON-LD
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "article-jsonld";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "description": description,
      "url": canonicalUrl,
      "inLanguage": "da",
      "publisher": {
        "@type": "Organization",
        "name": "Kassen",
        "url": "https://kassen.dk",
      },
    });
    document.getElementById("article-jsonld")?.remove();
    document.head.appendChild(script);

    return () => {
      if (createdCanonical) canonical?.remove();
      document.getElementById("article-jsonld")?.remove();
    };
  }, [title, description, canonicalUrl]);

  if (article === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!article) return <Navigate to="/guides" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/guides" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Guides
          </Link>
          <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">{article.category}</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <p className="text-xs text-muted-foreground mb-3">{article.readTime} læsetid</p>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground mb-8 leading-tight">{article.title}</h1>
        <div className="prose-content space-y-1">
          {renderContent(article.content)}
        </div>

        <div className="mt-12 rounded-2xl bg-primary p-6 text-center">
          <h3 className="font-display font-bold text-lg text-primary-foreground mb-2">Beregn dit eget rådighedsbeløb</h3>
          <p className="text-primary-foreground/70 text-sm mb-4">Gratis · 3 minutter · Ingen login</p>
          <Link to="/" className="inline-block px-6 py-3 rounded-xl bg-background text-foreground font-semibold text-sm hover:bg-background/90 transition-colors">
            Prøv {config.brandName} →
          </Link>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
