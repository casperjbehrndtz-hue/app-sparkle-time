import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";

export function AppFooter() {
  const config = useWhiteLabel();
  const { t } = useI18n();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-4xl mx-auto px-5 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-2">
            <span className="font-display font-black text-lg text-primary">{config.brandName}</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {config.brandTagline || t("footer.tagline")}
            </p>
          </div>

          {/* Værktøjer */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">{t("footer.tools")}</h4>
            <ul className="space-y-1.5">
              <li><Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("footer.budgetCalc")}</Link></li>
              <li><Link to="/lonseddel" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Lønseddel-analyse</Link></li>
              <li><Link to="/pengetjek" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pengetjek</Link></li>
              <li><Link to="/guides" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("footer.guides")}</Link></li>
              <li><a href="https://parfinans.dk" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("nav.coupleFinance")}</a></li>
              <li><a href="https://boerneskat.dk" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("nav.childTax")}</a></li>
              <li><a href="https://institutionsguide.dk" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Institutionsguide</a></li>
            </ul>
          </div>

          {/* Juridisk */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">{t("footer.legal")}</h4>
            <ul className="space-y-1.5">
              <li><Link to="/privatliv" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("footer.privacy")}</Link></li>
              <li><Link to="/vilkaar" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("footer.terms")}</Link></li>
              <li><Link to="/install" className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"><Download className="w-3 h-3" />{t("footer.installApp")}</Link></li>
            </ul>
          </div>

          {/* Om */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">{t("footer.about")} {config.brandName}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("footer.private")}
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-6 space-y-2 text-center">
          <p className="text-xs text-muted-foreground/60">
            {config.footer?.text || `© ${new Date().getFullYear()} ${config.brandName}`} · {t("footer.based")}
          </p>
          <p className="text-xs text-muted-foreground/50 max-w-md mx-auto">
            {config.footer?.disclaimerText || t("footer.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
