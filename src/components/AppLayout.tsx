import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import SearchBar from "@/components/SearchBar";
import CommandPalette from "@/components/CommandPalette";
import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut, User } from "lucide-react";

const AppLayout = () => {
  const { user, signOut } = useAuth();

  const openPalette = () => {
    // Trigger Cmd+K programmatically
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <CommandPalette />

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 border-b border-border glass px-6 py-3 flex items-center gap-4">
          <div className="flex-1 max-w-2xl">
            <SearchBar onOpen={openPalette} />
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
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
