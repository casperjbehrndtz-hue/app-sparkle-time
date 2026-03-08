import { motion } from "framer-motion";
import { ArrowRight, Shield, Clock, Sparkles, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import heroCouple from "@/assets/hero-couple.jpg";
import featureAdvisor from "@/assets/feature-advisor.jpg";
import featureFamily from "@/assets/feature-family.jpg";

interface Props {
  onStart: () => void;
}

export function WelcomePage({ onStart }: Props) {
  const config = useWhiteLabel();
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="bg-hero-navy px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
          <span className="font-display font-black text-lg sm:text-xl text-white">{config.brandName}</span>
          <div className="flex items-center gap-3 sm:gap-6">
            <button onClick={() => document.getElementById('produkter')?.scrollIntoView({ behavior: 'smooth' })} className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors cursor-pointer bg-transparent border-none">{t("nav.products")}</button>
            <button onClick={() => document.getElementById('saadan-virker-det')?.scrollIntoView({ behavior: 'smooth' })} className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors cursor-pointer bg-transparent border-none">{t("nav.howItWorks")}</button>
            <LanguageToggle />
            <button onClick={onStart}
              className="px-4 sm:px-5 py-2 rounded-lg bg-white text-hero-navy text-sm font-semibold hover:bg-white/90 transition-colors">
              {t("hero.cta")}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-hero-navy">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <h1 className="font-display font-black text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.1] tracking-tight text-white mb-4 sm:mb-5">
              {t("hero.title")}<br />
              <span className="text-white">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-white/60 text-sm sm:text-base md:text-lg leading-relaxed mb-6 sm:mb-8 max-w-md">{t("hero.subtitle")}</p>
            <button onClick={onStart}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-hero-navy text-sm font-bold hover:bg-white/90 transition-all shadow-lg shadow-black/20">
              {t("hero.cta")} <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="hidden md:block">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
              <img src={heroCouple} alt={t("hero.imageAlt")} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust badges */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="border-b border-border bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-10">
          {[
            { icon: <Shield className="w-4 h-4 text-muted-foreground" />, text: t("trust.danish") },
            { icon: <Clock className="w-4 h-4 text-muted-foreground" />, text: t("trust.time") },
            { icon: <Sparkles className="w-4 h-4 text-muted-foreground" />, text: t("trust.private") },
          ].map((b) => (
            <div key={b.text} className="flex items-center gap-2 text-sm text-muted-foreground">{b.icon}<span>{b.text}</span></div>
          ))}
        </div>
      </motion.div>

      {/* How it works */}
      <section id="saadan-virker-det" className="bg-background py-10 sm:py-16 scroll-mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-foreground mb-3">{t("howItWorks.title")}</h2>
          <p className="text-muted-foreground text-base mb-12 max-w-md mx-auto">{t("howItWorks.subtitle")}</p>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
            {config.hero.stats.map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
                <div className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="produkter" className="bg-muted/30 py-10 sm:py-16 scroll-mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-4 sm:gap-5">
            <div className="rounded-2xl overflow-hidden md:row-span-2 shadow-lg h-48 sm:h-auto">
              <img src={featureAdvisor} alt={t("feature.bankReport")} className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
              <span className="text-2xl">🔍</span>
              <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">{t("feature.findHidden")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("feature.findHiddenDesc")}</p>
            </div>
            <div className="rounded-2xl overflow-hidden md:row-span-2 shadow-lg h-48 sm:h-auto">
              <img src={featureFamily} alt={t("feature.compare")} className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
              <span className="text-2xl">🤖</span>
              <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">{t("feature.aiInsight")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("feature.aiInsightDesc")}</p>
            </div>
            <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
              <span className="text-2xl">📊</span>
              <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">{t("feature.compare")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("feature.compareDesc")}</p>
            </div>
            <div className="rounded-2xl bg-background border border-border/60 p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
              <span className="text-2xl">🏦</span>
              <h3 className="font-semibold text-[15px] mt-3 mb-1.5 text-foreground">{t("feature.bankReport")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("feature.bankReportDesc")}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      {config.testimonials && config.testimonials.length > 0 && (
        <section className="bg-background py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8 text-center font-semibold">{t("testimonials.title")}</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
              {config.testimonials.map((testimonial) => (
                <motion.div key={testimonial.name} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="rounded-2xl border border-border/60 p-6 bg-background shadow-sm">
                  <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(s => <span key={s} className="text-kassen-gold text-sm">★</span>)}</div>
                  <p className="text-sm text-foreground leading-relaxed mb-4">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{testimonial.name.charAt(0)}</div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-[11px] text-muted-foreground">{testimonial.location}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="bg-hero-navy py-20">
        <div className="max-w-lg mx-auto px-6 text-center">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">{t("bottomCta.title")}</h2>
          <p className="text-white/60 text-sm mb-8">{t("bottomCta.subtitle")}</p>
          <button onClick={onStart}
            className="px-10 py-4 rounded-xl bg-white text-hero-navy font-bold text-base hover:bg-white/90 transition-all shadow-xl shadow-black/20">
            {t("hero.cta")} <ArrowRight className="w-4 h-4 inline ml-1.5" />
          </button>
          <p className="text-white/40 text-[11px] mt-5">{t("bottomCta.noLogin")}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground/[0.03] border-t border-border py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
            <div>
              <span className="font-display font-black text-base text-foreground">{config.brandName}</span>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t("footer.tagline")}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">{t("footer.product")}</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>{t("footer.budgetCalc")}</li>
                <li>{t("feature.aiInsight")}</li>
                <li>{t("footer.neighborComp")}</li>
                <li>{t("feature.bankReport")}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">{t("footer.info")}</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>{t("footer.privacy")}</li>
                <li>{t("footer.terms")}</li>
                <li>{t("footer.contact")}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
            {config.footer?.disclaimerText && <p className="text-[10px] text-muted-foreground">{config.footer.disclaimerText}</p>}
            <p className="text-[10px] text-muted-foreground">{config.footer?.text || `© 2026 ${config.brandName}`}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
