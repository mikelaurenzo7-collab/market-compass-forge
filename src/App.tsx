import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import DataCoverage from "./pages/DataCoverage";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";

// Deal Room OS — Core
import DealsOverview from "./pages/DealsOverview";
import Deals from "./pages/Deals";
import DealRoom from "./pages/DealRoom";
import DealMatcher from "./pages/DealMatcher";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Portfolio from "./pages/Portfolio";
import Network from "./pages/Network";

// Intelligence
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import GlobalMarkets from "./pages/GlobalMarkets";
import RealEstateIntel from "./pages/RealEstateIntel";
import DistressedAssets from "./pages/DistressedAssets";
import FundIntelligence from "./pages/FundIntelligence";
import Research from "./pages/Research";
import IntelligenceFeed from "./pages/IntelligenceFeed";
import SectorPulse from "./pages/SectorPulse";
import DataRoom from "./pages/DataRoom";

// Deal Engine (repositioned)
import Valuations from "./pages/Valuations";
import Decisions from "./pages/Decisions";

// Utility
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import AdminDashboard from "./pages/AdminDashboard";

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
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/data-coverage" element={<DataCoverage />} />

            {/* OAuth callback (protected, no AppLayout) */}
            <Route path="/auth/callback" element={<ProtectedRoute><AuthCallback /></ProtectedRoute>} />

            {/* Protected routes — Deal Room OS */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {/* ===== DEALS (primary) ===== */}
              <Route path="/deals" element={<DealsOverview />} />
              <Route path="/deals/flow" element={<Deals />} />
              <Route path="/deals/recommended" element={<DealMatcher />} />
              <Route path="/deals/:id" element={<DealRoom />} />

              {/* ===== ROOMS ===== */}
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/rooms/:id" element={<RoomDetail />} />

              {/* ===== PORTFOLIO ===== */}
              <Route path="/portfolio" element={<Portfolio />} />

              {/* ===== INTELLIGENCE ===== */}
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/global" element={<GlobalMarkets />} />
              <Route path="/real-estate" element={<RealEstateIntel />} />
              <Route path="/distressed" element={<DistressedAssets />} />
              <Route path="/fund-intelligence" element={<FundIntelligence />} />
              <Route path="/research" element={<Research />} />
              <Route path="/intelligence" element={<IntelligenceFeed />} />
              <Route path="/sector-pulse" element={<SectorPulse />} />
              <Route path="/data-room" element={<DataRoom />} />

              {/* ===== DEAL ENGINE (repositioned, still accessible) ===== */}
              <Route path="/valuations" element={<Valuations />} />
              <Route path="/decisions" element={<Decisions />} />

              {/* ===== UTILITY ===== */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
              <Route path="/admin" element={<AdminDashboard />} />

              {/* ===== LEGACY DASHBOARD (kept, redirects to Deals) ===== */}
              <Route path="/dashboard" element={<Navigate to="/deals" replace />} />

              {/* ===== LEGACY REDIRECTS ===== */}
              {/* Old deal-matcher → new recommended deals */}
              <Route path="/deal-matcher" element={<Navigate to="/deals/recommended" replace />} />

              {/* Preserved legacy redirects from original codebase */}
              <Route path="/screening" element={<Navigate to="/companies" replace />} />
              <Route path="/discover" element={<Navigate to="/companies" replace />} />
              <Route path="/document-analyzer" element={<Navigate to="/research" replace />} />
              <Route path="/documents" element={<Navigate to="/research" replace />} />
              <Route path="/competitive-intel" element={<Navigate to="/intelligence" replace />} />
              <Route path="/sector-momentum" element={<Navigate to="/sector-pulse" replace />} />
              <Route path="/people" element={<Navigate to="/fund-intelligence" replace />} />
              <Route path="/analytics" element={<Navigate to="/fund-intelligence" replace />} />
              <Route path="/comps" element={<Navigate to="/valuations" replace />} />
              <Route path="/compare" element={<Navigate to="/valuations" replace />} />
              <Route path="/watchlists" element={<Navigate to="/companies" replace />} />
              <Route path="/markets/private" element={<Navigate to="/companies" replace />} />
              <Route path="/markets/public" element={<Navigate to="/companies" replace />} />
              <Route path="/network" element={<Network />} />
              <Route path="/developers" element={<Navigate to="/settings" replace />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
