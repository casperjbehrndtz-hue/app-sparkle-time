import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WhiteLabelProvider, AVAILABLE_CONFIGS } from "@/lib/whiteLabel";
import { I18nProvider } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CookieBanner } from "@/components/CookieBanner";
import { PageLoader } from "@/components/PageLoader";
import { MarketDataProvider } from "@/hooks/useMarketData";

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

const queryClient = new QueryClient();

function getConfig() {
  const params = new URLSearchParams(window.location.search);
  const brand = params.get("brand");
  if (brand && AVAILABLE_CONFIGS[brand]) {
    return AVAILABLE_CONFIGS[brand];
  }
  return AVAILABLE_CONFIGS.kassen;
}

// Embed mode: hide cookie banner and external navigation when inside an iframe
const isEmbed = new URLSearchParams(window.location.search).get("embed") === "true";

const App = () => {
  const config = getConfig();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <WhiteLabelProvider config={config}>
            <MarketDataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/privatliv" element={<Privatliv />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/login" element={<Auth />} />
                    <Route path="/guides" element={<Blog />} />
                    <Route path="/guides/:slug" element={<Article />} />
                    <Route path="/b2b" element={<B2BPage />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/partner" element={<Partner />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
              {!isEmbed && <CookieBanner />}
            </TooltipProvider>
            </MarketDataProvider>
          </WhiteLabelProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
