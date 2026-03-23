import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { usePageMeta } from "@/hooks/usePageMeta";

const Privatliv = () => {
  const config = useWhiteLabel();
  usePageMeta(
    "Privatlivspolitik — NemtBudget",
    "Læs om hvordan NemtBudget håndterer dine data, dine rettigheder og vores databehandlere."
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-display font-black text-lg text-primary">{config.brandName}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-10 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Privatlivspolitik</h1>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Dataansvarlig</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            NemtBudget.nu er et budgetværktøj udviklet til at hjælpe danske husstande med at få overblik over deres økonomi.
            Værktøjet drives af en soloiværksætter.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Kontakt:</strong> hej@nemtbudget.nu
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Formål og retsgrundlag</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vi behandler data til følgende formål:
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
            <li>
              <strong>Budgetberegning (localStorage):</strong> Dine budgetoplysninger gemmes udelukkende i din browsers lokale lager.
              Data forlader aldrig din enhed. Retsgrundlag: samtykke via brug af tjenesten (GDPR art. 6(1)(a)).
            </li>
            <li>
              <strong>Lønseddel- og kontoudtog-OCR:</strong> Når du uploader et billede af din lønseddel eller kontoudtog, sendes det krypteret til en AI-tjeneste for at aflæse tal.
              Retsgrundlag: samtykke — du uploader aktivt dokumentet (GDPR art. 6(1)(a)).
            </li>
            <li>
              <strong>Anonyme lønobservationer:</strong> Du kan vælge at bidrage med din anonymiserede løn til en fælles lønstatistik.
              Det sker kun, hvis du aktivt giver samtykke via et afkrydsningsfelt. Retsgrundlag: samtykke (GDPR art. 6(1)(a)).
            </li>
            <li>
              <strong>Anonyme prisdata:</strong> Når du udfylder dit budget, bidrages anonyme prisdata (f.eks. huslejeniveau pr. hashed postnummer) til at forbedre estimater for andre brugere.
              Disse data kan ikke spores tilbage til dig. Retsgrundlag: legitim interesse i at forbedre tjenesten (GDPR art. 6(1)(f)).
            </li>
            <li>
              <strong>Rate limiting:</strong> Vi bruger hashede IP-adresser til at forhindre misbrug. IP-adressen gemmes aldrig i klartekst.
              Retsgrundlag: legitim interesse i at beskytte tjenesten (GDPR art. 6(1)(f)).
            </li>
            <li>
              <strong>Vercel Analytics:</strong> Hvis du accepterer cookies i cookiebanneret, indsamles anonym brugsstatistik (sidevisninger, enhedstype).
              Retsgrundlag: samtykke via cookie-banner (GDPR art. 6(1)(a)).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Databehandlere</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vi bruger følgende tredjeparter til at levere tjenesten:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
            <li>
              <strong>Anthropic (USA)</strong> — AI-analyse af lønsedler og kontoudtog. Billeder sendes krypteret.
              Anthropic træner ikke på API-data og sletter input efter behandling.
            </li>
            <li>
              <strong>Supabase (EU)</strong> — Database til anonyme prisdata, lønobservationer og rate limiting.
            </li>
            <li>
              <strong>Vercel (global)</strong> — Hosting af websiden og analytics (kun efter samtykke).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. International overførsel</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Når du uploader en lønseddel eller et kontoudtog, sendes billedet krypteret til Anthropic i USA til AI-analyse.
            Anthropic træner ikke på data modtaget via deres API og sletter input efter behandling.
            Overførslen sker på baggrund af Anthropics standardkontraktbestemmelser (SCCs) i overensstemmelse med GDPR kapitel V.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Alle øvrige data (anonyme prisdata, lønobservationer, rate limiting) opbevares inden for EU via Supabase.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Opbevaringsperioder</h2>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
            <li>
              <strong>Lønseddel-/kontoudtog-billeder:</strong> Slettes straks efter AI-analyse. Hverken vi eller Anthropic opbevarer billederne.
            </li>
            <li>
              <strong>Budgetdata:</strong> Gemmes kun i din browsers localStorage. Du styrer selv sletning.
            </li>
            <li>
              <strong>Anonyme lønobservationer:</strong> Opbevares permanent i anonymiseret form. De kan ikke spores tilbage til dig.
            </li>
            <li>
              <strong>Rate limit-data:</strong> Hashede IP-adresser slettes automatisk efter 1 time.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Dine rettigheder</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Du har følgende rettigheder i henhold til GDPR:
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
            <li><strong>Indsigt:</strong> Du kan få oplyst, hvilke data vi behandler om dig.</li>
            <li><strong>Berigtigelse:</strong> Du kan få rettet forkerte oplysninger.</li>
            <li><strong>Sletning:</strong> Du kan bede om, at dine data slettes.</li>
            <li><strong>Begrænsning:</strong> Du kan bede om, at behandlingen begrænses.</li>
            <li><strong>Dataportabilitet:</strong> Du kan få udleveret dine data i et maskinlæsbart format.</li>
            <li><strong>Indsigelse:</strong> Du kan gøre indsigelse mod behandling baseret på legitim interesse.</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Da budgetdata kun gemmes lokalt i din browser, kan du til enhver tid slette dem ved at rydde browserdata eller trykke "Ny beregning".
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kontakt os på <strong>hej@nemtbudget.nu</strong> for at udøve dine rettigheder.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Du har også ret til at klage til <strong>Datatilsynet</strong> ({" "}
            <a href="https://datatilsynet.dk" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              datatilsynet.dk
            </a>
            ), hvis du mener, at vi behandler dine data i strid med reglerne.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Automatiseret behandling</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vi bruger AI (Anthropic Claude) til at aflæse tal fra lønsedler og kontoudtog. AI-modellen bruges udelukkende til at
            genkende og strukturere tal fra dit dokument — der træffes ingen automatiske beslutninger med retsvirkninger for dig.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. Cookies</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vi bruger kun analytics-cookies (Vercel Analytics), og kun hvis du accepterer via cookiebanneret.
            Afviser du cookies, indsamles ingen analysedata.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dine præferencer (f.eks. cookie-samtykke, tema) gemmes i localStorage, som ikke er cookies og ikke deles med nogen.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Du kan til enhver tid ændre dit cookie-valg ved at rydde din browsers data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">9. Ændringer</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vi forbeholder os retten til at opdatere denne privatlivspolitik. Væsentlige ændringer vil blive kommunikeret via værktøjet.
          </p>
        </section>

        <p className="text-xs text-muted-foreground/50 pt-4 border-t border-border">
          Sidst opdateret: marts 2026
        </p>
      </main>
    </div>
  );
};

export default Privatliv;
