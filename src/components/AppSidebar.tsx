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

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const modules = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "deals", label: "Deal Flow", icon: TrendingUp },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "screening", label: "Screening", icon: Search },
  { id: "research", label: "Research", icon: FileText },
  { id: "people", label: "People", icon: Users },
];

const bottomModules = [
  { id: "alerts", label: "Alerts", icon: Bell, badge: 3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const AppSidebar = ({ activeModule, onModuleChange }: SidebarProps) => {
  return (
    <aside className="w-16 lg:w-56 shrink-0 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="hidden lg:block text-sm font-semibold text-foreground tracking-tight">
          Meridian
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => onModuleChange(m.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
              activeModule === m.id
                ? "bg-accent text-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <m.icon className="h-4 w-4 shrink-0" />
            <span className="hidden lg:block truncate">{m.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {bottomModules.map((m) => (
          <button
            key={m.id}
            onClick={() => onModuleChange(m.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors relative ${
              activeModule === m.id
                ? "bg-accent text-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <m.icon className="h-4 w-4 shrink-0" />
            <span className="hidden lg:block truncate">{m.label}</span>
            {"badge" in m && m.badge && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-medium flex items-center justify-center px-1">
                {m.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
};

export default AppSidebar;
