import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Vilkaar() {
  const config = useWhiteLabel();
  const brand = config.brandName ?? "NemtBudget";
  const { t } = useI18n();
  usePageMeta(
    "Vilkår og betingelser — NemtBudget",
    "Læs vilkår og betingelser for brug af NemtBudget. Gratis budgetværktøj uden login, data gemmes lokalt."
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> {t("nav.back")}
        </Link>

        <h1 className="font-display font-black text-3xl text-foreground mb-2">{t("footer.terms")}</h1>
        <p className="text-sm text-muted-foreground mb-10">{t("page.lastUpdated")}: {t("page.updatedDate")}</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="font-display font-bold text-lg mb-3">1. Tjenestens art og begrænsninger</h2>
            <p className="text-muted-foreground leading-relaxed">
              {brand} er et digitalt budgetværktøj til personlig privatøkonomi. Tjenesten yder <strong>ikke finansiel, juridisk eller skattemæssig rådgivning</strong> og er ikke autoriseret af Finanstilsynet eller anden finansiel tilsynsmyndighed.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Alle beregninger, estimater, anbefalinger og AI-genererede indsigter er <strong>udelukkende vejledende</strong> og baseret på gennemsnitlige danske tal. De tager ikke højde for din individuelle situation, særlige skatteforhold, aftalemæssige bindinger eller fremtidige ændringer i lovgivning.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Inden du træffer konkrete økonomiske beslutninger — herunder om boligkøb, låneomlægning, opsigelse af forsikringer eller investeringer — bør du kontakte din bank, en uafhængig finansiel rådgiver eller en statsautoriseret revisor.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg mb-3">2. Ansvarsfraskrivelse</h2>
            <p className="text-muted-foreground leading-relaxed">
              {brand} og dets ejere, medarbejdere og samarbejdspartnere påtager sig <strong>intet ansvar</strong> for tab, skader eller konsekvenser — direkte eller indirekte — der opstår som følge af brug af tjenesten eller tillid til dens indhold.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Tjenesten leveres "som den er" (<em>as-is</em>) uden garantier for nøjagtighed, fuldstændighed eller egnethed til bestemte formål. Prisdata, lovgivningstekster og statistiske grundlag opdateres med jævne mellemrum, men kan på et givent tidspunkt være forældet.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg mb-3">3. Brug af tjenesten</h2>
            <p className="text-muted-foreground leading-relaxed">Ved at bruge {brand} accepterer du at:</p>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground mt-2">
              <li>Tjenesten udelukkende bruges til lovlige, personlige formål</li>
              <li>Du ikke forsøger at omgå, misbruge eller overbelaste systemet</li>
              <li>Du ikke reproducerer, videresælger eller udnytter tjenestens indhold kommercielt uden forudgående skriftlig tilladelse</li>
              <li>Du er mindst 18 år gammel (eller har forældrenes samtykke)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg mb-3">4. AI-funktioner</h2>
            <p className="text-muted-foreground leading-relaxed">
              {brand} anvender kunstig intelligens (Anthropic Claude) til at generere budgetanalyser, besparelsesforslag og svar i chatten. AI-output er automatisk genereret og kan indeholde unøjagtigheder. AI-systemet har ikke adgang til dine faktiske bankkonti, skatteoplysninger eller tredjepartsdata.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              AI-genererede forslag udgør ikke finansiel rådgivning og skal altid vurderes kritisk af brugeren.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg mb-3">5. Datahåndtering og privatliv</h2>
            <p className="text-muted-foreground leading-relaxed">
              Din budgetdata gemmes som udgangspunkt lokalt i din browser. Hvis du opretter en konto, synkroniseres data til vores sikre servere (Supabase, EU-region). Vi sælger aldrig persondata til tredjeparter.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Se vores fulde <Link to="/privatliv" className="text-primary underline underline-offset-2">privatlivspolitik</Link> for detaljerede oplysninger om databehandling, dine rettigheder og kontaktoplysninger.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg mb-3">6. Ændringer af vilkår</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vi forbeholder os retten til at ændre disse vilkår med 30 dages varsel. Fortsætter du brugen af tjenesten efter ikrafttrædelsesdatoen, accepterer du de opdaterede vilkår. Aktuelle vilkår er altid tilgængelige på denne side.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg mb-3">7. Kontakt</h2>
            <p className="text-muted-foreground leading-relaxed">
              Har du spørgsmål til disse vilkår, kontakt os på:{" "}
              <a href="mailto:hej@nemtbudget.nu" className="text-primary underline underline-offset-2">hej@nemtbudget.nu</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
