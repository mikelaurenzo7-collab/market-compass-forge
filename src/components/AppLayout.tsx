import { useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import SearchBar from "@/components/SearchBar";
import CommandPalette from "@/components/CommandPalette";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import ErrorBoundary from "@/components/ErrorBoundary";
import DisclaimerFooter from "@/components/DisclaimerFooter";
import WhatsNewModal from "@/components/WhatsNewModal";
import AmbientGrid from "@/components/AmbientGrid";
import TickerTape from "@/components/TickerTape";
import AICopilot from "@/components/AICopilot";
import CompareMode from "@/components/CompareMode";
import { useHotkeys, SIDEBAR_ROUTES } from "@/hooks/useHotkeys";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Bell, Menu, X, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const { data: unreadCount } = useUnreadCount();

  const openPalette = useCallback(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }, []);

  useHotkeys([
    { key: "/", meta: true, handler: () => setShowShortcuts((v) => !v) },
    { key: "Escape", handler: () => { setShowShortcuts(false); setMobileMenuOpen(false); setCompareOpen(false); } },
    { key: "c", meta: true, shift: true, handler: () => setCompareOpen((v) => !v) },
    ...SIDEBAR_ROUTES.map((route, i) => ({
      key: String(i + 1),
      meta: true,
      handler: () => navigate(route),
    })),
  ]);

  return (
    <div className="flex min-h-screen bg-background relative">
      <AmbientGrid />
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="relative w-56 h-full"
            >
              <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CommandPalette />
      <KeyboardShortcuts open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <WhatsNewModal />

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border/40 bg-background/60 backdrop-blur-xl px-3 md:px-6 py-2.5 flex items-center gap-3 md:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex-1 max-w-2xl">
            <SearchBar onOpen={openPalette} />
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* BETA badge */}
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-primary/30 text-primary bg-primary/5">
              Beta
            </span>
            <button
              onClick={() => navigate("/alerts")}
              className="relative p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              aria-label="View alerts"
            >
              <Bell className="h-4 w-4" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          </div>
        </header>

        {/* Compact status strip */}
        <div className="border-b border-border/30 bg-muted/10 px-4 md:px-6 py-1 flex items-center gap-4 text-[10px] font-mono text-muted-foreground/70">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <span className="text-primary/80">LIVE</span>
          </span>
          <div className="flex-1 min-w-0">
            <TickerTape />
          </div>
          <span className="ml-auto hidden sm:inline opacity-50 shrink-0">⌘K search · ⌘/ shortcuts · ⌘⇧C compare</span>
        </div>

        <ErrorBoundary>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1"
          >
            <Outlet />
          </motion.div>
        </ErrorBoundary>
        <DisclaimerFooter />
        <AICopilot />
        <CompareMode open={compareOpen} onClose={() => setCompareOpen(false)} />
      </main>
    </div>
  );
};

export default AppLayout;
