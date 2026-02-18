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
import Deals from "./pages/Deals";
import Valuations from "./pages/Valuations";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Help from "./pages/Help";
import AdminDashboard from "./pages/AdminDashboard";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import DealMatcher from "./pages/DealMatcher";
import Portfolio from "./pages/Portfolio";
import DataRoom from "./pages/DataRoom";
import Decisions from "./pages/Decisions";
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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Index />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/deal-matcher" element={<DealMatcher />} />
              <Route path="/valuations" element={<Valuations />} />
              <Route path="/decisions" element={<Decisions />} />
              <Route path="/data-room" element={<DataRoom />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/help" element={<Help />} />
              {/* Legacy redirects — all removed routes → dashboard */}
              <Route path="/companies/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/fund-intelligence" element={<Navigate to="/dashboard" replace />} />
              <Route path="/real-estate" element={<Navigate to="/dashboard" replace />} />
              <Route path="/global" element={<Navigate to="/dashboard" replace />} />
              <Route path="/sector-pulse" element={<Navigate to="/dashboard" replace />} />
              <Route path="/research" element={<Navigate to="/dashboard" replace />} />
              <Route path="/intelligence" element={<Navigate to="/dashboard" replace />} />
              <Route path="/distressed" element={<Navigate to="/dashboard" replace />} />
              <Route path="/screening" element={<Navigate to="/dashboard" replace />} />
              <Route path="/data-coverage" element={<Navigate to="/dashboard" replace />} />
              <Route path="/document-analyzer" element={<Navigate to="/dashboard" replace />} />
              <Route path="/developers" element={<Navigate to="/settings" replace />} />
              <Route path="/discover" element={<Navigate to="/dashboard" replace />} />
              <Route path="/competitive-intel" element={<Navigate to="/dashboard" replace />} />
              <Route path="/sector-momentum" element={<Navigate to="/dashboard" replace />} />
              <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
              <Route path="/people" element={<Navigate to="/dashboard" replace />} />
              <Route path="/comps" element={<Navigate to="/valuations" replace />} />
              <Route path="/compare" element={<Navigate to="/valuations" replace />} />
              <Route path="/network" element={<Navigate to="/dashboard" replace />} />
              <Route path="/markets/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/watchlists" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
