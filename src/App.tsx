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
import DealsOverview from "./pages/DealsOverview";
import DealFlow from "./pages/DealFlow";
import DealRoom from "./pages/DealRoom";
import DealMatcher from "./pages/DealMatcher";
import Discover from "./pages/Discover";
import Portfolio from "./pages/Portfolio";
import Valuations from "./pages/Valuations";
import Decisions from "./pages/Decisions";
import DataRoom from "./pages/DataRoom";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
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
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Authenticated */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {/* Discover */}
              <Route path="/discover" element={<Discover />} />

              {/* Deals */}
              <Route path="/deals" element={<DealsOverview />} />
              <Route path="/deals/flow" element={<DealFlow />} />
              <Route path="/deals/recommended" element={<DealMatcher />} />
              <Route path="/deals/:id" element={<DealRoom />} />

              {/* Portfolio */}
              <Route path="/portfolio" element={<Portfolio />} />

              {/* Utility */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/account" element={<Navigate to="/settings" replace />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/help" element={<Help />} />

              {/* Legacy tools (accessible, not in nav) */}
              <Route path="/valuations" element={<Valuations />} />
              <Route path="/decisions" element={<Decisions />} />
              <Route path="/data-room" element={<DataRoom />} />

              {/* All legacy redirects → new routes */}
              <Route path="/dashboard" element={<Navigate to="/deals" replace />} />
              <Route path="/intelligence" element={<Navigate to="/discover" replace />} />
              <Route path="/rooms" element={<Navigate to="/deals" replace />} />
              <Route path="/deal-matcher" element={<Navigate to="/deals/recommended" replace />} />
              <Route path="/companies/*" element={<Navigate to="/discover" replace />} />
              <Route path="/fund-intelligence" element={<Navigate to="/discover" replace />} />
              <Route path="/real-estate" element={<Navigate to="/discover" replace />} />
              <Route path="/global" element={<Navigate to="/discover" replace />} />
              <Route path="/sector-pulse" element={<Navigate to="/discover" replace />} />
              <Route path="/research" element={<Navigate to="/discover" replace />} />
              <Route path="/distressed" element={<Navigate to="/discover" replace />} />
              <Route path="/screening" element={<Navigate to="/discover" replace />} />
              <Route path="/data-coverage" element={<Navigate to="/discover" replace />} />
              <Route path="/document-analyzer" element={<Navigate to="/discover" replace />} />
              <Route path="/developers" element={<Navigate to="/settings" replace />} />
              <Route path="/competitive-intel" element={<Navigate to="/discover" replace />} />
              <Route path="/sector-momentum" element={<Navigate to="/discover" replace />} />
              <Route path="/analytics" element={<Navigate to="/discover" replace />} />
              <Route path="/people" element={<Navigate to="/discover" replace />} />
              <Route path="/comps" element={<Navigate to="/valuations" replace />} />
              <Route path="/compare" element={<Navigate to="/valuations" replace />} />
              <Route path="/network" element={<Navigate to="/deals" replace />} />
              <Route path="/markets/*" element={<Navigate to="/discover" replace />} />
              <Route path="/watchlists" element={<Navigate to="/discover" replace />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
