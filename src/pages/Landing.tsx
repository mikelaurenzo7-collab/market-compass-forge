import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardMetrics, formatCurrency } from "@/hooks/useData";
import {
  CheckCircle, Mail, ArrowRight, FlaskConical, Shield, Zap, Brain, BarChart3,
  FileText, Globe, ChevronRight, Lock, AlertTriangle, Briefcase, Building,
  Loader2, Search, MessageSquare, PieChart, TrendingUp, Target, BookOpen
} from "lucide-react";
import grapeLogo from "@/assets/grape-logo.png";

/* ── Animations ── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const pulseGlow = {
  initial: { scale: 1, opacity: 0.6 },
  animate: {
    scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },
};

/* ── Data ── */
const INTERESTS = [
  "Deal Sourcing & Screening",
  "Due Diligence Automation",
  "IC Workflow & Coordination",
  "Capital Allocation Tracking",
  "Portfolio Reporting",
  "Full Platform",
  "Other",
];

const LIFECYCLE_STEPS = [
  {
    icon: Search,
    verb: "Discover",
    title: "Surface the signal",
    description: "AI-powered deal sourcing across distressed, CRE, and PE opportunities. Buy-box matching. Morning briefings. Surface rooms worth opening.",
    color: "#10b981",
  },
  {
    icon: FileText,
    verb: "Diligence",
    title: "Underwrite with structure",
    description: "Upload docs, extract metrics, flag risks. DCF, comps, and football fields — all scoped to the deal room. Every deal gets a structured package.",
    color: "hsl(var(--brand-purple))",
  },
  {
    icon: MessageSquare,
    verb: "Coordinate",
    title: "Decide as a team",
    description: "IC notes, decision journal, threaded comments, proceed/pass voting. No more email chains — everything lives in the room.",
    color: "#10b981",
  },
  {
    icon: PieChart,
    verb: "Allocate",
    title: "Deploy capital",
    description: "Track equity, debt, and mezzanine commitments. Ownership percentages, commitment dates, source tracking. When capital is wired, it gets logged.",
    color: "hsl(var(--brand-purple))",
  },
  {
    icon: TrendingUp,
    verb: "Report",
    title: "Measure what matters",
    description: "Thesis vs. actuals. Original IC memo linked to current performance. The institutional memory layer of your firm.",
    color: "#10b981",
  },
];

