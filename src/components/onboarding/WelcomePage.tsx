import { motion } from "framer-motion";
import { ArrowRight, Shield, Clock, Lock, Download, Search, Brain, Zap, BarChart3, FileText, PiggyBank, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useWhiteLabel } from "@/lib/whiteLabel";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { usePageMeta } from "@/hooks/usePageMeta";
import { HeroSankey } from "./HeroSankey";
import HeroStatBand from "./HeroStatBand";
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
      <a href="#hero-cta" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-none focus:text-sm focus:font-semibold">
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
              className="px-4 sm:px-5 py-2 rounded-none bg-white text-hero-navy text-sm font-semibold hover:bg-white/90 transition-colors">
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
          preload="auto"
          poster="/hero-couple.webp"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
          src="/hero-video.mp4"
        />
        {/* Lateral gradient: text side legible, sankey side shows more video */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, hsl(var(--hero-navy) / 0.85) 0%, hsl(var(--hero-navy) / 0.70) 50%, hsl(var(--hero-navy) / 0.45) 100%)" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-14 grid lg:grid-cols-[3fr_2fr] gap-6 lg:gap-5 items-center relative z-10">
          <div className="min-w-0 relative z-10">
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-semibold leading-[1.15] tracking-tight text-white mb-3 text-balance">
              {t("hero.title")}{" "}
              <span className="text-white">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-white/70 text-sm sm:text-base leading-snug mb-5 max-w-md">{t("hero.subtitle")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button id="hero-cta" onClick={onStart}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-hero-navy text-sm font-semibold hover:bg-white/90 transition-colors">
                {t("hero.cta")} <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {hasExistingProfile && onGoToApp && (
                <button onClick={onGoToApp}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-white/25 text-white/85 text-sm font-semibold hover:bg-white/10 transition-colors">
                  {t("action.goToDashboard")} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <a href="/lonseddel"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 hover:text-white/90 transition-colors border border-white/10">
                <Upload className="w-3 h-3" />
                {t("payslip.welcomeCta")}
              </a>
              <a href="/lonudvikling"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white/70 text-xs font-medium hover:bg-white/15 hover:text-white/90 transition-colors border border-white/10">
                <BarChart3 className="w-3 h-3" />
                {t("timeline.title")}
              </a>
            </div>
            <p className="text-white/40 text-xs mt-2">
              {t("hero.socialProof")}
            </p>
          </div>
          <div className="hidden lg:block">
            <HeroSankey />
          </div>
        </div>
      </section>

      {/* Navy stat-band — bank-style anchor below hero */}
      <HeroStatBand />

      {/* Trust badges — slim strip after stat-band */}
      <div className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-5">
          {[
            { icon: <Shield className="w-4 h-4 text-muted-foreground" />, text: t("trust.danish") },
            { icon: <Clock className="w-4 h-4 text-muted-foreground" />, text: t("trust.time") },
            { icon: <Lock className="w-4 h-4 text-muted-foreground" />, text: t("trust.private") },
          ].map((b) => (
            <div key={b.text} className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">{b.icon}<span>{b.text}</span></div>
          ))}
        </div>
      </div>

      {/* How it works — compact bank-statement style */}
      <section id="saadan-virker-det" className="bg-background py-8 scroll-mt-16 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">{t("howItWorks.title")}</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">{t("howItWorks.subtitle")}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 border border-border divide-x divide-border">
            {config.hero.stats.map((stat) => (
              <div key={stat.label} className="px-4 py-3">
                <p className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums leading-none">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards — bank-statement 2x3 grid, flat icons no colored boxes */}
      <section id="produkter" className="bg-background py-10 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4">{t("nav.products")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 border border-border divide-y sm:divide-y-0 sm:divide-x md:divide-x divide-border">
            {[
              { icon: <Search className="w-4 h-4 text-foreground/70" />, title: t("feature.findHidden"), desc: t("feature.findHiddenDesc") },
              { icon: <Brain className="w-4 h-4 text-foreground/70" />, title: t("feature.aiInsight"), desc: t("feature.aiInsightDesc") },
              { icon: <Zap className="w-4 h-4 text-foreground/70" />, title: t("feature.stressTest"), desc: t("feature.stressTestDesc") },
              { icon: <BarChart3 className="w-4 h-4 text-foreground/70" />, title: t("feature.compare"), desc: t("feature.compareDesc") },
              { icon: <FileText className="w-4 h-4 text-foreground/70" />, title: t("feature.bankReport"), desc: t("feature.bankReportDesc") },
              { icon: <PiggyBank className="w-4 h-4 text-foreground/70" />, title: t("feature.savings"), desc: t("feature.savingsDesc") },
            ].map((f, i) => (
              <div key={i} className={`p-4 ${i >= 3 ? "sm:border-t md:border-t border-border" : ""}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {f.icon}
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">{f.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — bank-style flat row, no italic, no big quote marks */}
      {config.testimonials && config.testimonials.length > 0 && (
        <section className="bg-muted/30 py-10 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-4">{t("testimonials.title")}</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 border border-border bg-background divide-y sm:divide-y-0 sm:divide-x divide-border">
              {config.testimonials.map((testimonial) => (
                <div key={testimonial.name} className="p-4">
                  <p className="text-sm text-foreground leading-snug mb-2">{testimonial.quote}</p>
                  <p className="text-[11px] text-muted-foreground">— {testimonial.name}, {testimonial.location}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA — bank-style left-aligned, no shadow */}
      <section className="bg-hero-navy py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-white tracking-tight mb-1">{t("bottomCta.title")}</h2>
            <p className="text-white/65 text-sm mb-4 leading-snug">{t("bottomCta.subtitle")}</p>
            <button onClick={onStart}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-hero-navy font-semibold text-sm hover:bg-white/90 transition-colors">
              {t("hero.cta")} <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <p className="text-white/45 text-xs mt-3">{t("bottomCta.noLogin")}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground/[0.03] border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
            <div>
              <span className="text-base font-semibold text-foreground tracking-tight">{config.brandName}</span>
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
