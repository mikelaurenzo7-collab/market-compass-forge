import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import { toast } from "sonner";

// Eagerly loaded (landing + auth are entry points)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages (code-split per route)
const Index = lazy(() => import("./pages/Index"));
const Companies = lazy(() => import("./pages/Companies"));
const CompanyDetail = lazy(() => import("./pages/CompanyDetail"));
const Deals = lazy(() => import("./pages/Deals"));
const Valuations = lazy(() => import("./pages/Valuations"));
const FundIntelligence = lazy(() => import("./pages/FundIntelligence"));
const RealEstateIntel = lazy(() => import("./pages/RealEstateIntel"));
const Research = lazy(() => import("./pages/Research"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Settings = lazy(() => import("./pages/Settings"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Help = lazy(() => import("./pages/Help"));
const IntelligenceFeed = lazy(() => import("./pages/IntelligenceFeed"));
const DistressedAssets = lazy(() => import("./pages/DistressedAssets"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const GlobalMarkets = lazy(() => import("./pages/GlobalMarkets"));
const SectorPulse = lazy(() => import("./pages/SectorPulse"));
const DealMatcher = lazy(() => import("./pages/DealMatcher"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const DataRoom = lazy(() => import("./pages/DataRoom"));
const Decisions = lazy(() => import("./pages/Decisions"));
const DataCoverage = lazy(() => import("./pages/DataCoverage"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function friendlyErrorMessage(error: any): string {
  const msg = (error?.message ?? "").toLowerCase();
  if (msg.includes("jwt") || msg.includes("token") || msg.includes("401")) {
    return "Your session has expired. Please sign in again.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  if (msg.includes("duplicate") || msg.includes("unique")) {
    return "This item already exists.";
  }
  if (msg.includes("permission") || msg.includes("403") || msg.includes("forbidden")) {
    return "You don't have permission to perform this action.";
  }
  if (msg.includes("not found") || msg.includes("404")) {
    return "The requested resource was not found.";
  }
  return "Something went wrong. Please try again.";
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      onError: (error: any) => {
        toast.error(friendlyErrorMessage(error));
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/data-coverage" element={<DataCoverage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Index />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/companies/:id" element={<CompanyDetail />} />
                <Route path="/valuations" element={<Valuations />} />
                <Route path="/deals" element={<Deals />} />
                <Route path="/fund-intelligence" element={<FundIntelligence />} />
                <Route path="/real-estate" element={<RealEstateIntel />} />
                <Route path="/distressed" element={<DistressedAssets />} />
                <Route path="/global" element={<GlobalMarkets />} />
                <Route path="/sector-pulse" element={<SectorPulse />} />
                <Route path="/deal-matcher" element={<DealMatcher />} />
                <Route path="/research" element={<Research />} />
                <Route path="/intelligence" element={<IntelligenceFeed />} />
                <Route path="/screening" element={<Navigate to="/companies" replace />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/data-room" element={<DataRoom />} />
                <Route path="/decisions" element={<Decisions />} />
                <Route path="/document-analyzer" element={<Navigate to="/research" replace />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/help" element={<Help />} />
                <Route path="/developers" element={<Navigate to="/settings" replace />} />
                {/* Legacy redirects */}
                <Route path="/discover" element={<Navigate to="/companies" replace />} />
                <Route path="/competitive-intel" element={<Navigate to="/intelligence" replace />} />
                <Route path="/sector-momentum" element={<Navigate to="/sector-pulse" replace />} />
                <Route path="/documents" element={<Navigate to="/document-analyzer" replace />} />
                <Route path="/markets/private" element={<Navigate to="/companies" replace />} />
                <Route path="/markets/public" element={<Navigate to="/companies" replace />} />
                <Route path="/watchlists" element={<Navigate to="/screening" replace />} />
                <Route path="/comps" element={<Navigate to="/valuations" replace />} />
                <Route path="/analytics" element={<Navigate to="/fund-intelligence" replace />} />
                <Route path="/people" element={<Navigate to="/fund-intelligence" replace />} />
                <Route path="/compare" element={<Navigate to="/valuations" replace />} />
                <Route path="/network" element={<Navigate to="/dashboard" replace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
