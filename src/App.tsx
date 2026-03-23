import { lazy, Suspense, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WhiteLabelProvider, AVAILABLE_CONFIGS } from "@/lib/whiteLabel";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { LocaleProvider, DK_LOCALE, NO_LOCALE } from "@/lib/locale";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CookieBanner } from "@/components/CookieBanner";
import { PageLoader } from "@/components/PageLoader";
import { MarketDataProvider } from "@/hooks/useMarketData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privatliv = lazy(() => import("./pages/Privatliv"));
const Install = lazy(() => import("./pages/Install"));
const Auth = lazy(() => import("./pages/Auth"));
const Blog = lazy(() => import("./pages/Blog"));
const Article = lazy(() => import("./pages/Article"));
const B2BPage = lazy(() => import("./pages/B2BPage"));
const Admin = lazy(() => import("./pages/Admin"));
const Partner = lazy(() => import("./pages/Partner"));
const Vilkaar = lazy(() => import("./pages/Vilkaar"));
const Lonseddel = lazy(() => import("./pages/Lonseddel"));
const Pengetjek = lazy(() => import("./pages/Pengetjek"));

// Build-time locale — mirrors i18n.tsx
const BUILD_LOCALE = (import.meta.env.VITE_LOCALE ?? "da") as "da" | "no";

function getConfig() {
  const params = new URLSearchParams(window.location.search);
  const brand = params.get("brand");
  if (brand && AVAILABLE_CONFIGS[brand]) return AVAILABLE_CONFIGS[brand];
  if (BUILD_LOCALE === "no") return AVAILABLE_CONFIGS.no;
  return AVAILABLE_CONFIGS.nemtbudget;
}

function getLocale() {
  if (BUILD_LOCALE === "no") return NO_LOCALE;
  return DK_LOCALE;
}

/** Listens for session expiry and shows a non-intrusive toast. */
function SessionExpiryListener() {
  const { t } = useI18n();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    // Seed initial state
    supabase.auth.getSession().then(({ data: { session } }) => {
      wasSignedIn.current = !!session;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        wasSignedIn.current = true;
      } else if (event === "SIGNED_OUT" && wasSignedIn.current) {
        wasSignedIn.current = false;
        toast({ title: t("auth.sessionExpired"), description: t("auth.sessionExpiredDesc") });
      }
    });
    return () => subscription.unsubscribe();
  }, [t]);

  return null;
}

// Embed mode: hide cookie banner and external navigation when inside an iframe
const isEmbed = new URLSearchParams(window.location.search).get("embed") === "true";

const App = () => {
  const config = getConfig();
  const locale = getLocale();

  return (
    <ErrorBoundary>
      <I18nProvider>
        <SessionExpiryListener />
        <LocaleProvider locale={locale}>
          <WhiteLabelProvider config={config}>
            <MarketDataProvider>
              <TooltipProvider>
                <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-semibold">
                  Skip to content
                </a>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <ScrollToTop />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/s/:shareId" element={<Index />} />
                      <Route path="/privatliv" element={<Privatliv />} />
                      <Route path="/install" element={<Install />} />
                      <Route path="/login" element={<Auth />} />
                      <Route path="/guides" element={<Blog />} />
                      <Route path="/guides/:slug" element={<Article />} />
                      <Route path="/b2b" element={<B2BPage />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/partner" element={<Partner />} />
                      <Route path="/vilkaar" element={<Vilkaar />} />
                      <Route path="/lonseddel" element={<Lonseddel />} />
                      <Route path="/pengetjek" element={<Pengetjek />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
                {!isEmbed && <CookieBanner />}
              </TooltipProvider>
            </MarketDataProvider>
          </WhiteLabelProvider>
        </LocaleProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
};

export default App;
