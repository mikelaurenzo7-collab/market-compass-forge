import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  Globe,
  Handshake,
  Sparkles,
  DollarSign,
  Search,
  Rss,
  Activity,
  Building,
  AlertTriangle,
  Landmark,
  Bell,
  Star,
  Settings,
  ShieldCheck,
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

interface NavGroup {
  label: string;
  items: { id: string; label: string; icon: typeof LayoutDashboard; path: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Command Center",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    ],
  },
  {
    label: "Markets",
    items: [
      { id: "companies", label: "Private Markets", icon: Building2, path: "/companies" },
      { id: "public-markets", label: "Public Markets", icon: TrendingUp, path: "/public-markets" },
      { id: "global", label: "Global Markets", icon: Globe, path: "/global" },
    ],
  },
  {
    label: "Deal Engine",
    items: [
      { id: "deals", label: "Deal Flow", icon: Handshake, path: "/deals" },
      { id: "deal-matcher", label: "AI Deal Matcher", icon: Sparkles, path: "/deal-matcher" },
      { id: "valuations", label: "Valuations", icon: DollarSign, path: "/valuations" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "research", label: "Research & AI", icon: Search, path: "/research" },
      { id: "intelligence", label: "Intelligence Feed", icon: Rss, path: "/intelligence" },
      { id: "sector-pulse", label: "Sector Pulse", icon: Activity, path: "/sector-pulse" },
    ],
  },
  {
    label: "Alternatives",
    items: [
      { id: "real-estate", label: "Real Estate", icon: Building, path: "/real-estate" },
      { id: "distressed", label: "Distressed Assets", icon: AlertTriangle, path: "/distressed" },
      { id: "fund-intel", label: "Fund Intelligence", icon: Landmark, path: "/fund-intelligence" },
    ],
  },
];

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

  const isActive = (path: string) =>
    path === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(path);

  const bottomItems = [
    { id: "alerts", label: "Alerts", icon: Bell, path: "/alerts", badge: unreadCount ?? 0 },
    { id: "watchlists", label: "Watchlists", icon: Star, path: "/watchlists" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
    ...(isAdminOrPartner ? [{ id: "admin", label: "Admin", icon: ShieldCheck, path: "/admin" }] : []),
  ];

  const renderLink = (item: { id: string; label: string; icon: typeof LayoutDashboard; path: string; badge?: number }) => {
    const active = isActive(item.path);
    const link = (
      <NavLink
        key={item.id}
        to={item.path}
        end={item.path === "/dashboard"}
        className={`group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-200 ${
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
        {"badge" in item && (item.badge ?? 0) > 0 && (
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
    <aside className={`${collapsed ? "w-14" : "w-56"} shrink-0 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0 transition-all duration-200`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-border">
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0 shadow-[0_0_12px_hsl(var(--primary)/0.3)]">
          <span className="text-xs font-bold text-primary-foreground">GV</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-foreground tracking-tight">Grapevine</span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-1">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {/* Glow separator between groups */}
            {gi > 0 && (
              <div className="mx-3 my-2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            )}
            {!collapsed && (
              <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                <span className="h-1 w-1 rounded-full bg-primary/50" />
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
                  {group.label}
                </p>
              </div>
            )}
            {collapsed && gi > 0 && (
              <div className="flex justify-center py-1">
                <span className="h-1 w-1 rounded-full bg-primary/40" />
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => renderLink(item))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {bottomItems.map((item) => renderLink(item as any))}
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
