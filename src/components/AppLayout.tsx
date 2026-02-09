import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import SearchBar from "@/components/SearchBar";
import CommandPalette from "@/components/CommandPalette";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { useAuth } from "@/hooks/useAuth";
import { useHotkeys } from "@/hooks/useHotkeys";
import { Bell, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AppLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const openPalette = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  useHotkeys([
    { key: "/", meta: true, handler: () => setShowShortcuts((v) => !v) },
    { key: "Escape", handler: () => setShowShortcuts(false) },
  ]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <CommandPalette />
      <KeyboardShortcuts open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 border-b border-border glass px-6 py-3 flex items-center gap-4">
          <div className="flex-1 max-w-2xl">
            <SearchBar onOpen={openPalette} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/alerts")}
              className="relative p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden lg:block text-xs truncate max-w-[120px]">{user?.email}</span>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
