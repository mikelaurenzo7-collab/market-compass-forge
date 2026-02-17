import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

import { toast } from "sonner";

// ── Lazy-loaded pages (code-split per route) ──────────────────────────
// Public
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const DataCoverage = lazy(() => import("./pages/DataCoverage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

// Deal Room OS — Core
const DealsOverview = lazy(() => import("./pages/DealsOverview"));
const Deals = lazy(() => import("./pages/Deals"));
const DealRoom = lazy(() => import("./pages/DealRoom"));
const DealMatcher = lazy(() => import("./pages/DealMatcher"));
const Rooms = lazy(() => import("./pages/Rooms"));
const RoomDetail = lazy(() => import("./pages/RoomDetail"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Network = lazy(() => import("./pages/Network"));
const LPReporting = lazy(() => import("./pages/LPReporting"));

// Intelligence
const Companies = lazy(() => import("./pages/Companies"));
const CompanyDetail = lazy(() => import("./pages/CompanyDetail"));
const GlobalMarkets = lazy(() => import("./pages/GlobalMarkets"));
const RealEstateIntel = lazy(() => import("./pages/RealEstateIntel"));
const DistressedAssets = lazy(() => import("./pages/DistressedAssets"));
const FundIntelligence = lazy(() => import("./pages/FundIntelligence"));
const Research = lazy(() => import("./pages/Research"));
const IntelligenceFeed = lazy(() => import("./pages/IntelligenceFeed"));
const SectorPulse = lazy(() => import("./pages/SectorPulse"));
const DataRoom = lazy(() => import("./pages/DataRoom"));

// Deal Engine
const Valuations = lazy(() => import("./pages/Valuations"));
const Decisions = lazy(() => import("./pages/Decisions"));
const Automations = lazy(() => import("./pages/Automations"));

// Utility
const Alerts = lazy(() => import("./pages/Alerts"));
const Settings = lazy(() => import("./pages/Settings"));
const Help = lazy(() => import("./pages/Help"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// ── Route loading fallback ───────────────────────────────────────────
const RouteFallback = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
      onError: (error: Error) => {
        toast.error(error?.message || "Something went wrong");
      },
    },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
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
                <Route path="/lp-reporting" element={<LPReporting />} />

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
                <Route path="/automations" element={<Automations />} />

                {/* ===== UTILITY ===== */}
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/help" element={<Help />} />
                <Route path="/admin" element={<AdminDashboard />} />

                {/* ===== LEGACY DASHBOARD (kept, redirects to Deals) ===== */}
                <Route path="/dashboard" element={<Navigate to="/deals" replace />} />

                {/* ===== LEGACY REDIRECTS ===== */}
                <Route path="/deal-matcher" element={<Navigate to="/deals/recommended" replace />} />
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
          </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
