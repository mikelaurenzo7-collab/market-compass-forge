import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "sonner";
import { getInstitutionalError } from "@/lib/errorMessages";

// Lazy-loaded route components
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const DealsOverview = lazy(() => import("./pages/DealsOverview"));
const DealFlow = lazy(() => import("./pages/DealFlow"));
const DealRoom = lazy(() => import("./pages/DealRoom"));
const DealMatcher = lazy(() => import("./pages/DealMatcher"));
const Discover = lazy(() => import("./pages/Discover"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Valuations = lazy(() => import("./pages/Valuations"));
const Decisions = lazy(() => import("./pages/Decisions"));
const DataRoom = lazy(() => import("./pages/DataRoom"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ExternalPortal = lazy(() => import("./pages/ExternalPortal"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Demo = lazy(() => import("./pages/Demo"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      onError: (error: unknown) => {
        toast.error(getInstitutionalError(error));
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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/external-portal" element={<ExternalPortal />} />
              <Route path="/demo" element={<Demo />} />

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
                <Route path="/decisions" element={<Decisions />} />

                {/* Utility */}
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/account" element={<Navigate to="/settings" replace />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/help" element={<Help />} />

                {/* Legacy tools (accessible, not in nav) */}
                <Route path="/valuations" element={<Valuations />} />
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
