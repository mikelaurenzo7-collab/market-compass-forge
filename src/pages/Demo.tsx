import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, Sparkles, Building2, Search, Filter, X, Users,
  TrendingUp, Globe, AlertTriangle, ArrowRight, Target, Zap,
  DollarSign, MapPin, BarChart3, Eye, Lock, Clock,
  FileText, MessageSquare, PieChart, CheckCircle, XCircle, GitBranch
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

const DEMO_TABS = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "dealroom", label: "Deal Room", icon: Target },
  { id: "valuation", label: "Valuation", icon: BarChart3 },
] as const;

type DemoTab = typeof DEMO_TABS[number]["id"];

/* ── Deal Room Preview Data ──────────────────────────────── */

const DEAL_ROOM_TABS = ["Summary", "Diligence", "Valuation", "Discussion", "Timeline", "Allocation", "Updates"];

const SAMPLE_DEAL = {
  company: "Meridian Health Systems",
  sector: "Healthcare",
  stage: "ic_review",
  thesis: "AI clinical decision support is a $12B TAM growing 25% YoY. Meridian has the strongest hospital network penetration with 200+ signed contracts and 94% renewal rate. The management team has prior exits at Optum and Epic.",
  metrics: [
    { label: "ARR", value: "$42M" },
    { label: "Growth", value: "68% YoY" },
    { label: "Gross Margin", value: "82%" },
    { label: "NRR", value: "128%" },
  ],
  team: [
    { name: "Sarah Chen", role: "Deal Lead" },
    { name: "Michael Torres", role: "Analyst" },
    { name: "Elena Volkov", role: "IC Member" },
  ],
  votes: [
    { user: "Sarah Chen", vote: "proceed", comment: "Strong unit economics, clear path to $100M ARR" },
    { user: "Elena Volkov", vote: "proceed", comment: "Management team is best-in-class for health IT" },
    { user: "Michael Torres", vote: "proceed", comment: "Comps support 15-18x forward revenue" },
  ],
  timeline: [
    { date: "Jan 15", action: "Deal sourced via morning briefing", type: "sourced" },
    { date: "Jan 22", action: "Initial screening completed", type: "screening" },
    { date: "Feb 1", action: "Management meeting scheduled", type: "diligence" },
    { date: "Feb 10", action: "IC memo submitted", type: "ic_review" },
    { date: "Feb 14", action: "IC vote: 3/3 proceed", type: "vote" },
  ],
};

/* ── Valuation Preview Data ──────────────────────────────── */

const SAMPLE_COMPS = [
  { name: "Veeva Systems", evRevenue: "14.2x", evEbitda: "32.1x", growth: "18%", margin: "38%" },
  { name: "Health Catalyst", evRevenue: "5.8x", evEbitda: "N/A", growth: "22%", margin: "-8%" },
  { name: "Phreesia", evRevenue: "8.1x", evEbitda: "N/A", growth: "28%", margin: "-12%" },
  { name: "Evolent Health", evRevenue: "2.9x", evEbitda: "18.4x", growth: "35%", margin: "8%" },
  { name: "Inovalon", evRevenue: "7.5x", evEbitda: "22.8x", growth: "15%", margin: "33%" },
];

const VALUATION_RANGES = [
  { method: "DCF (Base)", low: 580, mid: 720, high: 890, color: "bg-primary" },
  { method: "Comp Multiples", low: 630, mid: 780, high: 950, color: "bg-success" },
  { method: "Precedent Txns", low: 550, mid: 690, high: 840, color: "bg-[hsl(var(--brand-purple))]" },
  { method: "LBO Floor", low: 480, mid: 520, high: 580, color: "bg-warning" },
];

/* ── Component ───────────────────────────────────────────── */

