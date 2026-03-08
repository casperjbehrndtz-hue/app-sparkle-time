import { Link } from "react-router-dom";
import { useWhiteLabel } from "@/lib/whiteLabel";

export function AppFooter() {
  const config = useWhiteLabel();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-4xl mx-auto px-5 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-2">
            <span className="font-display font-black text-lg text-primary">{config.brandName}</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {config.brandTagline || "Smart budgetværktøj for danske husstande."}
            </p>
          </div>

          {/* Værktøjer */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Værktøjer</h4>
            <ul className="space-y-1.5">
              <li><Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Budgetberegner</Link></li>
              <li><a href="https://parfinans.dk" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Parøkonomi</a></li>
              <li><a href="https://boerneskat.dk" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Børneskat</a></li>
            </ul>
          </div>

          {/* Juridisk */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Juridisk</h4>
            <ul className="space-y-1.5">
              <li><Link to="/privatliv" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privatlivspolitik</Link></li>
            </ul>
          </div>

          {/* Om */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Om {config.brandName}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              100% privat · Data gemmes lokalt
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-6 space-y-2 text-center">
          <p className="text-[11px] text-muted-foreground/60">
            {config.footer?.text || `© ${new Date().getFullYear()} ${config.brandName}`} · Beregnet på danske gennemsnitstal 2026 · Data gemmes lokalt
          </p>
          <p className="text-[10px] text-muted-foreground/50 max-w-md mx-auto">
            {config.footer?.disclaimerText || "Kassen er et budgetværktøj og yder ikke finansiel rådgivning. Tal med din bank eller en rådgiver om konkrete økonomiske beslutninger."}
          </p>
        </div>
      </div>
    </footer>
  );
}
