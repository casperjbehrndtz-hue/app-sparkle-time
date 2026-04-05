import { motion } from "framer-motion";
import { ArrowRight, Shield, Clock, Lock, Download, Search, Brain, Zap, BarChart3, FileText, PiggyBank, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { usePageMeta } from "@/hooks/usePageMeta";
import { HeroSankey } from "./HeroSankey";
import { openCookieBanner } from "@/components/CookieBanner";
import Logo from "@/components/shared/Logo";

interface Props {
  onStart: () => void;
  hasExistingProfile?: boolean;
  onGoToApp?: () => void;
}

export function WelcomePage({ onStart, hasExistingProfile, onGoToApp }: Props) {
  const config = useWhiteLabel();
  const { t, lang } = useI18n();
  // Set html lang attribute so search engines index the correct language
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang === "nb" ? "nb" : lang === "en" ? "en" : "da";
  }
  const pageTitle = lang === "nb"
    ? "NemtBudget — Ta kontroll over privatøkonomien din"
    : lang === "en"
    ? "NemtBudget — Take control of your personal finances"
    : "NemtBudget — Tag kontrol over din privatøkonomi";
  const pageDescription = lang === "nb"
    ? "Finn skjulte utgifter, se hva du reelt har til overs og stå sterkt for fremtiden. Gratis, privat og på 3 minutter — ingen pålogging."
    : lang === "en"
    ? "Find hidden expenses, see what you really have left and be prepared for the future. Free, private and in 3 minutes — no login."
    : "Find skjulte udgifter, se hvad du reelt har til overs og stå stærkt til fremtiden. Gratis, privat og på 3 minutter — ingen login.";
  usePageMeta({
    title: pageTitle,
    description: pageDescription,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "NemtBudget",
      "url": "https://nemtbudget.nu",
      "description": pageDescription,
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "DKK",
      },
      "inLanguage": lang === "nb" ? "nb" : lang === "en" ? "en" : "da",
      "creator": {
        "@type": "Organization",
        "name": "NemtBudget",
        "url": "https://nemtbudget.nu",
      },
    },
  });

  return (
    <div id="main-content" className="min-h-screen flex flex-col bg-background">
      <a href="#hero-cta" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-semibold">
        {t("dash.skipToContent")}
      </a>
      {/* Nav */}
      <nav className="bg-hero-navy px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <Logo size="sm" variant="white" />
          <div className="flex items-center gap-3 sm:gap-6">
            <button onClick={() => document.getElementById('produkter')?.scrollIntoView({ behavior: 'smooth' })} className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors cursor-pointer bg-transparent border-none">{t("nav.products")}</button>
            <button onClick={() => document.getElementById('saadan-virker-det')?.scrollIntoView({ behavior: 'smooth' })} className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors cursor-pointer bg-transparent border-none">{t("nav.howItWorks")}</button>
            {lang !== "nb" && <LanguageToggle />}
            <button onClick={onStart}
              className="px-4 sm:px-5 py-2 rounded-lg bg-white text-hero-navy text-sm font-semibold hover:bg-white/90 transition-colors">
              {t("hero.cta")}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-hero-navy overflow-hidden relative">
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster="/hero-couple.webp"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
          src="/hero-video.mp4"
        />
        <div className="absolute inset-0 bg-hero-navy/70" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32 grid lg:grid-cols-[3fr_2fr] gap-8 lg:gap-12 items-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="min-w-0 relative z-10">
            <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl leading-[1.1] tracking-tight text-white mb-4 sm:mb-5 text-balance">
              {t("hero.title")}{" "}
              <span className="text-white">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">{t("hero.subtitle")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button id="hero-cta" onClick={onStart}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-hero-navy text-sm font-bold hover:bg-white/90 transition-all shadow-lg shadow-black/20">
                {t("hero.cta")} <ArrowRight className="w-4 h-4" />
              </button>
              {hasExistingProfile && onGoToApp && (
                <button onClick={onGoToApp}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full border border-white/30 text-white/80 text-sm font-medium hover:bg-white/10 transition-all">
                  {t("action.goToDashboard")} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <a href="/lonseddel"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 hover:text-white/90 transition-all border border-white/10">
                <Upload className="w-3 h-3" />
                {t("payslip.welcomeCta")}
              </a>
              <a href="/lonudvikling"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 hover:text-white/90 transition-all border border-white/10">
                <BarChart3 className="w-3 h-3" />
                {t("timeline.title")}
              </a>
            </div>
            <p className="text-white/40 text-xs mt-3">
              {t("hero.socialProof")}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="hidden lg:block">
            <HeroSankey />
          </motion.div>
        </div>
      </section>

      {/* Trust badges */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-10">
          {[
            { icon: <Shield className="w-4 h-4 text-muted-foreground" />, text: t("trust.danish") },
            { icon: <Clock className="w-4 h-4 text-muted-foreground" />, text: t("trust.time") },
            { icon: <Lock className="w-4 h-4 text-muted-foreground" />, text: t("trust.private") },
          ].map((b) => (
            <div key={b.text} className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">{b.icon}<span>{b.text}</span></div>
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
                <div className="font-display font-bold text-4xl sm:text-5xl text-foreground">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1.5">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="produkter" className="bg-muted/30 py-16 sm:py-24 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
            {[
              { icon: <Search className="w-5 h-5 text-primary" />, bg: "bg-primary/10", title: t("feature.findHidden"), desc: t("feature.findHiddenDesc") },
              { icon: <Brain className="w-5 h-5 text-primary" />, bg: "bg-primary/10", title: t("feature.aiInsight"), desc: t("feature.aiInsightDesc") },
              { icon: <Zap className="w-5 h-5 text-primary" />, bg: "bg-primary/10", title: t("feature.stressTest"), desc: t("feature.stressTestDesc") },
              { icon: <BarChart3 className="w-5 h-5 text-primary" />, bg: "bg-primary/10", title: t("feature.compare"), desc: t("feature.compareDesc") },
              { icon: <FileText className="w-5 h-5 text-primary" />, bg: "bg-primary/10", title: t("feature.bankReport"), desc: t("feature.bankReportDesc") },
              { icon: <PiggyBank className="w-5 h-5 text-primary" />, bg: "bg-primary/10", title: t("feature.savings"), desc: t("feature.savingsDesc") },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="rounded-xl bg-background border border-border/60 p-6 sm:p-8 hover:border-border transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.bg}`}>{f.icon}</div>
                <h3 className="font-semibold text-base mt-3 mb-1.5 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {config.testimonials && config.testimonials.length > 0 && (
        <section className="bg-background py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8 text-center font-semibold">{t("testimonials.title")}</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
              {config.testimonials.map((testimonial) => (
                <motion.div key={testimonial.name} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="rounded-xl border-l-2 border-l-primary/30 border border-border/40 pl-5 pr-5 py-5 bg-background">
                  <p className="text-sm text-foreground leading-relaxed mb-3 italic">"{testimonial.quote}"</p>
                  <p className="text-xs text-muted-foreground">— {testimonial.name}, {testimonial.location}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="bg-hero-navy py-20 sm:py-28">
        <div className="max-w-lg mx-auto px-6 text-center">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">{t("bottomCta.title")}</h2>
          <p className="text-white/60 text-sm mb-8">{t("bottomCta.subtitle")}</p>
          <button onClick={onStart}
            className="px-10 py-4 rounded-full bg-white text-hero-navy font-bold text-base hover:bg-white/90 transition-all shadow-xl shadow-black/20">
            {t("hero.cta")} <ArrowRight className="w-4 h-4 inline ml-1.5" />
          </button>
          <p className="text-white/40 text-xs mt-5">{t("bottomCta.noLogin")}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground/[0.03] border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
            <div>
              <span className="font-display font-black text-base text-foreground">{config.brandName}</span>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t("footer.tagline")}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">{t("footer.product")}</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><button onClick={onStart} className="hover:text-foreground transition-colors bg-transparent border-none cursor-pointer p-0 text-left text-xs text-muted-foreground">{t("footer.budgetCalc")}</button></li>
                <li>{t("feature.aiInsight")}</li>
                <li>{t("footer.neighborComp")}</li>
                <li>{t("feature.bankReport")}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">{t("footer.info")}</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/privatliv" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link></li>
                <li><Link to="/vilkaar" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link></li>
                <li>{t("footer.contact")}</li>
                <li><Link to="/install" className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium"><Download className="w-3 h-3" />{t("footer.installApp")}</Link></li>
                <li><Link to="/guides" className="hover:text-foreground transition-colors">{t("footer.guides")}</Link></li>
                <li><button onClick={openCookieBanner} className="hover:text-foreground transition-colors bg-transparent border-none cursor-pointer p-0 text-left text-xs text-muted-foreground">{t("cookie.settings")}</button></li>
              </ul>
              <h4 className="text-xs font-semibold text-foreground mb-3 mt-5 uppercase tracking-wider">{lang === "da" ? "Se også" : "See also"}</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="https://www.parfinans.dk" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">{lang === "da" ? "ParFinans — Parøkonomi" : "ParFinans — Couple Finance"}</a></li>
                <li><a href="https://børneskat.dk" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">{lang === "da" ? "Børneskat — Børneopsparing" : "Børneskat — Children's Savings"}</a></li>
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
