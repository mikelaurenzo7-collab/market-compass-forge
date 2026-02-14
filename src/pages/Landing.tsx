import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2,
  TrendingUp,
  Shield,
  Globe,
  Sparkles,
  BarChart3,
  ArrowRight,
  Search,
  Zap,
  Lock,
  ChevronRight,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const FEATURES = [
  {
    icon: Building2,
    title: "Private Markets Intelligence",
    desc: "Track 800+ private companies with real funding data, financials, and AI-powered scoring across every stage.",
  },
  {
    icon: BarChart3,
    title: "Real Estate & Alternatives",
    desc: "Off-market CRE listings, distressed assets, and fund performance benchmarks — all in one institutional-grade view.",
  },
  {
    icon: Sparkles,
    title: "AI Research & Memos",
    desc: "Generate investment memos, morning briefings, and alpha signals powered by frontier AI models.",
  },
  {
    icon: Globe,
    title: "Global Deal Flow",
    desc: "Cross-border opportunities from Emerging Asia to LATAM with sovereign fund co-investment data.",
  },
  {
    icon: Search,
    title: "SEC & Public Markets",
    desc: "Real-time XBRL financial facts, 10-K/10-Q filings, and valuation tools for 7,000+ public companies.",
  },
  {
    icon: Shield,
    title: "Deal Workspace",
    desc: "Collaborative war room with pipeline tracking, IC voting, task management, and relationship mapping.",
  },
];

const STATS = [
  { value: "7,800+", label: "Companies Tracked" },
  { value: "260+", label: "Off-Market Listings" },
  { value: "50+", label: "Sectors Covered" },
  { value: "Real-time", label: "SEC & Market Data" },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,hsl(var(--primary)/0.06),transparent)]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
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
            className="text-muted-foreground hover:text-foreground"
          >
            Sign In
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/auth")}
            className="gap-1.5 shadow-lg shadow-primary/20"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 pt-16 md:pt-28 pb-20 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div custom={0} variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-primary/30 text-primary bg-primary/5">
              <Zap className="h-3 w-3" />
              Private Market Intelligence Platform
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
          >
            The unfair advantage
            <br />
            <span className="text-primary">for private markets.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Real-time deal intelligence, AI-powered research, and institutional-grade
            analytics — built for investors who move first.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="flex items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="gap-2 text-base shadow-xl shadow-primary/25 px-8"
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/auth")}
              className="gap-2 text-base px-8"
            >
              <Lock className="h-4 w-4" />
              Request Demo
            </Button>
          </motion.div>

          <motion.p custom={4} variants={fadeUp} className="text-xs text-muted-foreground/60 pt-1">
            No credit card required · SOC 2 compliant · Used by 200+ institutional investors
          </motion.p>
        </motion.div>
      </section>

      {/* Stats bar */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-4xl mx-auto px-6"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-xl border border-border overflow-hidden bg-border">
          {STATS.map((s) => (
            <div key={s.label} className="bg-card px-6 py-5 text-center">
              <p className="text-2xl md:text-3xl font-bold font-mono text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Everything you need,{" "}
            <span className="text-primary">nothing you don't.</span>
          </h2>
          <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto">
            Purpose-built for PE, VC, family offices, and institutional investors.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-primary/[0.03] p-10 md:p-14 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Ready to move faster than the market?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Join the investors already using Grapevine to source deals, generate
            memos, and close with confidence.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="gap-2 px-10 shadow-xl shadow-primary/20"
          >
            Get Started Free
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-[9px] font-bold text-primary-foreground">GV</span>
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
