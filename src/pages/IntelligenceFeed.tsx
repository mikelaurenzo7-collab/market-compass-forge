import { useState } from "react";
import {
  TrendingUp, TrendingDown, Minus, Sparkles, ExternalLink,
  Building2, Landmark, BarChart3, CreditCard, Globe, Briefcase,
  Users, FileText,
} from "lucide-react";

type SentimentType = "bullish" | "bearish" | "neutral";
type CategoryType = "pe_ma" | "real_estate" | "venture" | "credit" | "macro" | "personnel";

interface IntelItem {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  aiSummary: string;
  tags: string[];
  sentiment: SentimentType;
  category: CategoryType;
  url?: string;
}

const FEED_ITEMS: IntelItem[] = [
  { id: "1", headline: "Thoma Bravo Closes $32.4B Fund XV, Largest Software Buyout Fund Ever", source: "PE Wire", timestamp: "2h ago", aiSummary: "Thoma Bravo has closed its fifteenth flagship fund at $32.4B, exceeding its $30B target. The fund will continue the firm's strategy of acquiring mission-critical enterprise software companies.", tags: ["Fundraising", "Software", "Buyout"], sentiment: "bullish", category: "pe_ma" },
  { id: "2", headline: "Chicago Loop Office Cap Rates Widen to 7.8% as Vacancy Hits 24.1%", source: "CRE Intel", timestamp: "3h ago", aiSummary: "Chicago's Loop office submarket continues to face headwinds as remote work persists. Cap rates have expanded 180bps year-over-year, creating potential value opportunities for contrarian investors.", tags: ["Office", "Chicago", "Cap Rates"], sentiment: "bearish", category: "real_estate" },
  { id: "3", headline: "Vista Equity Acquires Citrix Analytics Division for $2.1B at 8.5x Revenue", source: "Deal Wire", timestamp: "4h ago", aiSummary: "Vista Equity Partners has agreed to acquire Citrix's analytics and monitoring division in a carve-out transaction valued at $2.1B. The deal represents 8.5x LTM revenue and 22x EBITDA.", tags: ["Carve-out", "Software", "Analytics"], sentiment: "bullish", category: "pe_ma" },
  { id: "4", headline: "Stripe Raises $6.5B Series J at $91B Valuation, Down from $95B Peak", source: "Venture Beat", timestamp: "5h ago", aiSummary: "Stripe has closed a $6.5B funding round led by Sequoia and Andreessen Horowitz. The $91B valuation marks a slight discount to its 2021 peak but remains the highest private valuation in fintech.", tags: ["Fintech", "Late-Stage", "Payments"], sentiment: "neutral", category: "venture" },
  { id: "5", headline: "Fed Holds Rates Steady, Signals Two Cuts Expected in H2 2026", source: "Macro Monitor", timestamp: "6h ago", aiSummary: "The Federal Reserve maintained its benchmark rate at 4.25-4.50%, in line with expectations. Updated dot plot projections suggest two 25bps cuts in the second half of 2026.", tags: ["Interest Rates", "Fed", "Monetary Policy"], sentiment: "bullish", category: "macro" },
  { id: "6", headline: "KKR Hires Goldman Sachs MD to Lead New Infrastructure Credit Strategy", source: "People Moves", timestamp: "7h ago", aiSummary: "KKR has recruited Sarah Chen, a Managing Director from Goldman Sachs Asset Management, to lead a new infrastructure credit platform targeting $5B in AUM within 24 months.", tags: ["Hiring", "Infrastructure", "Credit"], sentiment: "neutral", category: "personnel" },
  { id: "7", headline: "Private Credit AUM Surpasses $1.8T Globally, Direct Lending Dominates", source: "Credit Weekly", timestamp: "8h ago", aiSummary: "Global private credit assets under management have reached $1.8T, with direct lending accounting for 48% of the total. Institutional allocators continue to shift from liquid credit to private strategies.", tags: ["Private Credit", "Direct Lending", "AUM"], sentiment: "bullish", category: "credit" },
  { id: "8", headline: "Apollo Acquires Majority Stake in ADT Solar for $1.6B", source: "Deal Wire", timestamp: "9h ago", aiSummary: "Apollo Global Management has acquired a controlling interest in ADT's residential solar division at an implied EV/EBITDA of 11.2x. The deal is expected to close in Q3 2026.", tags: ["Solar", "Buyout", "Energy"], sentiment: "bullish", category: "pe_ma" },
  { id: "9", headline: "Industrial Multifamily Cap Rates Compress to 5.2% in Sun Belt Markets", source: "CRE Intel", timestamp: "10h ago", aiSummary: "Multifamily cap rates in key Sun Belt markets (Dallas, Austin, Nashville, Charlotte) have compressed to 5.2% on average, driven by institutional demand and strong rent growth fundamentals.", tags: ["Multifamily", "Sun Belt", "Cap Rates"], sentiment: "bullish", category: "real_estate" },
  { id: "10", headline: "Warburg Pincus-Backed Datavant Reaches $7.2B Valuation in Secondary Sale", source: "Secondary Market", timestamp: "11h ago", aiSummary: "Health data company Datavant has been valued at $7.2B in a secondary transaction, up 44% from its last primary round. Warburg Pincus retains its majority position.", tags: ["Healthcare", "Data", "Secondary"], sentiment: "bullish", category: "pe_ma" },
  { id: "11", headline: "Anthropic Closes $5B Series E at $60B Valuation Led by Google", source: "Venture Beat", timestamp: "12h ago", aiSummary: "AI safety company Anthropic has closed a $5B Series E round led by Google, valuing the company at $60B. The round brings total funding to over $15B since inception.", tags: ["AI", "Late-Stage", "Deep Tech"], sentiment: "bullish", category: "venture" },
  { id: "12", headline: "CLO Issuance Hits Record $42B in Q1 2026, Spreads Tighten", source: "Credit Weekly", timestamp: "13h ago", aiSummary: "CLO new issuance reached $42B in Q1 2026, a quarterly record. AAA spreads tightened to S+105bps as institutional demand for structured credit continues to outpace supply.", tags: ["CLO", "Structured Credit", "Spreads"], sentiment: "bullish", category: "credit" },
  { id: "13", headline: "Carlyle Exits MedStar Health Services at 3.2x MOIC After 4-Year Hold", source: "Exit Watch", timestamp: "14h ago", aiSummary: "Carlyle Group has completed the sale of MedStar Health Services to UnitedHealth Group for $4.8B, generating a 3.2x MOIC and 34% gross IRR on its 2022 investment.", tags: ["Healthcare", "Exit", "Buyout"], sentiment: "bullish", category: "pe_ma" },
  { id: "14", headline: "WeWork Successor Flex Office REIT Files for $800M IPO", source: "CRE Intel", timestamp: "15h ago", aiSummary: "Industrious, the flexible workspace provider backed by Brookfield, has filed for an IPO seeking to raise up to $800M. The company operates 200+ locations across 65 markets.", tags: ["Flex Office", "IPO", "REIT"], sentiment: "neutral", category: "real_estate" },
  { id: "15", headline: "Blackstone Real Estate Fund X Reaches $36B Final Close", source: "PE Wire", timestamp: "16h ago", aiSummary: "Blackstone has closed its tenth real estate flagship fund at $36B, the largest real estate fund in history. The fund will focus on logistics, data centers, and student housing globally.", tags: ["Real Estate", "Fundraising", "Blackstone"], sentiment: "bullish", category: "real_estate" },
  { id: "16", headline: "US 10-Year Treasury Yield Falls to 3.85% on Weaker Jobs Data", source: "Macro Monitor", timestamp: "17h ago", aiSummary: "The 10-year Treasury yield dropped 12bps to 3.85% following a weaker-than-expected jobs report showing 132K nonfarm payrolls vs. 185K expected. Markets now price in three Fed cuts by year-end.", tags: ["Treasuries", "Employment", "Rates"], sentiment: "neutral", category: "macro" },
  { id: "17", headline: "Silver Lake Partners Acquires Qualtrics in $14.8B Take-Private", source: "Deal Wire", timestamp: "18h ago", aiSummary: "Silver Lake has agreed to acquire Qualtrics in a $14.8B take-private transaction, representing a 32% premium to the undisturbed share price. The deal values Qualtrics at 9.2x NTM revenue.", tags: ["Take-Private", "Software", "Experience Mgmt"], sentiment: "bullish", category: "pe_ma" },
  { id: "18", headline: "Pension Fund Allocations to Alternatives Reach 34% Average, Up from 28% in 2022", source: "LP Tracker", timestamp: "19h ago", aiSummary: "Public pension funds have increased their average allocation to alternative investments to 34%, driven by strong private equity and real estate returns. CalPERS and CalSTRS lead with 40%+ allocations.", tags: ["Pensions", "Alternatives", "Allocation"], sentiment: "bullish", category: "pe_ma" },
  { id: "19", headline: "Chicago Industrial Vacancy Drops to 4.1%, Rents Up 8.2% YoY", source: "CRE Intel", timestamp: "20h ago", aiSummary: "Chicago's industrial market continues to tighten with vacancy at 4.1% and asking rents reaching $8.45/SF NNN. The O'Hare corridor and I-55 submarket remain the most active.", tags: ["Industrial", "Chicago", "Logistics"], sentiment: "bullish", category: "real_estate" },
  { id: "20", headline: "Insight Partners Raises $12B Fund XIII for Growth-Stage Software Investments", source: "PE Wire", timestamp: "21h ago", aiSummary: "Insight Partners has closed Fund XIII at $12B, targeting growth-stage software companies with $20-100M ARR. The fund will also allocate 15% to ScaleUp investments in later-stage companies.", tags: ["Growth Equity", "Software", "Fundraising"], sentiment: "bullish", category: "venture" },
  { id: "21", headline: "Former Bain Capital Partner Launches $2B Healthcare-Focused PE Firm", source: "People Moves", timestamp: "22h ago", aiSummary: "Marcus Webb, former Partner at Bain Capital, has launched Apex Health Partners with $2B in initial commitments. The firm will target healthcare services and health IT companies with $50-200M revenue.", tags: ["Healthcare", "New Fund", "Spin-out"], sentiment: "neutral", category: "personnel" },
  { id: "22", headline: "High-Yield Spreads Compress to 285bps, Lowest Since 2021", source: "Credit Weekly", timestamp: "23h ago", aiSummary: "US high-yield bond spreads have tightened to 285bps over Treasuries, the narrowest since mid-2021. Strong fund inflows and limited new issuance are driving the compression.", tags: ["High Yield", "Spreads", "Credit"], sentiment: "bullish", category: "credit" },
];

