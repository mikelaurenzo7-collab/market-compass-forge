import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import SearchBar from "@/components/SearchBar";
import CommandPalette from "@/components/CommandPalette";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import ErrorBoundary from "@/components/ErrorBoundary";
import DisclaimerFooter from "@/components/DisclaimerFooter";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Bell, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AppLayout = () => {
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: unreadCount } = useUnreadCount();

  const openPalette = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  useHotkeys([
    { key: "/", meta: true, handler: () => setShowShortcuts((v) => !v) },
    { key: "Escape", handler: () => { setShowShortcuts(false); setMobileMenuOpen(false); } },
  ]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-56 h-full animate-fade-in">
            <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <CommandPalette />
      <KeyboardShortcuts open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 border-b border-border glass px-3 md:px-6 py-3 flex items-center gap-3 md:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-secondary text-muted-foreground"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex-1 max-w-2xl">
            <SearchBar onOpen={openPalette} />
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => navigate("/alerts")}
              className="relative p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </header>

        <ErrorBoundary>
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </ErrorBoundary>
        <DisclaimerFooter />
      </main>
    </div>
  );
};

export default AppLayout;