const Demo = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<DemoTab>("discover");
  const [dealRoomTab, setDealRoomTab] = useState("Summary");

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
                Browse sample data across Discover, Deal Room, and Valuation views.
                <Link to="/auth" className="text-primary hover:underline ml-1">Create an account</Link> for full access.
              </p>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center gap-1 border-b border-border">
            {DEMO_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── DISCOVER TAB ─────────────────────────────── */}
          {activeTab === "discover" && (
            <div className="space-y-6">
              {/* Search + Filters */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1 max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search companies by name..."
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors" />
                    {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
                  </div>
                  <button onClick={() => setShowFilters(!showFilters)} className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2 transition-colors ${showFilters ? "border-primary/30 bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                    <Filter className="h-4 w-4" /> Filters
                  </button>
                </div>
                <AnimatePresence>
                  {showFilters && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-2 pb-2">
                        <button onClick={() => setSectorFilter(null)} className={`h-7 px-3 rounded-full text-xs transition-colors ${!sectorFilter ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>All</button>
                        {SECTORS.map((s) => (
                          <button key={s} onClick={() => setSectorFilter(sectorFilter === s ? null : s)} className={`h-7 px-3 rounded-full text-xs transition-colors ${sectorFilter === s ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>{s}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Companies grid */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Companies</h2>
                  <span className="text-[10px] text-muted-foreground font-mono">{displayCompanies.length} results</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayCompanies.map((company, i) => (
                    <motion.div key={company.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all group">
                      <div className="flex items-center gap-2.5 mb-2">
                        <CompanyAvatar name={company.name} sector={company.sector} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{company.name}</p>
                          <span className="text-[11px] text-muted-foreground">{company.sector} · {company.hq_country}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{company.description}</p>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{company.stage}</span>
                        <span className="text-[10px] text-muted-foreground"><Users className="h-2.5 w-2.5 inline mr-0.5" />{company.employee_count.toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground">Est. {company.founded_year}</span>
                      </div>
                      <div className="flex items-center justify-end pt-2 border-t border-border/50">
                        <Link to="/auth" className="h-7 px-3 rounded-md bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5">
                          <Lock className="h-3 w-3" /> Sign up to Open Room
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Sidebar widgets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-primary" /> Sector Trends</h3>
                  <div className="space-y-2">
                    {SAMPLE_SECTORS.map(([sector, count]) => (
                      <div key={sector} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{sector}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-primary/60" style={{ width: `${(count / 42) * 100}%` }} /></div>
                          <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><Zap className="h-4 w-4 text-primary" /> Market Events</h3>
                  <div className="space-y-3">
                    {SAMPLE_EVENTS.map((event, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div><p className="text-xs text-foreground leading-relaxed">{event.headline}</p><p className="text-[10px] text-muted-foreground mt-0.5"><Clock className="h-2.5 w-2.5 inline mr-0.5" />{event.time}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><Globe className="h-4 w-4 text-primary" /> Global Opportunities</h3>
                  <div className="space-y-3">
                    {SAMPLE_GLOBAL.map((opp, i) => (
                      <div key={i} className="rounded-md border border-border/50 p-2.5">
                        <p className="text-xs font-medium text-foreground">{opp.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground"><MapPin className="h-2.5 w-2.5 inline mr-0.5" />{opp.region}</span>
                          <span className="text-[10px] text-primary font-mono">{opp.value}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{opp.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── DEAL ROOM TAB ────────────────────────────── */}
          {activeTab === "dealroom" && (
            <div className="space-y-4">
              {/* Deal header */}
              <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <CompanyAvatar name={SAMPLE_DEAL.company} sector={SAMPLE_DEAL.sector} />
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{SAMPLE_DEAL.company}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{SAMPLE_DEAL.sector}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">IC Review</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {SAMPLE_DEAL.team.map((t) => (
                      <div key={t.name} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-muted-foreground" title={`${t.name} — ${t.role}`}>
                        {t.name.split(" ").map(n => n[0]).join("")}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inner tabs */}
                <div className="flex items-center gap-1 mt-4 border-b border-border overflow-x-auto">
                  {DEAL_ROOM_TABS.map((tab) => (
                    <button key={tab} onClick={() => setDealRoomTab(tab)}
                      className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${dealRoomTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              {dealRoomTab === "Summary" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-4">
                    {/* Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {SAMPLE_DEAL.metrics.map((m) => (
                        <div key={m.label} className="rounded-lg border border-border bg-card p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                          <p className="text-lg font-bold font-mono text-foreground mt-1">{m.value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Thesis */}
                    <div className="rounded-lg border border-border bg-card p-4">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-primary" /> Investment Thesis</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{SAMPLE_DEAL.thesis}</p>
                    </div>
                  </div>
                  {/* IC Votes */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><MessageSquare className="h-4 w-4 text-primary" /> IC Votes</h3>
                    <div className="space-y-3">
                      {SAMPLE_DEAL.votes.map((v) => (
                        <div key={v.user} className="rounded-md border border-success/20 bg-success/5 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-3.5 w-3.5 text-success" />
                            <span className="text-xs font-medium text-foreground">{v.user}</span>
                            <span className="text-[10px] text-success font-medium uppercase">Proceed</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{v.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {dealRoomTab === "Timeline" && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="space-y-1">
                    {SAMPLE_DEAL.timeline.map((t, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-8 rounded-full border-2 border-border bg-card flex items-center justify-center text-primary"><GitBranch className="h-3.5 w-3.5" /></div>
                          {i < SAMPLE_DEAL.timeline.length - 1 && <div className="w-px flex-1 bg-border/50" />}
                        </div>
                        <div className="pb-6">
                          <div className="rounded-lg border border-border bg-background p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground font-mono">{t.date}</span>
                              <span className="text-xs text-foreground">{t.action}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dealRoomTab !== "Summary" && dealRoomTab !== "Timeline" && (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <Lock className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sign up to access {dealRoomTab}</p>
                  <Link to="/auth" className="text-xs text-primary hover:underline mt-1 inline-block">Create an account →</Link>
                </div>
              )}
            </div>
          )}

          {/* ── VALUATION TAB ────────────────────────────── */}
          {activeTab === "valuation" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Valuation · {SAMPLE_DEAL.company}</h2>

              {/* Comp table */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Public Comparable Companies</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Company</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">EV/Revenue</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">EV/EBITDA</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Growth</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {SAMPLE_COMPS.map((comp) => (
                        <tr key={comp.name} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-foreground">{comp.name}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-foreground">{comp.evRevenue}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-foreground">{comp.evEbitda}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-success">{comp.growth}</td>
                          <td className={`px-4 py-2.5 text-right font-mono ${comp.margin.startsWith("-") ? "text-destructive" : "text-success"}`}>{comp.margin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Football field */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Valuation Range ("Football Field")</h3>
                <div className="space-y-3">
                  {VALUATION_RANGES.map((range) => {
                    const maxVal = 1000;
                    const leftPct = (range.low / maxVal) * 100;
                    const widthPct = ((range.high - range.low) / maxVal) * 100;
                    const midPct = ((range.mid - range.low) / (range.high - range.low)) * 100;
                    return (
                      <div key={range.method} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-28 shrink-0 text-right">{range.method}</span>
                        <div className="flex-1 relative h-6">
                          <div className="absolute inset-0 bg-muted/30 rounded" />
                          <div className={`absolute top-0 h-full rounded ${range.color} opacity-30`} style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
                          <div className={`absolute top-1 h-4 w-0.5 ${range.color}`} style={{ left: `${leftPct + (widthPct * midPct / 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-24 shrink-0">
                          ${range.low}M – ${range.high}M
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 text-center">Implied equity value range: $480M – $950M · Midpoint: $720M</p>
              </div>

              {/* DCF locked */}
              <div className="rounded-lg border border-border bg-card p-6 text-center">
                <Lock className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Full DCF Model & Sensitivity Analysis</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Interactive DCF calculator with WACC, terminal value assumptions, and scenario modeling available with a full account.</p>
                <Link to="/auth" className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Lock className="h-3.5 w-3.5" /> Sign Up to Access
                </Link>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Ready to go deeper?</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Create a free account to open deal rooms, run AI-powered diligence, build valuation models, and collaborate with your team.
            </p>
            <Link to="/auth" className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
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
