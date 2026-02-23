"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";

const navItems = [
  { href: "/portfolios", label: "Portfolios" },
  { href: "/simulations", label: "Simulation Lab" },
  { href: "/demo", label: "NVIDIA Demo" },
  { href: "/graph", label: "Graph Explorer" },
  { href: "/deals", label: "Deal Scoring" },
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/engine-status", label: "Engine Status" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, setOrgId } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-8">
              <Link href="/portfolios" className="font-semibold text-slate-900">
                Grapevine
              </Link>
              <nav className="flex gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium ${
                      pathname.startsWith(item.href)
                        ? "text-slate-900"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {user?.orgs && user.orgs.length > 1 && (
                <select
                  onChange={(e) => setOrgId(e.target.value)}
                  className="text-sm border border-slate-300 rounded px-2 py-1"
                >
                  {user.orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      Org: {o.id.slice(0, 8)}...
                    </option>
                  ))}
                </select>
              )}
              <span className="text-sm text-slate-600">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
