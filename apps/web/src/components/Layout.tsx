"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FlaskConical,
  Network,
  FileText,
  Activity,
  Gauge,
  Cpu,
  Route,
  ChevronLeft,
  LogOut,
  Sparkles,
} from "lucide-react";

const navGroups = [
  {
    label: "Core",
    items: [
      { href: "/portfolios", label: "Portfolios", icon: LayoutDashboard },
      { href: "/simulations", label: "Simulation Lab", icon: FlaskConical },
      { href: "/graph", label: "Graph Explorer", icon: Network },
      { href: "/deals", label: "Deal Scoring", icon: FileText },
    ],
  },
  {
    label: "Demo & Insights",
    items: [
      { href: "/demo", label: "NVIDIA Demo", icon: Sparkles },
      { href: "/activity", label: "Activity", icon: Activity },
      { href: "/benchmarks", label: "Benchmarks", icon: Gauge },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/system", label: "System", icon: Cpu },
      { href: "/roadmap/gpu", label: "GPU Roadmap", icon: Route },
    ],
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, setOrgId } = useAuth();

  return (
    <div className="min-h-screen mesh-bg">
      <aside className="fixed left-0 top-0 z-50 h-screen w-64 glass border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link href="/portfolios" className="flex items-center gap-2">
            <span className="text-xl font-bold gradient-text">Grapevine</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Intelligence Engine</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          {user?.orgs && user.orgs.length > 1 && (
            <select
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {user.orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  Org: {o.id.slice(0, 8)}...
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <span className="truncate">{user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
      <main className="ml-64 min-h-screen p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
