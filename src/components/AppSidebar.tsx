import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Compass,
  Handshake,
  Briefcase,
  Bell,
  Settings,
  ShieldCheck,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  id: string;
  label: string;
  icon: typeof Compass;
  path: string;
  badge?: number;
}

const AppSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const { data: unreadCount } = useUnreadCount();
  const { signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const { data: userRole } = useQuery({
    queryKey: ["sidebar-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
      return data?.role ?? "analyst";
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isAdminOrPartner = userRole === "admin" || userRole === "partner";

  const mainNav: NavItem[] = useMemo(() => [
    { id: "discover", label: "Discover", icon: Compass, path: "/discover" },
    { id: "deals", label: "Deals", icon: Handshake, path: "/deals" },
    { id: "portfolio", label: "Portfolio", icon: Briefcase, path: "/portfolio" },
  ], []);

  const bottomNav: NavItem[] = useMemo(() => [
    { id: "alerts", label: "Alerts", icon: Bell, path: "/alerts", badge: unreadCount ?? 0 },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
    { id: "help", label: "Help", icon: HelpCircle, path: "/help" },
    ...(isAdminOrPartner ? [{ id: "admin", label: "Admin", icon: ShieldCheck, path: "/admin" }] : []),
  ], [unreadCount, isAdminOrPartner]);

  const isActive = (path: string) => {
    if (path === "/deals") return location.pathname === "/deals" || location.pathname.startsWith("/deals/");
    if (path === "/settings") return location.pathname === "/settings" || location.pathname === "/account";
    if (path === "/discover") return location.pathname === "/discover";
    return location.pathname.startsWith(path);
  };

  const renderLink = (item: NavItem) => {
    const active = isActive(item.path);
    const link = (
      <NavLink
        key={item.id}
        to={item.path}
        end={false}
        className={`group relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
          active
            ? "bg-primary/8 text-primary font-medium"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-[1px]"
        }`}
        onClick={onNavigate}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
        )}
        <item.icon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-primary" : ""}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {(item.badge ?? 0) > 0 && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-medium flex items-center justify-center px-1">
            {item.badge}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <aside className={`${collapsed ? "w-14" : "w-56"} shrink-0 border-r border-border/40 bg-sidebar flex flex-col h-screen sticky top-0 transition-all duration-300`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-border/30 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-grape/4 to-transparent pointer-events-none" />
        <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-grape to-grape/80 flex items-center justify-center shrink-0 shadow-[0_0_16px_hsl(var(--brand-purple)/0.5),0_2px_8px_hsl(0_0%_0%/0.3)]">
          <span className="text-xs font-bold text-grape-foreground font-display">GV</span>
        </div>
        {!collapsed && (
          <span className="relative text-sm font-semibold text-foreground tracking-tight font-display">Grapevine</span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {mainNav.map(renderLink)}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {bottomNav.map(renderLink)}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronLeft className="h-4 w-4 shrink-0" />}
          {!collapsed && <span className="truncate">Collapse</span>}
        </button>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
