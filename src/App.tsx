import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Deals from "./pages/Deals";
import Analytics from "./pages/Analytics";
import Screening from "./pages/Screening";
import Research from "./pages/Research";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Portfolio from "./pages/Portfolio";
import CompTableBuilder from "./pages/CompTableBuilder";
import PublicMarkets from "./pages/PublicMarkets";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Index />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/valuations" element={<CompTableBuilder />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/fund-intelligence" element={<Analytics />} />
              <Route path="/real-estate" element={<Portfolio />} />
              <Route path="/research" element={<Research />} />
              <Route path="/intelligence" element={<PublicMarkets />} />
              <Route path="/watchlists" element={<Screening />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
              {/* Legacy redirects */}
              <Route path="/markets/private" element={<Navigate to="/companies" replace />} />
              <Route path="/markets/public" element={<Navigate to="/intelligence" replace />} />
              <Route path="/screening" element={<Navigate to="/watchlists" replace />} />
              <Route path="/comps" element={<Navigate to="/valuations" replace />} />
              <Route path="/analytics" element={<Navigate to="/fund-intelligence" replace />} />
              <Route path="/people" element={<Navigate to="/fund-intelligence" replace />} />
              <Route path="/portfolio" element={<Navigate to="/real-estate" replace />} />
              <Route path="/compare" element={<Navigate to="/valuations" replace />} />
              <Route path="/network" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
