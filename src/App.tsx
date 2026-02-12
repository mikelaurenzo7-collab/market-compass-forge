import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Deals from "./pages/Deals";
import Valuations from "./pages/Valuations";
import FundIntelligence from "./pages/FundIntelligence";
import RealEstateIntel from "./pages/RealEstateIntel";
import Research from "./pages/Research";
import Screening from "./pages/Screening";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import DocumentAnalyzer from "./pages/DocumentAnalyzer";
import IntelligenceFeed from "./pages/IntelligenceFeed";
import DistressedAssets from "./pages/DistressedAssets";
import AdminDashboard from "./pages/AdminDashboard";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import { toast } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      onError: (error: any) => {
        toast.error(error?.message || "Something went wrong");
      },
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
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Index />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/valuations" element={<Valuations />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/fund-intelligence" element={<FundIntelligence />} />
              <Route path="/real-estate" element={<RealEstateIntel />} />
              <Route path="/distressed" element={<DistressedAssets />} />
              <Route path="/research" element={<Research />} />
              <Route path="/documents" element={<DocumentAnalyzer />} />
              <Route path="/intelligence" element={<IntelligenceFeed />} />
              <Route path="/watchlists" element={<Screening />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<AdminDashboard />} />
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