const DIFFERENTIATORS = [
  {
    icon: Target,
    title: "The Deal Room",
    description: "Every opportunity becomes a lifecycle workspace — from first signal to final wire. Summary, diligence, valuation, discussion, timeline, allocation, and updates in one place.",
  },
  {
    icon: BookOpen,
    title: "Decision Memory",
    description: "Every stage change, every IC vote, every rationale — logged automatically. Your firm builds pattern recognition across hundreds of deals, not just the ones partners remember.",
  },
  {
    icon: Shield,
    title: "Data Provenance",
    description: "Every data point traced to source with confidence scoring. SEC EDGAR, FRED, FMP, Firecrawl, and user uploads — all verified, all auditable. No black boxes.",
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", firm: "", interest: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: metrics } = useDashboardMetrics();
  const { data: liveCounts } = useQuery({
    queryKey: ["landing-live-counts"],
    queryFn: async () => {
      const [companiesRes, distressedRes] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }).or("market_type.eq.private,market_type.is.null"),
        supabase.from("distressed_assets").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      return { companiesCount: companiesRes.count ?? 0, distressedCount: distressedRes.count ?? 0 };
    },
    staleTime: 60_000,
  });

  // Redirect authenticated users to deals dashboard
  if (!authLoading && user) {
    return <Navigate to="/deals" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("waitlist_signups").insert({
        name: form.name, email: form.email, firm: form.firm || null, interest: form.interest || null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error("Waitlist error:", err);
      const { toast } = await import("sonner");
      toast.error("Something went wrong. Please try again or email us at contact@grapevine.io");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,hsl(var(--brand-purple)/0.14),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_80%,hsl(var(--primary)/0.08),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_20%_70%,hsl(var(--brand-purple)/0.06),transparent)]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
      </div>

      <motion.div variants={pulseGlow} initial="initial" animate="animate"
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[hsl(var(--brand-purple)/0.08)] blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3 opacity-0 animate-[fadeIn_0.6s_ease_forwards_0.3s]">
          <div className="h-9 w-9 rounded-lg bg-[hsl(var(--brand-purple))] flex items-center justify-center shadow-lg shadow-[hsl(var(--brand-purple)/0.3)] overflow-hidden">
            <img src={grapeLogo} alt="Grapevine" className="h-6 w-6 object-contain" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Grapevine</span>
          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-primary/30 text-primary bg-primary/5">
            <FlaskConical className="h-3 w-3" /> BETA
          </span>
        </div>
        <div className="flex items-center gap-4 opacity-0 animate-[fadeIn_0.6s_ease_forwards_0.5s]">
          <button onClick={() => navigate("/discover")} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-flex">
            Platform
          </button>
          <button onClick={() => navigate("/auth")}
            className="text-xs font-medium text-foreground bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1">
            <Lock className="h-3 w-3" /> Beta Login
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-28 pb-16 max-w-3xl mx-auto text-center">
        <motion.div initial="hidden" animate="visible" className="space-y-8 flex flex-col items-center">
          <motion.div custom={0} variants={fadeUp}>
            <div className="relative">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-[hsl(var(--brand-purple))] flex items-center justify-center shadow-2xl shadow-[hsl(var(--brand-purple)/0.4)] overflow-hidden">
                  <img src={grapeLogo} alt="Grapevine" className="h-14 w-14 sm:h-16 sm:w-16 object-contain" />
                </div>
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-[hsl(var(--brand-purple)/0.25)] blur-xl absolute top-4 left-0 -z-10" />
            </div>
          </motion.div>

          <motion.div custom={1} variants={fadeUp} className="space-y-4">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[0.9]">
              The system where<br />
              <span className="text-glow text-primary">capital gets deployed.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              From signal to signed wire. One platform for the entire capital lifecycle.
              The private markets operating system for PE firms, family offices, and CRE acquirers.
            </p>
          </motion.div>

          {/* Lifecycle breadcrumb */}
          <motion.div custom={2} variants={fadeUp} className="w-full max-w-xl">
            <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
              {LIFECYCLE_STEPS.map((step, i) => (
                <div key={step.verb} className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: step.color }}>{step.verb}</span>
                  {i < LIFECYCLE_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Live metrics */}
          <motion.div custom={3} variants={fadeUp} className="w-full max-w-lg">
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: formatCurrency(metrics?.totalDealValue ?? 0), label: "Deal Flow Tracked", icon: BarChart3 },
                { value: String(liveCounts?.companiesCount ?? 0), label: "Companies", icon: Building },
                { value: String(liveCounts?.distressedCount ?? 0), label: "Active Signals", icon: AlertTriangle },
                { value: String(metrics?.totalRounds ?? 0), label: "Funding Rounds", icon: Briefcase },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border/40 bg-card/40 backdrop-blur-sm p-3 text-center space-y-1">
                  <s.icon className="h-3.5 w-3.5 text-primary mx-auto" />
                  <p className="text-base sm:text-lg font-black text-primary font-mono tracking-tight leading-tight">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground/70 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Waitlist */}
          <motion.div custom={4} variants={fadeUp} className="w-full max-w-sm">
            {submitted ? (
              <div className="rounded-2xl border border-primary/30 bg-card/80 backdrop-blur-sm p-8 text-center space-y-3 shadow-xl shadow-primary/5">
                <CheckCircle className="h-10 w-10 text-primary mx-auto" />
                <p className="text-sm font-semibold text-foreground">You're on the list!</p>
                <p className="text-xs text-muted-foreground">
                  We'll reach out to <span className="text-foreground">{form.email}</span> when your invite is ready.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 space-y-3 text-left shadow-xl">
                <p className="text-sm font-semibold text-foreground text-center mb-2">Request Early Access</p>
                <Input placeholder="Your name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-background/60 border-border/60" />
                <Input type="email" placeholder="you@firm.com *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-background/60 border-border/60" />
                <Input placeholder="Firm (optional)" value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} className="bg-background/60 border-border/60" />
                <Select value={form.interest} onValueChange={(v) => setForm({ ...form, interest: v })}>
                  <SelectTrigger className="bg-background/60 border-border/60"><SelectValue placeholder="Primary interest (optional)" /></SelectTrigger>
                  <SelectContent>{INTERESTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
                <button type="submit" disabled={loading || !form.name || !form.email}
                  className="w-full h-11 rounded-lg bg-gradient-to-r from-[hsl(var(--brand-purple))] to-primary text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[hsl(var(--brand-purple)/0.25)] hover:shadow-xl hover:shadow-[hsl(var(--brand-purple)/0.35)]">
                  <Mail className="h-4 w-4" />
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Joining...</> : "Join the Waitlist"}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* ── CAPITAL LIFECYCLE ── */}
      <section className="relative z-10 px-6 py-20 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="text-center mb-14">
          <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-semibold mb-2">The Capital Lifecycle</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Five verbs. One system.
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
            Replace your fragmented stack of Excel, email, and Dropbox with one operating system that owns the decision from first signal to final wire.
          </p>
        </motion.div>

        <div className="space-y-4">
          {LIFECYCLE_STEPS.map((step, i) => (
            <motion.div key={step.verb} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 sm:p-6 hover:border-primary/30 hover:bg-card/80 transition-all duration-300 flex items-start gap-5">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors" style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}>
                <step.icon className="h-5 w-5" style={{ color: step.color }} />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: step.color }}>{step.verb}</span>
                  <span className="h-px flex-1 bg-border/40" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── DIFFERENTIATORS ── */}
      <section className="relative z-10 px-6 py-16 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Why firms switch to Grapevine</h2>
          <p className="text-sm text-muted-foreground mt-1">The infrastructure your existing tools can't replicate</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DIFFERENTIATORS.map((d, i) => (
            <motion.div key={d.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <d.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{d.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{d.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section className="relative z-10 px-6 py-16 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Built for dealmakers</h2>
          <p className="text-sm text-muted-foreground mt-1">PE partners, family office analysts, and growth equity VPs</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              persona: "PE Partner",
              pain: "40% of my week goes to sourcing instead of portfolio value creation",
              solution: "AI Deal Matcher surfaces relevant opportunities weekly, pre-scored. The Deal Room handles diligence-to-wire in one workspace.",
            },
            {
              persona: "Family Office Analyst",
              pain: "I juggle 6 tools for screening, research, and due diligence",
              solution: "One workspace: discover → diligence → valuation → IC vote → allocation. Every decision logged. Every thesis tracked.",
            },
            {
              persona: "Growth Equity VP",
              pain: "Our institutional memory lives in email threads and partner recollections",
              solution: "Decision journal with every stage change, vote, and rationale. Pattern recognition across your entire deal history, not just the wins.",
            },
          ].map((p, i) => (
            <motion.div key={p.persona} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">{p.persona}</p>
              <p className="text-sm text-foreground font-medium leading-relaxed">"{p.pain}"</p>
              <div className="flex items-start gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{p.solution}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── DATA PROVENANCE ── */}
      <section className="relative z-10 px-6 py-16 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 text-center space-y-6">
          <div className="space-y-2">
            <Shield className="h-6 w-6 text-primary mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Institutional-Grade Data Provenance</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Every data point traced to source with confidence scoring, verification status, and freshness tracking. No black boxes.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {["SEC EDGAR", "FRED", "FMP", "Firecrawl", "User Uploads"].map((src) => (
              <span key={src} className="text-[11px] font-mono text-primary/60 border border-primary/20 rounded-md px-3 py-1.5 bg-primary/5">{src}</span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto text-center">
            {[
              { label: "Source Types", value: "5" },
              { label: "Confidence Tiers", value: "3" },
              { label: "Audit Trail", value: "Full" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-lg font-black font-mono text-foreground">{s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative z-10 px-6 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Stop chasing deals.<br />
            <span className="text-primary">Start deploying capital.</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            The private markets operating system. Limited beta spots remaining.
          </p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[hsl(var(--brand-purple))] to-primary text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-[hsl(var(--brand-purple)/0.25)]">
            <Mail className="h-4 w-4" /> Request Access <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-border/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground/40">
          <span>© {new Date().getFullYear()} Grapevine · Private Markets Operating System</span>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/discover")} className="hover:text-muted-foreground transition-colors">Platform</button>
            <button onClick={() => navigate("/terms")} className="hover:text-muted-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-muted-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate("/help")} className="hover:text-muted-foreground transition-colors">Help</button>
            <button onClick={() => navigate("/auth")} className="hover:text-muted-foreground transition-colors">Beta Login</button>
          </div>
        </div>
      </footer>

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
};

export default Landing;
