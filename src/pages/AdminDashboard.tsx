import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Users, Mail, TrendingUp, Clock, Filter, Search, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const INTEREST_COLORS: Record<string, string> = {
  "M&A Advisory": "bg-violet-500/15 text-violet-400 border-violet-500/20",
  "Direct Investing": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Fund Management": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Real Estate": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "Distressed Assets": "bg-red-500/15 text-red-400 border-red-500/20",
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterInterest, setFilterInterest] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Check admin role
  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
      return data?.role ?? "analyst";
    },
    enabled: !!user,
  });

  // Fetch waitlist signups
  const { data: signups, isLoading } = useQuery({
    queryKey: ["admin-waitlist", filterInterest, searchTerm, page],
    queryFn: async () => {
      let query = supabase.from("waitlist_signups").select("*", { count: "exact" }).order("created_at", { ascending: false });

      if (filterInterest !== "all") {
        query = query.eq("interest", filterInterest);
      }
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,firm.ilike.%${searchTerm}%`);
      }

      query = query.range((page - 1) * pageSize, page * pageSize - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
    },
    enabled: !!user && (role === "admin" || role === "partner"),
  });

  // Aggregate stats
  const { data: stats } = useQuery({
    queryKey: ["admin-waitlist-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("waitlist_signups").select("*", { count: "exact", head: true });
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase.from("waitlist_signups").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo);
      const { data: interests } = await supabase.from("waitlist_signups").select("interest");
      const interestMap: Record<string, number> = {};
      (interests ?? []).forEach((r) => {
        if (r.interest) interestMap[r.interest] = (interestMap[r.interest] ?? 0) + 1;
      });
      return { total: total ?? 0, thisWeek: recentCount ?? 0, byInterest: interestMap };
    },
    enabled: !!user && (role === "admin" || role === "partner"),
  });

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-[400px] text-muted-foreground text-sm">Loading...</div>;
  }

  if (role !== "admin" && role !== "partner") {
    return <Navigate to="/dashboard" replace />;
  }

  const totalPages = Math.ceil((signups?.total ?? 0) / pageSize);
  const interestOptions = Object.keys(stats?.byInterest ?? {});

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Sales & Operations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Waitlist management, lead qualification & conversion tracking</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Total Signups</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.total ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">This Week</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.thisWeek ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Mail className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Top Interest</span>
          </div>
          <p className="text-sm font-semibold text-foreground truncate">
            {Object.entries(stats?.byInterest ?? {}).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Interests</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{interestOptions.length}</p>
        </div>
      </div>

      {/* Interest breakdown */}
      {stats?.byInterest && Object.keys(stats.byInterest).length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Interest Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byInterest).sort(([, a], [, b]) => b - a).map(([interest, count]) => (
              <button
                key={interest}
                onClick={() => setFilterInterest(filterInterest === interest ? "all" : interest)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterInterest === interest
                    ? "ring-1 ring-primary"
                    : ""
                } ${INTEREST_COLORS[interest] ?? "bg-accent text-accent-foreground border-border"}`}
              >
                {interest}
                <span className="font-mono">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or firm..."
            className="w-full h-9 pl-9 pr-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {filterInterest !== "all" && (
          <button onClick={() => setFilterInterest("all")} className="text-xs text-primary hover:underline">
            Clear filter
          </button>
        )}
      </div>

      {/* Signups table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Firm</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interest</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signed Up</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-muted/40 rounded animate-pulse" /></td></tr>
                ))
              ) : signups?.data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No signups match your criteria</td></tr>
              ) : signups?.data.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.email}</td>
                  <td className="px-4 py-3 text-foreground">{s.firm ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    {s.interest ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${INTEREST_COLORS[s.interest] ?? "bg-accent text-accent-foreground border-border"}`}>
                        {s.interest}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    <span title={format(new Date(s.created_at), "PPpp")}>
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${s.email}?subject=Welcome%20to%20Laurenzo's%20Grapevine&body=Hi%20${encodeURIComponent(s.name)},%0A%0AThank%20you%20for%20your%20interest%20in%20Grapevine.%20We'd%20love%20to%20schedule%20a%20demo%20to%20show%20you%20our%20platform.`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {signups?.total ?? 0} total · Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="h-7 w-7 rounded-md border border-border flex items-center justify-center disabled:opacity-30 hover:bg-secondary transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="h-7 w-7 rounded-md border border-border flex items-center justify-center disabled:opacity-30 hover:bg-secondary transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
