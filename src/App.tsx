import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WhiteLabelProvider, AVAILABLE_CONFIGS } from "@/lib/whiteLabel";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

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
    <QueryClientProvider client={queryClient}>
      <WhiteLabelProvider config={config}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WhiteLabelProvider>
    </QueryClientProvider>
  );
};

export default App;
