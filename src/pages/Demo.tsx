import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, Sparkles, Building2, Search, Filter, X, Users,
  TrendingUp, Globe, AlertTriangle, ArrowRight, Target, Zap,
  DollarSign, MapPin, BarChart3, Eye, Lock, Clock
} from "lucide-react";
import CompanyAvatar from "@/components/CompanyAvatar";
import PageTransition from "@/components/PageTransition";
import DisclaimerFooter from "@/components/DisclaimerFooter";
import AmbientGrid from "@/components/AmbientGrid";

/* ── Static sample data ──────────────────────────────────── */

const SAMPLE_COMPANIES = [
  { id: "1", name: "Meridian Health Systems", sector: "Healthcare", description: "AI-powered clinical decision support platform serving 200+ hospital networks across the US.", hq_country: "US", stage: "Growth", employee_count: 480, domain: "meridianhealthsys.com", founded_year: 2017 },
  { id: "2", name: "NovaTerra Energy", sector: "Energy", description: "Next-generation grid-scale battery storage and renewable energy management infrastructure.", hq_country: "US", stage: "Series C", employee_count: 220, domain: "novaterra.energy", founded_year: 2019 },
  { id: "3", name: "Vantage CRE Partners", sector: "Real Estate", description: "Technology-enabled commercial real estate acquisition and asset management platform.", hq_country: "US", stage: "Series B", employee_count: 85, domain: "vantagecre.com", founded_year: 2020 },
  { id: "4", name: "Arcline Financial", sector: "Financial Services", description: "Institutional-grade alternative credit analytics and portfolio construction tools.", hq_country: "UK", stage: "Growth", employee_count: 310, domain: "arclinefinancial.co", founded_year: 2016 },
  { id: "5", name: "Cortex Robotics", sector: "Industrials", description: "Autonomous warehouse fulfillment systems leveraging computer vision and reinforcement learning.", hq_country: "US", stage: "Series B", employee_count: 140, domain: "cortexrobotics.ai", founded_year: 2021 },
  { id: "6", name: "Helix Therapeutics", sector: "Healthcare", description: "CRISPR-based gene therapy platform targeting rare metabolic disorders with 3 programs in Phase II.", hq_country: "US", stage: "Series D", employee_count: 260, domain: "helixtherapeutics.com", founded_year: 2015 },
  { id: "7", name: "Lumina Cloud", sector: "Technology", description: "Edge computing infrastructure for latency-sensitive enterprise workloads across hybrid environments.", hq_country: "US", stage: "Growth", employee_count: 520, domain: "luminacloud.io", founded_year: 2018 },
  { id: "8", name: "Oakbridge Infrastructure", sector: "Infrastructure", description: "Digital infrastructure fund specializing in data center and fiber-optic network investments.", hq_country: "US", stage: "Fund III", employee_count: 45, domain: "oakbridgeinfra.com", founded_year: 2014 },
  { id: "9", name: "Pinnacle Consumer Brands", sector: "Consumer", description: "DTC portfolio company operating premium wellness and lifestyle brands with $180M combined revenue.", hq_country: "US", stage: "Buyout", employee_count: 900, domain: "pinnaclebrands.com", founded_year: 2012 },
];

const SAMPLE_SECTORS = [
  ["Technology", 42], ["Healthcare", 38], ["Financial Services", 31], ["Real Estate", 27],
  ["Energy", 19], ["Consumer", 16], ["Industrials", 14], ["Infrastructure", 11],
] as const;

const SAMPLE_EVENTS = [
  { headline: "Meridian Health raises $120M Series D", type: "funding", time: "2h ago" },
  { headline: "NovaTerra awarded DOE grid modernization grant", type: "regulatory", time: "5h ago" },
  { headline: "Cortex Robotics partners with major 3PL provider", type: "partnership", time: "8h ago" },
  { headline: "Helix Therapeutics Phase II data readout positive", type: "clinical", time: "1d ago" },
];

const SAMPLE_GLOBAL = [
  { name: "Nordic Data Center Portfolio", region: "Europe", value: "$340M", type: "Infrastructure" },
  { name: "SE Asia Fintech Roll-up", region: "Asia-Pacific", value: "$85M", type: "Growth Equity" },
  { name: "UK Renewable Energy Platform", region: "Europe", value: "$220M", type: "Energy Transition" },
];

