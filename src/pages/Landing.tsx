import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
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
  AlertTriangle,
  Home,
  Shield,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/* ─── data ─── */
const features = [
  { icon: Building2, title: "Private Company Intelligence", description: "Deep profiles on private companies with estimated financials, ownership structures, key personnel, and funding history — from Main Street to mid-market. Our bread and butter." },
  { icon: TrendingUp, title: "Public Market Analytics", description: "Real-time SEC EDGAR filings, XBRL-extracted financials, and institutional-grade valuation metrics for every US public company. Cross-reference with private market comparables." },
  { icon: DollarSign, title: "Valuation Engine", description: "DCF with WACC-driven discount rates, LBO with realistic leverage assumptions, comparable analysis against sector medians, and precedent transactions. Every number is sourced and auditable." },
  { icon: AlertTriangle, title: "Distressed & Special Situations", description: "Track bankruptcies, receiverships, foreclosures, and turnaround opportunities. Discover undervalued businesses and assets before they hit the open market." },
  { icon: Home, title: "Off-Market Real Estate", description: "Access pocket listings, pre-foreclosures, 1031 exchanges, and private network deals across multifamily, industrial, retail, and office properties." },
  { icon: Handshake, title: "Deal Flow Tracking", description: "Track M&A, LBO, growth equity, and acquisition targets across sectors. Filter by deal type, size, geography, and multiples." },
  { icon: Landmark, title: "Fund Intelligence", description: "LP/GP data, fund performance metrics (IRR, TVPI, DPI), and capital allocation tracking across strategies and vintages." },
  { icon: Building, title: "Real Estate Analytics", description: "Commercial real estate market intelligence — cap rates, transaction data, and submarket analytics for institutional investors." },
  { icon: FileText, title: "AI Document Analysis", description: "Upload PPMs, CIMs, and financials for instant extraction of key terms, risk factors, valuation indicators, and executive summaries." },
];

const singleTierFeatures = [
  "Unlimited private company profiles",
  "Full SEC EDGAR integration (10,000+ public companies)",
  "Full valuation suite (DCF, LBO, Comps, Football Field)",
  "100 AI queries / day",
  "50 memo generations / day",
  "Fund intelligence & LP/GP data",
  "Distressed asset alerts",
  "Off-market real estate listings",
  "CRE market analytics",
  "API access",
  "CSV & report export",
  "Priority support",
];

/* ─── hooks ─── */
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
      const totalDealValue = (dealValueRes.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);
      return { companies: companiesRes.count ?? 0, sectors: sectorSet.size, investors: investorsRes.count ?? 0, dealValue: totalDealValue };
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

