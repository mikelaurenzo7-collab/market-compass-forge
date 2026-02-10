import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Zap,
  MessageSquare,
  FileText,
  Kanban,
  Search,
  Bell,
  ShieldCheck,
  ArrowRight,
  Check,
  Building2,
  Users,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageSquare,
    title: "AI Research Chat",
    description:
      "Ask questions about any company and get sourced, contextual answers powered by real-time web data.",
  },
  {
    icon: FileText,
    title: "Investment Memo Generator",
    description:
      "Generate institutional-quality memos with financials, risks, and recommendations in seconds.",
  },
  {
    icon: Kanban,
    title: "Deal Pipeline",
    description:
      "Track opportunities through your workflow with a drag-and-drop Kanban board and task management.",
  },
  {
    icon: Search,
    title: "Screening & Comparison",
    description:
      "Filter companies by sector, stage, and financials. Compare side-by-side with normalized metrics.",
  },
  {
    icon: Bell,
    title: "Real-Time Alerts",
    description:
      "Set custom triggers on funding rounds, revenue changes, or news events and get notified instantly.",
  },
  {
    icon: ShieldCheck,
    title: "Data Provenance",
    description:
      "Every data point shows its source, scrape date, and confidence score so you can trust what you see.",
  },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Explore the platform",
    features: [
      "10 AI queries / day",
      "3 memos / day",
      "5 enrichments / day",
      "Full screening suite",
      "CSV export",
    ],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/mo",
    description: "For active deal sourcing",
    features: [
      "100 AI queries / day",
      "25 memos / day",
      "50 enrichments / day",
      "Priority data refresh",
      "API access",
      "Webhook integrations",
    ],
    cta: "Start Pro Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams & institutions",
    features: [
      "Unlimited everything",
      "Dedicated support",
      "Custom integrations",
      "SSO & RBAC",
      "SLA guarantee",
      "On-prem option",
    ],
    cta: "Request Demo",
    highlight: false,
  },
];

const useLandingStats = () =>
  useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [companiesRes, sectorsRes, investorsRes, dealValueRes] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("sector").not("sector", "is", null),
        supabase.from("investors").select("id", { count: "exact", head: true }),
        supabase.from("funding_rounds").select("amount").not("amount", "is", null),
      ]);
      const sectorSet = new Set((sectorsRes.data ?? []).map((r) => r.sector));
      const totalDealValue = (dealValueRes.data ?? []).reduce(
        (sum, r) => sum + (r.amount ?? 0),
        0
      );
      return {
        companies: companiesRes.count ?? 0,
        sectors: sectorSet.size,
        investors: investorsRes.count ?? 0,
        dealValue: totalDealValue,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

const formatBillions = (n: number) => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T+`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(0)}B+`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M+`;
  return `$${n.toLocaleString()}`;
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{display.toLocaleString()}</>;
};

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: stats } = useLandingStats();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Grapevine
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.18),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_80%_50%,hsl(var(--primary)/0.06),transparent)]" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Market Intelligence Platform
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            AI-Powered Intelligence for
            <br />
            <span className="text-primary">Private & Public Markets</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            The only platform that combines private deal intelligence with public market data — built for emerging managers who need Bloomberg-level insight without the Bloomberg price tag.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 glow-primary" asChild>
              <Link to="/auth">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8" asChild>
              <a href="mailto:sales@grapevine.io">Request Demo</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      {stats && (
        <section className="border-y border-border bg-card/50">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                  <AnimatedNumber value={stats.companies} />+
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Building2 className="h-3 w-3" /> Companies Tracked
                </p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                  <AnimatedNumber value={stats.sectors} />
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <BarChart3 className="h-3 w-3" /> Sectors Covered
                </p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-primary">
                  {formatBillions(stats.dealValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Deal Value Tracked
                </p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                  <AnimatedNumber value={stats.investors} />+
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" /> Investors Mapped
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Tracking companies backed by
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-muted-foreground/40">
          {["Sequoia", "Andreessen Horowitz", "Lightspeed", "General Catalyst", "Benchmark"].map(
            (name) => (
              <span key={name} className="text-sm font-semibold tracking-wide">
                {name}
              </span>
            )
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-4">
          Everything you need to source smarter
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          From initial screening to IC memo, Grapevine covers your entire deal
          workflow.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-6 transition-lift"
            >
              <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-muted-foreground text-center mb-12">
          Start free. Upgrade when you're ready.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-lg border p-6 flex flex-col ${
                t.highlight
                  ? "border-primary bg-card glow-primary"
                  : "border-border bg-card"
              }`}
            >
              {t.highlight && (
                <span className="text-xs font-medium text-primary mb-3 uppercase tracking-wider">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{t.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t.description}
              </p>
              <div className="mb-6">
                <span className="text-3xl font-bold">{t.price}</span>
                <span className="text-muted-foreground text-sm">
                  {t.period}
                </span>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {t.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Button
                variant={t.highlight ? "default" : "outline"}
                className="w-full"
                asChild
              >
                {t.name === "Enterprise" ? (
                  <a href="mailto:sales@grapevine.io">{t.cta}</a>
                ) : (
                  <Link to="/auth">{t.cta}</Link>
                )}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            © {new Date().getFullYear()} Grapevine Market Intelligence. For
            informational purposes only — not investment advice.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="hover:text-foreground transition-colors cursor-default">Privacy</span>
            <span className="hover:text-foreground transition-colors cursor-default">Terms</span>
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
