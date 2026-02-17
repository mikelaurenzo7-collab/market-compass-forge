import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Handshake,
  Users,
  Briefcase,
  Building2,
  Globe,
  Building,
  AlertTriangle,
  Landmark,
  Search,
  Rss,
  Activity,
  Bell,
  Settings,
  ShieldCheck,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Upload,
  GitBranch,
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
  icon: typeof Handshake;
  path: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Deals",
    items: [
      { id: "deals-overview", label: "Deals", icon: LayoutDashboard, path: "/deals" },
      { id: "deal-flow", label: "Deal Flow", icon: Handshake, path: "/deals/flow" },
      { id: "recommended", label: "AI Matcher", icon: Sparkles, path: "/deals/recommended" },
    ],
  },
  {
    label: "Rooms & Network",
    items: [
      { id: "rooms", label: "Rooms", icon: Users, path: "/rooms" },
      { id: "network", label: "Network", icon: GitBranch, path: "/network" },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { id: "portfolio", label: "Portfolio", icon: Briefcase, path: "/portfolio" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "companies", label: "Companies", icon: Building2, path: "/companies" },
      { id: "global", label: "Global Markets", icon: Globe, path: "/global" },
      { id: "real-estate", label: "Real Estate", icon: Building, path: "/real-estate" },
      { id: "distressed", label: "Distressed Assets", icon: AlertTriangle, path: "/distressed" },
      { id: "fund-intel", label: "Fund Intelligence", icon: Landmark, path: "/fund-intelligence" },
      { id: "research", label: "Research & AI", icon: Search, path: "/research" },
      { id: "intelligence", label: "Intelligence Feed", icon: Rss, path: "/intelligence" },
      { id: "sector-pulse", label: "Sector Pulse", icon: Activity, path: "/sector-pulse" },
      { id: "data-room", label: "Data Room", icon: Upload, path: "/data-room" },
    ],
  },
];

const AppSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const { data: unreadCount } = useUnreadCount();
  const { signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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

  const isActive = (path: string) => {
    // Exact match for /deals to avoid matching /deals/flow etc.
    if (path === "/deals") return location.pathname === "/deals";
    // For /deals/flow, match /deals/flow exactly
    if (path === "/deals/flow") return location.pathname === "/deals/flow";
    // For /deals/recommended, match /deals/recommended exactly
    if (path === "/deals/recommended") return location.pathname === "/deals/recommended";
    // Exact match for /network
    if (path === "/network") return location.pathname === "/network";
    // For all others, prefix match
    return location.pathname.startsWith(path);
  };

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const bottomItems = [
    { id: "alerts", label: "Alerts", icon: Bell, path: "/alerts", badge: unreadCount ?? 0 },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
    { id: "help", label: "Help", icon: HelpCircle, path: "/help" },
    ...(isAdminOrPartner ? [{ id: "admin", label: "Admin", icon: ShieldCheck, path: "/admin" }] : []),
  ];

  const renderLink = (item: NavItem & { badge?: number }) => {
    const active = isActive(item.path);
    const link = (
      <NavLink
        key={item.id}
        to={item.path}
        end={item.path === "/deals"}
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
    <aside
      className={`${collapsed ? "w-14" : "w-56"} shrink-0 border-r border-border/40 bg-sidebar flex flex-col h-screen sticky top-0 transition-all duration-300`}
      role="navigation"
      aria-label="Main navigation"
    >
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
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-1" aria-label="Primary">
        {NAV_GROUPS.map((group, gi) => {
          const isGroupCollapsed = collapsedGroups[group.label];
          const hasActiveChild = group.items.some((item) => isActive(item.path));

          return (
            <div key={group.label}>
              {gi > 0 && (
                <div className="mx-3 my-2 h-px bg-gradient-to-r from-transparent via-grape/20 to-transparent" />
              )}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center gap-2 px-3 pt-2 pb-1 w-full text-left group/header"
                  aria-expanded={!isGroupCollapsed}
                >
                  <span className={`h-1 w-1 rounded-full ${hasActiveChild ? "bg-primary" : "bg-grape/60"}`} />
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 flex-1">
                    {group.label}
                  </p>
                  <ChevronRight
                    className={`h-3 w-3 text-muted-foreground/40 transition-transform duration-200 ${
                      isGroupCollapsed ? "" : "rotate-90"
                    }`}
                  />
                </button>
              )}
              {collapsed && gi > 0 && (
                <div className="flex justify-center py-1">
                  <span className="h-1 w-1 rounded-full bg-grape/50" />
                </div>
              )}
              {(!isGroupCollapsed || collapsed) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => renderLink(item))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {bottomItems.map((item) => renderLink(item as any))}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
