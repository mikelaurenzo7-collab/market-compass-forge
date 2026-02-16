import { useState } from "react";
import { Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Mail, TrendingUp, Clock, Search, ChevronLeft, ChevronRight,
  Handshake, CheckCircle, XCircle, MessageSquare, Building2, Database,
} from "lucide-react";
import IngestionDashboard from "@/components/IngestionDashboard";
import AdminDataCoverage from "@/components/AdminDataCoverage";
import { formatDistanceToNow, format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const INTEREST_COLORS: Record<string, string> = {
  "M&A Advisory": "bg-violet-500/15 text-violet-400 border-violet-500/20",
  "Direct Investing": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Fund Management": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Real Estate": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "Distressed Assets": "bg-red-500/15 text-red-400 border-red-500/20",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pending", color: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: Mail },
  connected: { label: "Connected", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  declined: { label: "Declined", color: "bg-red-500/15 text-red-400 border-red-500/20", icon: XCircle },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterInterest, setFilterInterest] = useState<string>("all");
  const [introStatusFilter, setIntroStatusFilter] = useState<string>("pending");
  const [page, setPage] = useState(1);
  const [introPage, setIntroPage] = useState(1);
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
      if (filterInterest !== "all") query = query.eq("interest", filterInterest);
      if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,firm.ilike.%${searchTerm}%`);
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
    },
    enabled: !!user && (role === "admin" || role === "partner"),
  });

  // Waitlist stats
  const { data: stats } = useQuery({
    queryKey: ["admin-waitlist-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("waitlist_signups").select("*", { count: "exact", head: true });
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await supabase.from("waitlist_signups").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo);
      const { data: interests } = await supabase.from("waitlist_signups").select("interest");
      const interestMap: Record<string, number> = {};
      (interests ?? []).forEach((r) => { if (r.interest) interestMap[r.interest] = (interestMap[r.interest] ?? 0) + 1; });
      return { total: total ?? 0, thisWeek: recentCount ?? 0, byInterest: interestMap };
    },
    enabled: !!user && (role === "admin" || role === "partner"),
  });

  // Fetch intro requests (admin sees all)
  const { data: introRequests, isLoading: introsLoading } = useQuery({
    queryKey: ["admin-intro-requests", introStatusFilter, introPage],
    queryFn: async () => {
      let query = supabase.from("intro_requests").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (introStatusFilter !== "all") query = query.eq("status", introStatusFilter);
      query = query.range((introPage - 1) * pageSize, introPage * pageSize - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
    },
    enabled: !!user && (role === "admin" || role === "partner"),
  });

  // Intro request stats
  const { data: introStats } = useQuery({
    queryKey: ["admin-intro-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("intro_requests").select("*", { count: "exact", head: true });
      const { count: pending } = await supabase.from("intro_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: connected } = await supabase.from("intro_requests").select("*", { count: "exact", head: true }).eq("status", "connected");
      return { total: total ?? 0, pending: pending ?? 0, connected: connected ?? 0 };
    },
    enabled: !!user && (role === "admin" || role === "partner"),
  });

  // Update intro status mutation
  const updateIntroStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("intro_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Request marked as ${status}`);
      queryClient.invalidateQueries({ queryKey: ["admin-intro-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-intro-stats"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-[400px] text-muted-foreground text-sm">Loading...</div>;
  }

  if (role !== "admin" && role !== "partner") {
    return <Navigate to="/dashboard" replace />;
  }

  const totalPages = Math.ceil((signups?.total ?? 0) / pageSize);
  const introTotalPages = Math.ceil((introRequests?.total ?? 0) / pageSize);
  const interestOptions = Object.keys(stats?.byInterest ?? {});

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-semibold text-foreground">Sales & Operations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage leads, intro requests & deal flow approvals</p>
      </motion.div>

      <Tabs defaultValue="intros" className="space-y-6">
        <TabsList>
          <TabsTrigger value="intros" className="gap-2">
            <Handshake className="h-3.5 w-3.5" />
            Intro Requests
            {(introStats?.pending ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{introStats?.pending}</Badge>
            )}
          </TabsTrigger>
           <TabsTrigger value="waitlist" className="gap-2">
            <Users className="h-3.5 w-3.5" />
            Waitlist
          </TabsTrigger>
          <TabsTrigger value="ingestion" className="gap-2">
            <Database className="h-3.5 w-3.5" />
            Data Pipelines
          </TabsTrigger>
          <TabsTrigger value="coverage" className="gap-2">
            <Shield className="h-3.5 w-3.5" />
            Data Coverage
          </TabsTrigger>
        </TabsList>

        {/* ─── INTRO REQUESTS TAB ─── */}
        <TabsContent value="intros" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Handshake, label: "Total Requests", value: introStats?.total ?? 0 },
              { icon: Clock, label: "Pending", value: introStats?.pending ?? 0 },
              { icon: CheckCircle, label: "Connected", value: introStats?.connected ?? 0 },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" animate="visible" className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <s.icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {["all", "pending", "submitted", "connected", "declined"].map((s) => (
              <button
                key={s}
                onClick={() => { setIntroStatusFilter(s); setIntroPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                  introStatusFilter === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {/* Intro requests table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entity</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requested</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {introsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted/40 rounded animate-pulse" /></td></tr>
                    ))
                  ) : introRequests?.data.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No intro requests found</td></tr>
                  ) : (
                    <AnimatePresence>
                      {introRequests?.data.map((r) => {
                        const statusConf = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
                        return (
                          <motion.tr
                            key={r.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="hover:bg-secondary/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{r.entity_name}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground capitalize">
                                <Building2 className="h-3 w-3" />
                                {r.entity_type.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                              {r.message ? (
                                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 shrink-0" />{r.message}</span>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusConf.color}`}>
                                <statusConf.icon className="h-3 w-3" />
                                {statusConf.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              <span title={format(new Date(r.created_at), "PPpp")}>
                                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {r.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => updateIntroStatus.mutate({ id: r.id, status: "connected" })}
                                      disabled={updateIntroStatus.isPending}
                                    >
                                      <CheckCircle className="h-3 w-3" /> Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => updateIntroStatus.mutate({ id: r.id, status: "declined" })}
                                      disabled={updateIntroStatus.isPending}
                                    >
                                      <XCircle className="h-3 w-3" /> Decline
                                    </Button>
                                  </>
                                )}
                                {r.status === "connected" && <span className="text-xs text-emerald-400">✓ Done</span>}
                                {r.status === "declined" && <span className="text-xs text-red-400">Declined</span>}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
            {introTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{introRequests?.total ?? 0} total · Page {introPage} of {introTotalPages}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setIntroPage(Math.max(1, introPage - 1))} disabled={introPage === 1} className="h-7 w-7 rounded-md border border-border flex items-center justify-center disabled:opacity-30 hover:bg-secondary transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setIntroPage(Math.min(introTotalPages, introPage + 1))} disabled={introPage === introTotalPages} className="h-7 w-7 rounded-md border border-border flex items-center justify-center disabled:opacity-30 hover:bg-secondary transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── WAITLIST TAB ─── */}
        <TabsContent value="waitlist" className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Users, label: "Total Signups", value: stats?.total ?? 0 },
              { icon: TrendingUp, label: "This Week", value: stats?.thisWeek ?? 0 },
              { icon: Mail, label: "Top Interest", value: Object.entries(stats?.byInterest ?? {}).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—", isText: true },
              { icon: Clock, label: "Interests", value: interestOptions.length },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" animate="visible" className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <s.icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                <p className={`font-bold text-foreground ${s.isText ? "text-sm truncate" : "text-2xl"}`}>{s.value}</p>
              </motion.div>
            ))}
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
                      filterInterest === interest ? "ring-1 ring-primary" : ""
                    } ${INTEREST_COLORS[interest] ?? "bg-accent text-accent-foreground border-border"}`}
                  >
                    {interest}
                    <span className="font-mono">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
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
              <button onClick={() => setFilterInterest("all")} className="text-xs text-primary hover:underline">Clear filter</button>
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
                          href={`mailto:${s.email}?subject=Welcome%20to%20Grapevine&body=Hi%20${encodeURIComponent(s.name)},%0A%0AThank%20you%20for%20your%20interest%20in%20Grapevine.%20We'd%20love%20to%20schedule%20a%20demo%20to%20show%20you%20our%20platform.`}
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
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{signups?.total ?? 0} total · Page {page} of {totalPages}</span>
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
        </TabsContent>

        {/* ─── INGESTION PIPELINES TAB ─── */}
        <TabsContent value="ingestion" className="space-y-4">
          <IngestionDashboard />
        </TabsContent>

        {/* ─── DATA COVERAGE TAB ─── */}
        <TabsContent value="coverage" className="space-y-4">
          <AdminDataCoverage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
