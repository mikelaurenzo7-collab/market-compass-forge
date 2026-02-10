import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  BarChart3,
  Search,
  Bell,
  Users,
  FileText,
  Settings,
  Zap,
  Share2,
  ArrowLeftRight,
  Lock,
  Globe,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useUnreadCount } from "@/hooks/useUnreadCount";

const marketModules = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "private", label: "Private Markets", icon: Lock, path: "/markets/private" },
  { id: "public", label: "Public Markets", icon: Globe, path: "/markets/public" },
];

const intelligenceModules = [
  { id: "companies", label: "Companies", icon: Building2, path: "/companies" },
  { id: "screening", label: "Screening", icon: Search, path: "/screening" },
  { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
  { id: "research", label: "Research", icon: FileText, path: "/research" },
];

const workflowModules = [
  { id: "deals", label: "Deal Flow", icon: TrendingUp, path: "/deals" },
  { id: "compare", label: "Compare", icon: ArrowLeftRight, path: "/compare" },
  { id: "network", label: "Network", icon: Share2, path: "/network" },
  { id: "people", label: "People", icon: Users, path: "/people" },
];

const AppSidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const { data: unreadCount } = useUnreadCount();

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
    { id: "integrations", label: "Integrations", icon: Zap, path: "/integrations" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  const SectionLabel = ({ children }: { children: string }) => (
    <p className="px-3 pt-4 pb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">{children}</p>
  );

  const renderLinks = (modules: typeof marketModules) =>
    modules.map((m) => (
      <NavLink key={m.id} to={m.path} end={m.path === "/dashboard"} className={linkClass(m.path)} onClick={onNavigate}>
        <m.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{m.label}</span>
      </NavLink>
    ));

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">Grapevine</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5">
        <SectionLabel>Markets</SectionLabel>
        {renderLinks(marketModules)}
        <SectionLabel>Intelligence</SectionLabel>
        {renderLinks(intelligenceModules)}
        <SectionLabel>Workflow</SectionLabel>
        {renderLinks(workflowModules)}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {bottomModules.map((m) => (
          <NavLink key={m.id} to={m.path} className={`${linkClass(m.path)} relative`} onClick={onNavigate}>
            <m.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{m.label}</span>
            {"badge" in m && m.badge > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-medium flex items-center justify-center px-1">
                {m.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </aside>
  );
};

export default AppSidebar;
