import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { usePageMeta } from "@/hooks/usePageMeta";

const Privatliv = () => {
  const config = useWhiteLabel();
  usePageMeta(
    "Privatlivspolitik — Kassen",
    "Læs om hvordan Kassen håndterer dine data. Alt gemmes lokalt — ingen data deles med tredjeparter."
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
            {config.brandName} er et budgetværktøj udviklet til at hjælpe danske husstande med at få overblik over deres økonomi. 
            Værktøjet yder ikke finansiel rådgivning.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Hvilke data indsamler vi?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Lokale data:</strong> Dine budgetoplysninger (indkomst, udgifter, husstandstype) gemmes udelukkende i din browsers lokale lager (localStorage). 
            Disse data forlader aldrig din enhed, medmindre du aktivt vælger at dele dem.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Anonyme prisdata:</strong> Når du udfylder dit budget, bidrager du anonymt med prisdata (f.eks. huslejeniveau i dit postnummer) 
            til at forbedre estimater for andre brugere. Disse data kan ikke spores tilbage til dig.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Cookies</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vi bruger kun funktionelle cookies til at huske dine præferencer (f.eks. cookie-samtykke). 
            Vi bruger ikke tredjepartscookies, tracking eller markedsføringscookies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Tredjeparter</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vi deler ikke dine personlige data med tredjeparter. Anonyme, aggregerede prisdata kan bruges til at forbedre 
            værktøjets estimater.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Dine rettigheder</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Da dine budgetdata kun gemmes lokalt på din enhed, kan du til enhver tid slette dem ved at rydde din browsers data 
            eller trykke "Ny beregning" i dashboardet. Du har ret til indsigt, berigtigelse og sletning af dine data i henhold til GDPR.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Ændringer</h2>
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