const CATEGORY_TABS: { value: CategoryType | "all"; label: string; icon: typeof Building2 }[] = [
  { value: "all", label: "All", icon: Globe },
  { value: "pe_ma", label: "PE & M&A", icon: Briefcase },
  { value: "real_estate", label: "Real Estate", icon: Building2 },
  { value: "venture", label: "Venture", icon: TrendingUp },
  { value: "credit", label: "Credit", icon: CreditCard },
  { value: "macro", label: "Macro", icon: Landmark },
  { value: "personnel", label: "People Moves", icon: Users },
];

const SentimentDot = ({ sentiment }: { sentiment: SentimentType }) => {
  const config = {
    bullish: { color: "bg-success", icon: TrendingUp, label: "Bullish" },
    bearish: { color: "bg-destructive", icon: TrendingDown, label: "Bearish" },
    neutral: { color: "bg-muted-foreground", icon: Minus, label: "Neutral" },
  };
  const c = config[sentiment];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
      sentiment === "bullish" ? "bg-success/10 text-success" :
      sentiment === "bearish" ? "bg-destructive/10 text-destructive" :
      "bg-muted text-muted-foreground"
    }`}>
      <c.icon className="h-3 w-3" />
      {c.label}
    </span>
  );
};

const IntelligenceFeed = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryType | "all">("all");

  const filtered = activeCategory === "all"
    ? FEED_ITEMS
    : FEED_ITEMS.filter((i) => i.category === activeCategory);

  const sentimentCounts = FEED_ITEMS.reduce(
    (acc, i) => { acc[i.sentiment]++; return acc; },
    { bullish: 0, bearish: 0, neutral: 0 }
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Intelligence Feed</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-curated private market intelligence and deal flow signals</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-mono text-success uppercase">Live</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
            <span className="text-success">{sentimentCounts.bullish}↑</span>
            <span className="text-muted-foreground">{sentimentCounts.neutral}→</span>
            <span className="text-destructive">{sentimentCounts.bearish}↓</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveCategory(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === tab.value
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border bg-card p-4 hover:border-primary/20 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <SentimentDot sentiment={item.sentiment} />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{item.source}</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors mb-2">
                  {item.headline}
                </h3>
                <p className="text-xs text-secondary-foreground leading-relaxed flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  {item.aiSummary}
                </p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {item.tags.map((tag) => (
                    <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-1">
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No intelligence items in this category yet</p>
        </div>
      )}
    </div>
  );
};

export default IntelligenceFeed;
