import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Palette, Brain, ShieldCheck, Check, ArrowRight, Monitor, Send } from "lucide-react";
import { AppFooter } from "@/components/AppFooter";
import { useI18n } from "@/lib/i18n";

export default function B2BPage() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", company: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const pricingPlans = [
    {
      name: "Starter",
      price: "15.000",
      period: t("perMonth"),
      users: t("b2b.starter.users"),
      features: [
        t("b2b.starter.f1"),
        t("b2b.starter.f2"),
        t("b2b.starter.f3"),
        t("b2b.starter.f4"),
        t("b2b.starter.f5"),
      ],
      highlighted: false,
    },
    {
      name: "Growth",
      price: "35.000",
      period: t("perMonth"),
      users: t("b2b.growth.users"),
      features: [
        t("b2b.growth.f1"),
        t("b2b.growth.f2"),
        t("b2b.growth.f3"),
        t("b2b.growth.f4"),
        t("b2b.growth.f5"),
      ],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: t("b2b.enterprise.price"),
      period: "",
      users: t("b2b.enterprise.users"),
      features: [
        t("b2b.enterprise.f1"),
        t("b2b.enterprise.f2"),
        t("b2b.enterprise.f3"),
        t("b2b.enterprise.f4"),
        t("b2b.enterprise.f5"),
      ],
      highlighted: false,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(t("b2b.emailSubject").replace("{company}", form.company));
    const body = encodeURIComponent(
      `${t("b2b.labelName")}: ${form.name}\n${t("b2b.labelCompany")}: ${form.company}\n${t("b2b.labelEmail")}: ${form.email}\n\n${t("b2b.labelMessage")}:\n${form.message}`
    );
    window.location.href = `mailto:casper@kassen.dk?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(216,56%,15%)] via-[hsl(216,56%,22%)] to-[hsl(216,56%,30%)] text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0wIDM2YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzek0wIDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNTMS42NTcgMTIgMCAxMnMtMyAxLjM0My0zIDMgMS4zNDMgMyAzIDN6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="max-w-6xl mx-auto px-4 py-20 sm:py-28 relative">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="h-5 w-5 text-amber-400" />
            <span className="text-amber-400 font-medium text-sm tracking-wide uppercase">{t("b2b.heroTag")}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight max-w-3xl">
            {t("b2b.heroTitle")}{" "}
            <span className="text-amber-400">{t("b2b.heroTitleHighlight")}</span>{" "}
            {t("b2b.heroTitleSuffix")}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl">
            {t("b2b.heroSubtitle")}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/?demo=true"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-amber-950 font-semibold rounded-lg hover:bg-amber-300 transition-colors"
            >
              <Monitor className="h-5 w-5" />
              {t("b2b.liveDemo")}
            </Link>
            <a
              href="#kontakt"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              {t("b2b.contactUs")}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* USPs */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t("b2b.whyTitle")}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-8 shadow-sm border">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t("b2b.whiteLabelReady")}</h3>
              <p className="text-muted-foreground">
                {t("b2b.whiteLabelDesc")}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-8 shadow-sm border">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t("b2b.aiPowered")}</h3>
              <p className="text-muted-foreground">
                {t("b2b.aiPoweredDesc")}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-8 shadow-sm border">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t("b2b.privacyFirst")}</h3>
              <p className="text-muted-foreground">
                {t("b2b.privacyFirstDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature showcase */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">{t("b2b.featureTitle")}</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            {t("b2b.featureSubtitle")}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: t("b2b.feat.cockpit"), desc: t("b2b.feat.cockpitDesc") },
              { title: t("b2b.feat.sankey"), desc: t("b2b.feat.sankeyDesc") },
              { title: t("b2b.feat.aiOpt"), desc: t("b2b.feat.aiOptDesc") },
              { title: t("b2b.feat.projection"), desc: t("b2b.feat.projectionDesc") },
              { title: t("b2b.feat.stress"), desc: t("b2b.feat.stressDesc") },
              { title: t("b2b.feat.neighbor"), desc: t("b2b.feat.neighborDesc") },
            ].map((f) => (
              <div key={f.title} className="border rounded-xl p-6 hover:shadow-md transition-shadow">
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* White-label demos */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t("b2b.brandTitle")}</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            {t("b2b.brandSubtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/?demo=true&brand=nordea"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[hsl(213,100%,30%)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Nordea Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/?demo=true&brand=danskebank"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[hsl(195,100%,25%)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Danske Bank Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/?demo=true"
              className="inline-flex items-center gap-2 px-5 py-3 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors"
            >
              Kassen Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">{t("b2b.pricingTitle")}</h2>
          <p className="text-center text-muted-foreground mb-12">
            {t("b2b.pricingSubtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border-2 ${
                  plan.highlighted
                    ? "border-primary bg-primary/5 shadow-lg relative"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    {t("b2b.mostPopular")}
                  </span>
                )}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.users}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#kontakt"
                  className={`block text-center py-2.5 rounded-lg font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-primary text-primary hover:bg-primary/5"
                  }`}
                >
                  {t("b2b.getStarted")}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">{t("b2b.testimonialTitle")}</h2>
          <div className="bg-card border rounded-2xl p-10 max-w-lg mx-auto">
            <p className="text-muted-foreground italic mb-4">
              "{t("b2b.testimonialQuote")}"
            </p>
            <a
              href="mailto:casper@kassen.dk?subject=B2B%20-%20Anmod%20om%20referencer"
              className="text-primary font-medium hover:underline"
            >
              {t("b2b.testimonialLink")}
            </a>
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section id="kontakt" className="py-20">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">{t("b2b.contactTitle")}</h2>
          <p className="text-center text-muted-foreground mb-10">
            {t("b2b.contactSubtitle")}
          </p>

          {submitted ? (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center">
              <h3 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-2">
                {t("b2b.thankYou")}
              </h3>
              <p className="text-green-700 dark:text-green-400">
                {t("b2b.thankYouDesc")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="b2b-name" className="block text-sm font-medium mb-1.5">{t("b2b.labelName")}</label>
                  <input
                    id="b2b-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                    placeholder={t("b2b.placeholderName")}
                  />
                </div>
                <div>
                  <label htmlFor="b2b-company" className="block text-sm font-medium mb-1.5">{t("b2b.labelCompany")}</label>
                  <input
                    id="b2b-company"
                    type="text"
                    required
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                    placeholder={t("b2b.placeholderCompany")}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="b2b-email" className="block text-sm font-medium mb-1.5">{t("b2b.labelEmail")}</label>
                <input
                  id="b2b-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                  placeholder="din@virksomhed.dk"
                />
              </div>
              <div>
                <label htmlFor="b2b-message" className="block text-sm font-medium mb-1.5">{t("b2b.labelMessage")}</label>
                <textarea
                  id="b2b-message"
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition resize-y"
                  placeholder={t("b2b.placeholderMessage")}
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                <Send className="h-4 w-4" />
                {t("b2b.submit")}
              </button>
            </form>
          )}
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
