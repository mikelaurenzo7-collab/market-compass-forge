import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle, Mail, Sparkles } from "lucide-react";

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
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <span className="text-sm font-bold text-primary-foreground">GV</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Grapevine</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/auth")}
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          Sign In <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
        <motion.div initial="hidden" animate="visible" className="space-y-6 w-full">
          <motion.div custom={0} variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-primary/30 text-primary bg-primary/5">
              <Sparkles className="h-3 w-3" />
              Coming Soon
            </span>
          </motion.div>

          <motion.h1 custom={1} variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            The unfair advantage
            <br />
            <span className="text-primary">for private markets.</span>
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            AI-powered deal intelligence, real-time market data, and institutional-grade analytics — built for investors who move first.
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

          {/* Waitlist form */}
          <motion.div custom={4} variants={fadeUp} className="max-w-md mx-auto w-full pt-4">
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
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
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