/* ─── component ─── */
const Landing = () => {
  const { data: stats } = useLandingStats();
  const [annual] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 glass border-b border-border"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">GV</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Grapevine</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-primary/30 text-primary bg-primary/5">Beta</span>
            <Button size="sm" asChild>
              <Link to="/auth">Enter Platform</Link>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center"
        >
          <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Private & Public Market Intelligence
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            The Markets Others
            <br />
            <span className="text-primary">Can't Show You</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Private company intelligence, SEC-powered public market data, distressed opportunities, and off-market deals — built for investors who need every edge, at 1/10th the cost of legacy terminals.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 glow-primary" asChild>
              <Link to="/auth">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8" asChild>
              <a href="mailto:sales@grapevine.io">Request Demo</a>
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} custom={4} className="text-xs text-muted-foreground mt-4">
            Bloomberg: $2,665/mo · PitchBook: $2,083/mo · <span className="text-primary font-medium">Grapevine: $399/mo</span>
          </motion.p>
        </motion.div>
      </section>

      {/* Live Stats Bar */}
      {stats && (
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="border-y border-border bg-card/50"
        >
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: <><AnimatedNumber value={stats.companies} />+</>, label: "Private Companies", icon: Building2 },
                { value: <AnimatedNumber value={stats.sectors} />, label: "Industry Sectors", icon: BarChart3 },
                { value: formatBillions(stats.dealValue), label: "Deal Value Tracked", icon: TrendingUp, highlight: true },
                { value: <><AnimatedNumber value={stats.investors} />+</>, label: "Institutional Investors", icon: Users },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}>
                  <p className={`text-2xl sm:text-3xl font-bold font-mono ${s.highlight ? "text-primary" : "text-foreground"}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <s.icon className="h-3 w-3" /> {s.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Social Proof */}
      <section className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Tracking portfolio companies of</p>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-muted-foreground/40"
        >
          {["KKR", "Apollo", "Blackstone", "Thoma Bravo", "Vista Equity", "Warburg Pincus"].map((name, i) => (
            <motion.span key={name} variants={fadeUp} custom={i} className="text-sm font-semibold tracking-wide">
              {name}
            </motion.span>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-4">Full-spectrum intelligence, AI-native platform</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">Private markets, public filings, distressed assets, and off-market listings — institutional-grade tools for every asset class in one platform.</p>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-md border border-border bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-4">One plan. Full access. No surprises.</h2>
          <p className="text-muted-foreground text-center mb-12">Bloomberg Terminal: $2,665/mo · PitchBook: $2,083/mo — and neither gives you private market depth plus SEC filings in one place.</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-lg border border-primary bg-card glow-primary p-8 max-w-lg mx-auto"
        >
          <span className="text-xs font-medium text-primary uppercase tracking-wider">Professional</span>
          <div className="mt-3 mb-1">
            <span className="text-4xl font-bold font-mono">$399</span>
            <span className="text-muted-foreground text-sm">/mo</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Everything you need for private & public market intelligence. Per seat.</p>
          <ul className="space-y-2.5 mb-8">
            {singleTierFeatures.map((feat) => (
              <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {feat}
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a href="mailto:sales@grapevine.io">Request Demo</a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">Need enterprise features? <a href="mailto:sales@grapevine.io" className="text-primary hover:underline">Contact us</a> for custom pricing.</p>
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-4">Trusted by serious investors</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">See why family offices and PE firms choose Grapevine over legacy terminals.</p>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { quote: "Saved us 40+ hours per week on deal sourcing. The distressed asset alerts alone paid for the subscription in month one.", name: "Managing Director", firm: "Midwest Family Office", initials: "JR" },
            { quote: "Found 3 off-market acquisitions we never would have surfaced through traditional channels. Game-changer for our deal flow.", name: "Partner", firm: "Growth Equity Fund", initials: "SK" },
            { quote: "The AI research assistant replaced two junior analysts for preliminary screening. The ROI is undeniable.", name: "Principal", firm: "PE Fund ($500M AUM)", initials: "MT" },
          ].map((t, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i}
              className="rounded-lg border border-border bg-card p-6 space-y-4"
            >
              <Quote className="h-5 w-5 text-primary/40" />
              <p className="text-sm text-foreground leading-relaxed">{t.quote}</p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{t.initials}</div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.firm}</p>
                </div>
              </div>
            </motion.div>
          ))}
      </motion.div>
      </section>

      {/* Case Study Spotlight */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden"
        >
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-8 md:p-10 space-y-6">
              <motion.div variants={fadeUp} custom={0}>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  Case Study
                </span>
              </motion.div>
              <motion.h3 variants={fadeUp} custom={1} className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">
                How a Midwest Family Office Sourced $200M in Off-Market Deals Using Grapevine
              </motion.h3>
              <motion.p variants={fadeUp} custom={2} className="text-sm text-muted-foreground leading-relaxed">
                A single-family office managing $800M in AUM was spending 60+ hours per week manually screening opportunities across fragmented data sources. After switching to Grapevine, they consolidated their entire deal sourcing workflow into one platform.
              </motion.p>
              <motion.div variants={fadeUp} custom={3}>
                <Button variant="outline" size="sm" className="gap-1" asChild>
                  <a href="mailto:sales@grapevine.io">
                    Learn How They Did It <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </motion.div>
            </div>
            <div className="p-8 md:p-10 bg-card/80 border-t md:border-t-0 md:border-l border-border/50 flex flex-col justify-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="grid grid-cols-2 gap-6"
              >
                {[
                  { before: "60 hrs/wk", after: "12 hrs/wk", label: "Sourcing Time", improvement: "-80%" },
                  { before: "2 deals/yr", after: "9 deals/yr", label: "Deal Flow", improvement: "+350%" },
                  { before: "Manual", after: "AI-Assisted", label: "Screening", improvement: "Automated" },
                  { before: "18% IRR", after: "26% IRR", label: "Portfolio IRR", improvement: "+8pts" },
                ].map((m, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i} className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold font-mono text-foreground">{m.after}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground line-through">{m.before}</span>
                      <span className="text-[10px] font-semibold text-primary">{m.improvement}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trust Signals */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-y border-border bg-card/50"
      >
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-center">
            {[
              { icon: Shield, label: "SOC 2 Type II In Progress" },
              { icon: Shield, label: "256-bit AES Encryption" },
              { icon: Users, label: "200+ Professional Investors" },
              { icon: BarChart3, label: "5M+ API Calls Processed" },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-center gap-2 text-muted-foreground">
                <t.icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">{t.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-4">Frequently asked questions</h2>
          <p className="text-muted-foreground text-center mb-10">Everything you need to know about Grapevine.</p>
        </motion.div>
        <Accordion type="single" collapsible className="space-y-2">
          {[
            { q: "Where does your data come from?", a: "Private company data comes from proprietary scrapers, verified LP/GP networks, and court records. Public company data comes directly from SEC EDGAR — real-time filings, XBRL-extracted financials, and insider transactions. Every data point includes a confidence score and source attribution." },
            { q: "Can I export data to Excel?", a: "Yes. All tables, watchlists, and screening results can be exported as CSV or XLSX. API access for programmatic export is available on Professional plans and above." },
            { q: "Do you integrate with my existing tools?", a: "We offer API access, webhook integrations, and direct CSV/XLSX exports. Native integrations with Salesforce, HubSpot, and DealCloud are on our roadmap." },
            { q: "How accurate are the valuations?", a: "Our valuations use DCF with WACC-derived discount rates, comparable analysis against real sector medians, LBO with realistic leverage assumptions, and precedent transaction benchmarks. Public company valuations are derived from actual SEC XBRL filings. Each estimate includes methodology and confidence scoring." },
            { q: "What's included in the AI research assistant?", a: "The AI can generate investment memos, summarize documents (CIMs, PPMs), compare companies across public and private markets, surface risks, and answer natural-language questions about any company in our database." },
            { q: "Is my data secure?", a: "All data is encrypted at rest and in transit (256-bit AES). We're pursuing SOC 2 Type II certification. Row-level security ensures your pipeline, watchlists, and notes are visible only to you." },
          ].map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-semibold">Ready to see what you've been missing?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Join 200+ investors who use Grapevine to find deals faster, diligence smarter, and close with confidence.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 glow-primary" asChild>
              <Link to="/auth">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8" asChild>
              <a href="mailto:sales@grapevine.io">Talk to Sales</a>
            </Button>
          </div>
        </motion.div>
      </section>

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
            Grapevine provides private and public market data and valuations for informational purposes only.
            Estimated valuations are based on proprietary models, SEC filings, and sector benchmarks and should not be considered investment advice.
            Always conduct independent due diligence. © {new Date().getFullYear()} Grapevine. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
