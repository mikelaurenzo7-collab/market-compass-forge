import { useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import SearchBar from "@/components/SearchBar";
import CommandPalette from "@/components/CommandPalette";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import ErrorBoundary from "@/components/ErrorBoundary";
import DisclaimerFooter from "@/components/DisclaimerFooter";
import AmbientGrid from "@/components/AmbientGrid";
import AICopilot from "@/components/AICopilot";
import { useHotkeys, SIDEBAR_ROUTES } from "@/hooks/useHotkeys";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Bell, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: unreadCount } = useUnreadCount();

  const openPalette = useCallback(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }, []);

  useHotkeys([
    { key: "/", meta: true, handler: () => setShowShortcuts((v) => !v) },
    { key: "?", handler: () => setShowShortcuts((v) => !v) },
    { key: "Escape", handler: () => { setShowShortcuts(false); setMobileMenuOpen(false); } },
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

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Clean header */}
        <header className="sticky top-0 z-30 bg-background/60 backdrop-blur-2xl px-3 md:px-6 py-2.5 flex items-center gap-3 md:gap-4 border-b border-border/20">
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
            <button
              onClick={() => navigate("/alerts")}
              className="relative p-2 rounded-lg hover:bg-secondary/60 transition-all duration-300 text-muted-foreground hover:text-foreground group"
              aria-label="View alerts"
            >
              <Bell className="h-4 w-4 transition-transform group-hover:scale-110" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-primary animate-glow-pulse shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
              )}
            </button>
          </div>
        </header>

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
      </main>
    </div>
  );
};

export default AppLayout;
