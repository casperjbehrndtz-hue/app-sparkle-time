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

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privatliv = lazy(() => import("./pages/Privatliv"));

const queryClient = new QueryClient();

// Determine white-label config from URL param or default
function getConfig() {
  const params = new URLSearchParams(window.location.search);
  const brand = params.get("brand");
  if (brand && AVAILABLE_CONFIGS[brand]) {
    return AVAILABLE_CONFIGS[brand];
  }
  return AVAILABLE_CONFIGS.kassen;
}

const App = () => {
  const config = getConfig();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <WhiteLabelProvider config={config}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/privatliv" element={<Privatliv />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
              <CookieBanner />
            </TooltipProvider>
          </WhiteLabelProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
