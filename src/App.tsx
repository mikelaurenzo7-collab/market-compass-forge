import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Deals from "./pages/Deals";
import Analytics from "./pages/Analytics";
import Screening from "./pages/Screening";
import Research from "./pages/Research";
import People from "./pages/People";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import NetworkGraph from "./pages/NetworkGraph";
import CompanyComparison from "./pages/CompanyComparison";
import Integrations from "./pages/Integrations";
import PublicMarkets from "./pages/PublicMarkets";
import PrivateMarkets from "./pages/PrivateMarkets";
import Portfolio from "./pages/Portfolio";
import CompTableBuilder from "./pages/CompTableBuilder";
import Developers from "./pages/Developers";

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
            <Route path="/auth" element={<Auth />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Index />} />
              <Route path="/markets/private" element={<PrivateMarkets />} />
              <Route path="/markets/public" element={<PublicMarkets />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/screening" element={<Screening />} />
              <Route path="/research" element={<Research />} />
              <Route path="/people" element={<People />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/network" element={<NetworkGraph />} />
              <Route path="/compare" element={<CompanyComparison />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/comps" element={<CompTableBuilder />} />
              <Route path="/developers" element={<Developers />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
