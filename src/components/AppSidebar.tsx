import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  BarChart3,
  Search,
  Bell,
  FileText,
  Settings,
  Zap,
  DollarSign,
  Handshake,
  Landmark,
  Building,
  Rss,
  Star,
  ChevronLeft,
  ChevronRight,
  FileSearch,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useUnreadCount } from "@/hooks/useUnreadCount";

const mainModules = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "companies", label: "Private Companies", icon: Building2, path: "/companies" },
  { id: "valuations", label: "Valuations", icon: DollarSign, path: "/valuations" },
  { id: "deals", label: "Deal Flow", icon: Handshake, path: "/deals" },
  { id: "fund-intel", label: "Fund Intelligence", icon: Landmark, path: "/fund-intelligence" },
  { id: "real-estate", label: "Real Estate Intel", icon: Building, path: "/real-estate" },
];

const insightModules = [
  { id: "research", label: "Research & AI", icon: Search, path: "/research" },
  { id: "documents", label: "Document Analyzer", icon: FileSearch, path: "/documents" },
  { id: "intelligence", label: "Intelligence Feed", icon: Rss, path: "/intelligence" },
  { id: "watchlists", label: "Watchlists", icon: Star, path: "/watchlists" },
];

const AppSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const { data: unreadCount } = useUnreadCount();
  const [collapsed, setCollapsed] = useState(false);

  const linkClass = (path: string) => {
    const isActive = path === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(path);
    return `w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive
        ? "bg-accent text-accent-foreground font-medium"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;
  };

  const bottomModules = [
    { id: "alerts", label: "Alerts", icon: Bell, path: "/alerts", badge: unreadCount ?? 0 },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  const SectionLabel = ({ children }: { children: string }) => (
    collapsed ? null : (
      <p className="px-3 pt-4 pb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">{children}</p>
    )
  );

  const renderLinks = (modules: typeof mainModules) =>
    modules.map((m) => (
      <NavLink key={m.id} to={m.path} end={m.path === "/dashboard"} className={linkClass(m.path)} onClick={onNavigate}>
        <m.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{m.label}</span>}
      </NavLink>
    ));

  return (
    <aside className={`${collapsed ? "w-14" : "w-56"} shrink-0 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0 transition-all duration-200`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-border">
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary-foreground">LG</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-foreground tracking-tight">Grapevine</span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5">
        <SectionLabel>Platform</SectionLabel>
        {renderLinks(mainModules)}
        <SectionLabel>Insights</SectionLabel>
        {renderLinks(insightModules)}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {bottomModules.map((m) => (
          <NavLink key={m.id} to={m.path} className={`${linkClass(m.path)} relative`} onClick={onNavigate}>
            <m.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{m.label}</span>}
            {"badge" in m && m.badge > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-medium flex items-center justify-center px-1">
                {m.badge}
              </span>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronLeft className="h-4 w-4 shrink-0" />}
          {!collapsed && <span className="truncate">Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
