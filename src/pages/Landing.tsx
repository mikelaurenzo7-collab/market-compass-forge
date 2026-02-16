import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Mail, Sparkles, ArrowRight, FlaskConical } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const pulseGlow = {
  initial: { scale: 1, opacity: 0.6 },
  animate: {
    scale: [1, 1.15, 1],
    opacity: [0.6, 1, 0.6],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },
};

const INTERESTS = [
  "Fund Intelligence",
  "Real Estate Intel",
  "AI Research",
  "Document Analysis",
  "Deal Flow Tracking",
  "Company Screening",
  "Other",
];

const Landing = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", firm: "", interest: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setLoading(true);
    try {
      await supabase.from("waitlist_signups").insert({
        name: form.name,
        email: form.email,
        firm: form.firm || null,
        interest: form.interest || null,
      });
    } catch (err) {
      console.error("Waitlist error:", err);
    }
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden flex flex-col items-center justify-center relative">
      {/* Layered ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,hsl(var(--brand-purple)/0.14),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_80%,hsl(var(--primary)/0.08),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_20%_70%,hsl(var(--brand-purple)/0.06),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_30%,hsl(var(--primary)/0.05),transparent)]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
      </div>

      {/* Floating orbs — purple and green */}
      <motion.div
        variants={pulseGlow}
        initial="initial"
        animate="animate"
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[hsl(var(--brand-purple)/0.08)] blur-[120px] pointer-events-none"
      />
      <motion.div
        variants={pulseGlow}
        initial="initial"
        animate="animate"
        className="absolute top-1/3 left-[60%] -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[hsl(var(--primary)/0.06)] blur-[100px] pointer-events-none"
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3 opacity-0 animate-[fadeIn_0.6s_ease_forwards_0.3s]">
          <div className="h-9 w-9 rounded-lg bg-[hsl(var(--brand-purple))] flex items-center justify-center shadow-lg shadow-[hsl(var(--brand-purple)/0.3)]">
            <span className="text-sm font-bold text-white">GV</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Grapevine</span>
          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border border-primary/30 text-primary bg-primary/5">
            <FlaskConical className="h-3 w-3" />
            BETA
          </span>
        </div>
        <button
          onClick={() => navigate("/auth")}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 opacity-0 animate-[fadeIn_0.6s_ease_forwards_0.5s]"
        >
          Beta Login <ArrowRight className="h-3 w-3" />
        </button>
      </nav>

      {/* Hero */}
      <motion.div
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center px-6 max-w-2xl text-center space-y-8"
      >
        {/* Logo mark */}
        <motion.div custom={0} variants={fadeUp}>
          <div className="relative">
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-[hsl(var(--brand-purple))] flex items-center justify-center shadow-2xl shadow-[hsl(var(--brand-purple)/0.4)] mx-auto">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">GV</span>
            </div>
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-[hsl(var(--brand-purple)/0.25)] blur-xl absolute top-4 left-1/2 -translate-x-1/2 -z-10" />
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-primary/15 blur-2xl absolute top-6 left-1/2 -translate-x-1/2 -z-20" />
          </div>
        </motion.div>

        {/* Brand name */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-none"
        >
          Grapevine
        </motion.h1>

        {/* Tagline */}
        <motion.p
          custom={2}
          variants={fadeUp}
          className="text-lg sm:text-xl text-muted-foreground max-w-md leading-relaxed"
        >
          Private & <span className="text-primary font-medium">AI-Powered Intelligence</span> for investors who move first.
        </motion.p>

        {/* Beta badge */}
        <motion.div custom={3} variants={fadeUp}>
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-[hsl(var(--brand-purple)/0.3)] text-[hsl(var(--brand-purple))] bg-[hsl(var(--brand-purple)/0.06)] backdrop-blur-sm shadow-lg shadow-[hsl(var(--brand-purple)/0.1)]">
            <FlaskConical className="h-4 w-4" />
            Beta — Building in Public
          </span>
        </motion.div>

        {/* Waitlist form */}
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
              <Input
                placeholder="Your name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="bg-background/60 border-border/60"
              />
              <Input
                type="email"
                placeholder="you@firm.com *"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="bg-background/60 border-border/60"
              />
              <Input
                placeholder="Firm (optional)"
                value={form.firm}
                onChange={(e) => setForm({ ...form, firm: e.target.value })}
                className="bg-background/60 border-border/60"
              />
              <Select value={form.interest} onValueChange={(v) => setForm({ ...form, interest: v })}>
                <SelectTrigger className="bg-background/60 border-border/60">
                  <SelectValue placeholder="Primary interest (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {INTERESTS.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="submit"
                className="w-full h-11 rounded-lg bg-gradient-to-r from-[hsl(var(--brand-purple))] to-primary text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[hsl(var(--brand-purple)/0.25)] hover:shadow-xl hover:shadow-[hsl(var(--brand-purple)/0.35)]"
                disabled={loading || !form.name || !form.email}
              >
                <Mail className="h-4 w-4" />
                {loading ? "Joining..." : "Join the Waitlist"}
              </button>
            </form>
          )}
        </motion.div>

        {/* Platform stats — honest, labeled as beta */}
        <motion.div custom={5} variants={fadeUp} className="w-full max-w-md">
          <p className="text-[10px] text-muted-foreground/50 text-center mb-2 uppercase tracking-widest">Beta Platform Metrics</p>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { value: "7,800+", label: "Companies Tracked" },
              { value: "45+", label: "Distressed Assets" },
              { value: "AI", label: "Screening (Beta)" },
              { value: "REST", label: "API Access" },
            ].map((s) => (
              <div key={s.label} className="space-y-0.5">
                <p className="text-lg sm:text-xl font-black text-primary font-mono tracking-tight">{s.value}</p>
                <p className="text-[10px] text-muted-foreground/70">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Data sources */}
        <motion.div custom={6} variants={fadeUp} className="flex flex-col items-center gap-2">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium">Powered by</p>
          <div className="flex items-center gap-4">
            {["SEC EDGAR", "FRED", "FMP", "Firecrawl"].map((src) => (
              <span key={src} className="text-[11px] font-mono text-primary/50 border border-primary/20 rounded px-2 py-0.5">{src}</span>
            ))}
          </div>
        </motion.div>

        {/* Transparent beta note — replaces unverifiable testimonial */}
        <motion.div custom={7} variants={fadeUp}>
          <p className="text-xs text-muted-foreground/50 italic">
            Currently in private beta · <button onClick={() => navigate("/data-coverage")} className="underline hover:text-muted-foreground transition-colors">View data coverage →</button>
          </p>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground/40">
          <span>© {new Date().getFullYear()} Grapevine</span>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/data-coverage")} className="hover:text-muted-foreground transition-colors">Data Coverage</button>
            <button onClick={() => navigate("/terms")} className="hover:text-muted-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-muted-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate("/auth")} className="hover:text-muted-foreground transition-colors">Beta Login</button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
