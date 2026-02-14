import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle, Mail, Sparkles, Zap, Database, Search, Globe, Shield, BarChart3, TrendingUp, Code, FileText, Building2, AlertTriangle } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const STATS = [
  { value: "7,800+", label: "Companies" },
  { value: "350+", label: "Distressed Assets" },
  { value: "260+", label: "Off-Market Listings" },
  { value: "65+", label: "Funds Tracked" },
];

const FEATURES = [
  { icon: Search, title: "AI-Powered Screening", desc: "Multi-factor company screening with composite scores, saved views, and bulk pipeline adds." },
  { icon: Zap, title: "Alpha Signals", desc: "AI-generated sector signals with confidence scores, directional calls, and macro context." },
  { icon: BarChart3, title: "Valuation Engine", desc: "DCF, comps, precedent transactions, and football field charts — all in one click." },
  { icon: Globe, title: "Global Deal Flow", desc: "Cross-border PE/VC, infrastructure, and sovereign fund opportunities across 40+ countries." },
  { icon: AlertTriangle, title: "Distressed & Off-Market", desc: "350+ distressed assets and 260+ private CRE listings no other platform tracks." },
  { icon: FileText, title: "AI Document Analysis", desc: "Drop in a CIM or 10-K and get extracted metrics, risk factors, and valuation indicators." },
  { icon: Building2, title: "Fund Intelligence", desc: "PE/VC fund benchmarking with IRR, TVPI, DPI, and quartile rankings." },
  { icon: Code, title: "REST API", desc: "14 endpoints, 10K calls/day. Pull data into your models, scripts, and spreadsheets." },
];

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
    <div className="min-h-screen bg-background text-foreground overflow-hidden flex flex-col">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.15),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,hsl(var(--primary)/0.08),transparent)]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <span className="text-sm font-bold text-primary-foreground">GV</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Grapevine</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            Sign In <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
        <motion.div initial="hidden" animate="visible" className="space-y-6 w-full">
          <motion.div custom={0} variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-primary/30 text-primary bg-primary/5">
              <Sparkles className="h-3 w-3" />
              Now in Early Access
            </span>
          </motion.div>

          <motion.h1 custom={1} variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            The unfair advantage
            <br />
            <span className="text-primary">for private markets.</span>
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Everything PitchBook does — at 1/10th the price — plus AI that does the work for you.
            Built for emerging managers who move first.
          </motion.p>

          {/* Stats strip */}
          <motion.div custom={3} variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-xl border border-border overflow-hidden bg-border max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="bg-card px-4 py-3 text-center">
                <p className="text-xl font-bold font-mono text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div custom={4} variants={fadeUp} className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/auth")} size="lg" className="gap-2 shadow-lg shadow-primary/20">
              <Zap className="h-4 w-4" /> Start Free Trial
            </Button>
            <Button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} variant="outline" size="lg" className="gap-2">
              View Pricing <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-10">
          <motion.div custom={0} variants={fadeUp} className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Everything you need to source, analyze, and close deals</h2>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">One platform replaces your Bloomberg terminal, PitchBook subscription, and half your analyst team.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i + 1}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-8">
          <motion.div custom={0} variants={fadeUp} className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Simple, transparent pricing</h2>
            <p className="text-muted-foreground mt-2">No per-seat fees. No data add-ons. Everything included.</p>
          </motion.div>

          <motion.div custom={1} variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Professional */}
            <div className="rounded-xl border-2 border-primary bg-card p-6 space-y-4 relative">
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground">Most Popular</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Professional</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold text-primary">$599</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "7,800+ company profiles",
                  "200 AI queries / day",
                  "100 memo generations / day",
                  "100 company enrichments / day",
                  "REST API (10K calls/day)",
                  "AI deal matcher & screening",
                  "Distressed asset access",
                  "Off-market CRE listings",
                  "Fund benchmarking",
                  "Document analysis",
                  "Email briefings & alerts",
                  "Unlimited team members",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate("/auth")} className="w-full gap-2 shadow-lg shadow-primary/20">
                <Zap className="h-4 w-4" /> Get Started
              </Button>
            </div>

            {/* Enterprise */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Enterprise</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold text-foreground">Custom</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Everything in Professional",
                  "Unlimited AI queries",
                  "1M+ API calls / day",
                  "Custom data integrations",
                  "SSO & SOC 2 compliance",
                  "Dedicated account manager",
                  "Custom deployment options",
                  "Priority support SLA",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href="mailto:sales@grapevine.io?subject=Enterprise%20Inquiry">
                  <Mail className="h-4 w-4" /> Contact Sales
                </a>
              </Button>
            </div>
          </motion.div>

          <motion.p custom={2} variants={fadeUp} className="text-center text-xs text-muted-foreground">
            PitchBook charges $25,000+/yr per seat. Bloomberg Terminal is $24,000/yr. Grapevine gives you both — plus AI — for $599/mo.
          </motion.p>
        </motion.div>
      </section>

      {/* Waitlist form */}
      <section className="relative z-10 max-w-md mx-auto px-6 py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div custom={0} variants={fadeUp}>
            {submitted ? (
              <div className="rounded-xl border border-primary/20 bg-card p-8 text-center space-y-3">
                <CheckCircle className="h-10 w-10 text-primary mx-auto" />
                <p className="text-sm font-semibold text-foreground">You're on the list!</p>
                <p className="text-xs text-muted-foreground">
                  We'll reach out to {form.email} when early access opens.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-3 text-left">
                <p className="text-sm font-semibold text-foreground text-center mb-1">Join the Waitlist</p>
                <Input
                  placeholder="Your name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="bg-background"
                />
                <Input
                  type="email"
                  placeholder="you@firm.com *"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="bg-background"
                />
                <Input
                  placeholder="Firm (optional)"
                  value={form.firm}
                  onChange={(e) => setForm({ ...form, firm: e.target.value })}
                  className="bg-background"
                />
                <Select value={form.interest} onValueChange={(v) => setForm({ ...form, interest: v })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Primary interest (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERESTS.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="submit"
                  className="w-full gap-2 shadow-lg shadow-primary/20"
                  disabled={loading || !form.name || !form.email}
                >
                  <Mail className="h-4 w-4" />
                  {loading ? "Joining..." : "Request Early Access"}
                </Button>
              </form>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
              <span className="text-[8px] font-bold text-primary-foreground">GV</span>
            </div>
            <span>© {new Date().getFullYear()} Grapevine. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Sign In</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
