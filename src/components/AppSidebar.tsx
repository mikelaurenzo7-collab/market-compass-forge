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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const modules = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "companies", label: "Companies", icon: Building2, path: "/companies" },
  { id: "deals", label: "Deal Flow", icon: TrendingUp, path: "/deals" },
  { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
  { id: "screening", label: "Screening", icon: Search, path: "/screening" },
  { id: "research", label: "Research", icon: FileText, path: "/research" },
  { id: "people", label: "People", icon: Users, path: "/people" },
];

const bottomModules = [
  { id: "alerts", label: "Alerts", icon: Bell, path: "/alerts", badge: 3 },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
];

const AppSidebar = () => {
  const location = useLocation();

  const linkClass = (path: string) => {
    const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
    return `w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive
        ? "bg-accent text-accent-foreground font-medium"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;
  };

  return (
    <aside className="w-16 lg:w-56 shrink-0 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="hidden lg:block text-sm font-semibold text-foreground tracking-tight">
          Laurenzo's
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {modules.map((m) => (
          <NavLink
            key={m.id}
            to={m.path}
            end={m.path === "/"}
            className={linkClass(m.path)}
          >
            <m.icon className="h-4 w-4 shrink-0" />
            <span className="hidden lg:block truncate">{m.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {bottomModules.map((m) => (
          <NavLink
            key={m.id}
            to={m.path}
            className={`${linkClass(m.path)} relative`}
          >
            <m.icon className="h-4 w-4 shrink-0" />
            <span className="hidden lg:block truncate">{m.label}</span>
            {"badge" in m && m.badge && (
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