const SECTORS = ["Technology", "Healthcare", "Financial Services", "Real Estate", "Energy", "Consumer", "Industrials", "Infrastructure"];

/* ── Component ───────────────────────────────────────────── */

const Demo = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const displayCompanies = SAMPLE_COMPANIES.filter((c) => {
    const matchesSearch = searchQuery.length < 2 || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = !sectorFilter || c.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  return (
    <div className="min-h-screen bg-background relative">
      <AmbientGrid />

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/60 backdrop-blur-2xl px-4 sm:px-6 py-3 flex items-center justify-between border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">Grapevine</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Guest Preview</span>
        </div>
        <Link
          to="/auth"
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Lock className="h-3.5 w-3.5" /> Sign Up for Full Access
        </Link>
      </header>

      <PageTransition>
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
          {/* Guest banner */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <Eye className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">You're viewing Grapevine in read-only guest mode</p>
              <p className="text-xs text-muted-foreground mt-1">
                Browse sample companies, market events, and global opportunities. 
                <Link to="/auth" className="text-primary hover:underline ml-1">Create an account</Link> to open deal rooms, track watchlists, and access AI-powered analytics.
              </p>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                Discover
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Surface rooms worth opening.
                <span className="ml-2 text-primary font-mono">47 deals in pipeline</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button disabled className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground/50 cursor-not-allowed flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Pipeline
              </button>
              <button disabled className="h-9 px-4 rounded-md bg-primary/50 text-primary-foreground/70 text-sm font-medium cursor-not-allowed flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI Deal Matcher
              </button>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search companies by name..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2 transition-colors ${showFilters ? "border-primary/30 bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                <Filter className="h-4 w-4" /> Filters
              </button>
            </div>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex flex-wrap gap-2 pb-2">
                    <button onClick={() => setSectorFilter(null)} className={`h-7 px-3 rounded-full text-xs transition-colors ${!sectorFilter ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"}`}>
                      All Sectors
                    </button>
                    {SECTORS.map((s) => (
                      <button key={s} onClick={() => setSectorFilter(sectorFilter === s ? null : s)} className={`h-7 px-3 rounded-full text-xs transition-colors ${sectorFilter === s ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Companies grid */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {searchQuery.length >= 2 ? `Results for "${searchQuery}"` : "Companies"}
              </h2>
              <span className="text-[10px] text-muted-foreground font-mono">{displayCompanies.length} results</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayCompanies.map((company, i) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CompanyAvatar name={company.name} sector={company.sector} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{company.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-muted-foreground">{company.sector}</span>
                          <span className="text-[11px] text-muted-foreground">· {company.hq_country}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{company.description}</p>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{company.stage}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Users className="h-2.5 w-2.5" /> {company.employee_count.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Est. {company.founded_year}</span>
                    <span className="text-[10px] text-primary">{company.domain}</span>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t border-border/50">
                    <Link
                      to="/auth"
                      className="h-7 px-3 rounded-md bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                    >
                      <Lock className="h-3 w-3" /> Sign up to Open Room
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Sidebar-like sections in a grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sector Trends */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" /> Sector Trends
              </h3>
              <div className="space-y-2">
                {SAMPLE_SECTORS.map(([sector, count]) => (
                  <div key={sector} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{sector}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${(count / 42) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Events */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" /> Market Events
              </h3>
              <div className="space-y-3">
                {SAMPLE_EVENTS.map((event, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-foreground leading-relaxed">{event.headline}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {event.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Global Opportunities */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-primary" /> Global Opportunities
              </h3>
              <div className="space-y-3">
                {SAMPLE_GLOBAL.map((opp, i) => (
                  <div key={i} className="rounded-md border border-border/50 p-2.5">
                    <p className="text-xs font-medium text-foreground">{opp.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" /> {opp.region}
                      </span>
                      <span className="text-[10px] text-primary font-mono">{opp.value}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{opp.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Ready to go deeper?</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Create a free account to open deal rooms, run AI-powered diligence, build valuation models, and collaborate with your team.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </PageTransition>

      <DisclaimerFooter />
    </div>
  );
};

export default Demo;
