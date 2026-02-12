import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  FileText,
  Building2,
  Users,
  TrendingUp,
  BarChart3,
  ArrowRight,
  Check,
  DollarSign,
  Handshake,
  Landmark,
  Building,
  Rss,
  Shield,
  AlertTriangle,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Building2,
    title: "Private Company Profiles",
    description:
      "Deep profiles on private companies with estimated financials, ownership structures, key personnel, and funding history — from Main Street to mid-market.",
  },
  {
    icon: AlertTriangle,
    title: "Distressed & Special Situations",
    description:
      "Track bankruptcies, receiverships, foreclosures, and turnaround opportunities. Discover undervalued businesses and assets before they hit the open market.",
  },
  {
    icon: Home,
    title: "Off-Market Real Estate",
    description:
      "Access pocket listings, pre-foreclosures, 1031 exchanges, and private network deals across multifamily, industrial, retail, and office properties.",
  },
  {
    icon: DollarSign,
    title: "Valuation Engine",
    description:
      "DCF, LBO, comparable analysis, and precedent transactions. Interactive tools that update in real-time as you adjust assumptions.",
  },
  {
    icon: Handshake,
    title: "Deal Flow Tracking",
    description:
      "Track M&A, LBO, growth equity, and acquisition targets across sectors. Filter by deal type, size, geography, and multiples.",
  },
  {
    icon: Landmark,
    title: "Fund Intelligence",
    description:
      "LP/GP data, fund performance metrics (IRR, TVPI, DPI), and capital allocation tracking across strategies and vintages.",
  },
  {
    icon: Building,
    title: "Real Estate Analytics",
    description:
      "Commercial real estate market intelligence — cap rates, transaction data, and submarket analytics for institutional investors.",
  },
  {
    icon: FileText,
    title: "AI Document Analysis",
    description:
      "Upload PPMs, CIMs, and financials for instant extraction of key terms, risk factors, valuation indicators, and executive summaries.",
  },
];

const tiers = [
  {
    name: "Analyst",
    price: "$499",
    period: "/mo",
    description: "For individual deal sourcing",
    features: [
      "500 company profiles",
      "Basic valuation tools",
      "Deal flow tracker",
      "25 AI queries / day",
      "CSV export",
      "Email alerts",
    ],
    cta: "Start Trial",
    highlight: false,
  },
  {
    name: "Professional",
    price: "$1,499",
    period: "/mo",
    description: "For active deal teams",
    features: [
      "Unlimited company profiles",
      "Full valuation suite",
      "Fund intelligence access",
      "100 AI queries / day",
      "CRE market data",
      "API access",
      "Priority support",
    ],
    cta: "Start Trial",
    highlight: true,
  },
  {
    name: "Institutional",
    price: "$3,999",
    period: "/mo",
    description: "For firms & institutions",
    features: [
      "Everything in Professional",
      "Unlimited team seats",
      "Custom data feeds",
      "Dedicated account manager",
      "Deal room collaboration",
      "White-label reports",
      "SLA guarantee",
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
  const navigate = useNavigate();
  const { data: stats } = useLandingStats();
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">GV</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Grapevine
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-primary/30 text-primary bg-primary/5">
              Beta
            </span>
            <Button size="sm" asChild>
              <Link to="/auth">Enter Platform</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Private Market Intelligence Platform
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            What Bloomberg Can't Tell You
            <br />
            <span className="text-primary">About Private Markets</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Private company data, distressed opportunities, off-market deals, and fund intelligence — built for wealthy individuals, family offices, and institutional investors at 1/10th the cost of legacy terminals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 glow-primary" asChild>
              <Link to="/auth">
                Start Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8" asChild>
              <a href="mailto:sales@grapevine.io">Request Demo</a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Bloomberg: $2,665/mo · PitchBook: $2,083/mo · <span className="text-primary font-medium">Grapevine: from $499/mo</span>
          </p>
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
                  <Building2 className="h-3 w-3" /> Private Companies
                </p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                  <AnimatedNumber value={stats.sectors} />
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <BarChart3 className="h-3 w-3" /> Industry Sectors
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
                  <Users className="h-3 w-3" /> Institutional Investors
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Tracking portfolio companies of
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-muted-foreground/40">
          {["KKR", "Apollo", "Blackstone", "Thoma Bravo", "Vista Equity", "Warburg Pincus"].map(
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
          Institutional-grade intelligence, AI-native platform
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          From deal sourcing to IC memo — distressed assets, off-market listings, and private company intelligence in one platform.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-md border border-border bg-card p-6 transition-lift"
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
          Transparent pricing for every team size
        </h2>
        <p className="text-muted-foreground text-center mb-4">
          Bloomberg Terminal: $2,665/mo — and they don't even cover private markets.
        </p>
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-11 h-6 rounded-full transition-colors ${annual ? "bg-primary" : "bg-secondary"}`}
          >
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-foreground transition-transform ${annual ? "left-6" : "left-1"}`} />
          </button>
          <span className={`text-sm ${annual ? "text-foreground" : "text-muted-foreground"}`}>Annual <span className="text-primary text-xs font-medium">Save 20%</span></span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t) => {
            const monthlyNum = parseInt(t.price.replace(/[^0-9]/g, ""));
            const displayPrice = annual && monthlyNum ? `$${Math.round(monthlyNum * 0.8).toLocaleString()}` : t.price;
            return (
              <div
                key={t.name}
                className={`rounded-md border p-6 flex flex-col ${
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
                  <span className="text-3xl font-bold font-mono">{displayPrice}</span>
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
                  {t.name === "Institutional" ? (
                    <a href="mailto:sales@grapevine.io">{t.cta}</a>
                  ) : (
                    <Link to="/auth">{t.cta}</Link>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <span className="text-[8px] font-bold text-primary-foreground">GV</span>
              </div>
              <span className="text-xs font-semibold">Grapevine</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href="mailto:careers@grapevine.io" className="hover:text-foreground transition-colors">Careers</a>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <a href="mailto:contact@grapevine.io" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center sm:text-left leading-relaxed">
            Grapevine provides private market data and valuations for informational purposes only.
            Estimated valuations are based on proprietary models and should not be considered investment advice.
            Always conduct independent due diligence. © {new Date().getFullYear()} Grapevine. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;