import { useState } from "react";
import { Code, Copy, Check, ChevronDown, ChevronRight, Terminal, Zap, Database, Globe, TrendingUp, Building2, AlertTriangle, FileText, BarChart3, Shield } from "lucide-react";
import PageTransition from "@/components/PageTransition";

const ENDPOINTS = [
  {
    action: "companies",
    label: "Companies",
    icon: Building2,
    description: "Search and filter 7,800+ private and public companies",
    params: [
      { name: "search", type: "string", desc: "Filter by company name" },
      { name: "sector", type: "string", desc: "Filter by sector (e.g. AI/ML, Fintech)" },
      { name: "stage", type: "string", desc: "Filter by stage (e.g. Series A, Growth)" },
      { name: "market_type", type: "string", desc: "Filter: private or public" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access?action=companies&sector=AI/ML&limit=10"`,
  },
  {
    action: "financials",
    label: "Financials",
    icon: BarChart3,
    description: "Revenue, ARR, EBITDA, margins, burn rate by company",
    params: [
      { name: "company_id", type: "uuid", desc: "Filter by company ID" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access?action=financials&company_id=UUID"`,
  },
  {
    action: "funding",
    label: "Funding Rounds",
    icon: TrendingUp,
    description: "Investment history with valuations and investor details",
    params: [
      { name: "company_id", type: "uuid", desc: "Filter by company ID" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access?action=funding&limit=20"`,
  },
  {
    action: "distressed",
    label: "Distressed Assets",
    icon: AlertTriangle,
    description: "350+ bankruptcy, receivership, and voluntary sale opportunities",
    params: [
      { name: "sector", type: "string", desc: "Filter by sector" },
      { name: "distress_type", type: "string", desc: "bankruptcy, receivership, voluntary_sale" },
      { name: "asset_type", type: "string", desc: "business, real_estate, equipment" },
      { name: "status", type: "string", desc: "active, under_contract, sold" },
      { name: "min_discount", type: "number", desc: "Minimum discount percentage" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access?action=distressed&min_discount=30"`,
  },
  {
    action: "deals",
    label: "Deal Transactions",
    icon: FileText,
    description: "M&A, LBO, and growth equity transaction data with multiples",
    params: [
      { name: "deal_type", type: "string", desc: "M&A, LBO, Growth Equity, etc." },
      { name: "industry", type: "string", desc: "Target industry filter" },
      { name: "status", type: "string", desc: "closed, pending, announced" },
      { name: "min_value", type: "number", desc: "Minimum deal value" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access?action=deals&deal_type=M%26A&min_value=100000000"`,
  },
  {
    action: "funds",
    label: "Fund Intelligence",
    icon: Database,
    description: "PE/VC fund performance: IRR, TVPI, DPI, quartile rankings",
    params: [
      { name: "strategy", type: "string", desc: "buyout, venture, growth, etc." },
      { name: "min_irr", type: "number", desc: "Minimum net IRR" },
      { name: "vintage_year", type: "number", desc: "Filter by vintage year" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access?action=funds&strategy=buyout&min_irr=15"`,
  },
  {
    action: "global-opportunities",
    label: "Global Opportunities",
    icon: Globe,
    description: "Cross-border PE/VC, infrastructure, and sovereign fund deals",
    params: [
      { name: "region", type: "string", desc: "MENA, Asia-Pacific, Europe, etc." },
      { name: "country", type: "string", desc: "Filter by country" },
      { name: "opportunity_type", type: "string", desc: "pe_vc, infrastructure, real_estate" },
      { name: "sector", type: "string", desc: "Filter by sector" },
      { name: "min_value", type: "number", desc: "Minimum deal value (USD)" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access?action=global-opportunities&region=MENA"`,
  },
  {
    action: "real-estate",
    label: "Private Real Estate",
    icon: Building2,
    description: "Off-market CRE listings with cap rates and NOI",
    params: [
      { name: "property_type", type: "string", desc: "Office, Industrial, Multifamily, etc." },
      { name: "state", type: "string", desc: "State abbreviation" },
      { name: "city", type: "string", desc: "City name" },
      { name: "listing_type", type: "string", desc: "off_market, exclusive" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access?action=real-estate&property_type=Industrial"`,
  },
  {
    action: "signals",
    label: "Intelligence Signals",
    icon: Zap,
    description: "AI-generated market signals with sentiment analysis",
    params: [
      { name: "category", type: "string", desc: "pe_ma, venture, macro, competitive" },
      { name: "sentiment", type: "string", desc: "bullish, bearish, neutral" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access?action=signals&category=pe_ma"`,
  },
  {
    action: "precedent-transactions",
    label: "Precedent Transactions",
    icon: FileText,
    description: "Historical M&A comps with EV/Revenue and EV/EBITDA multiples",
    params: [
      { name: "sector", type: "string", desc: "Filter by sector" },
      { name: "deal_type", type: "string", desc: "Filter by deal type" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access?action=precedent-transactions&sector=Technology"`,
  },
];

const CodeBlock = ({ code, language = "bash" }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-background border border-border rounded-md p-3 text-xs font-mono text-foreground overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-2 right-2 p-1.5 rounded bg-secondary/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
};

const Developers = () => {
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-4xl space-y-8">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Code className="h-6 w-6 text-primary" /> API Reference
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access Grapevine data programmatically. Pull companies, financials, deals, and intelligence into your models.
          </p>
        </div>

        {/* Quick Start */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Quick Start</h2>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">1. Create an API key in <strong className="text-foreground">Settings → API Access</strong></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">2. Make your first request:</p>
              <CodeBlock code={`curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "${window.location.origin.replace('preview--', '').replace(/https?:\/\/[^.]+\./, 'https://kilhdiuacbylampaukza.supabase.co/')}/functions/v1/api-access?action=companies&limit=5"`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">3. Python example:</p>
              <CodeBlock language="python" code={`import requests

API_KEY = "lpi_YOUR_KEY"
BASE = "https://kilhdiuacbylampaukza.supabase.co/functions/v1/api-access"

# Get AI/ML companies
resp = requests.get(f"{BASE}?action=companies&sector=AI/ML&limit=50",
                     headers={"Authorization": f"Bearer {API_KEY}"})
companies = resp.json()["data"]

# Get financials for a company
resp = requests.get(f"{BASE}?action=financials&company_id={companies[0]['id']}",
                     headers={"Authorization": f"Bearer {API_KEY}"})
financials = resp.json()["data"]`} />
            </div>
          </div>
        </div>

        {/* Auth & Rate Limits */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Authentication & Limits</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-md bg-secondary/50">
              <p className="font-medium text-foreground mb-1">Auth Method</p>
              <p className="text-muted-foreground">Bearer token in Authorization header</p>
              <code className="text-[10px] text-primary block mt-1">Authorization: Bearer lpi_...</code>
            </div>
            <div className="p-3 rounded-md bg-secondary/50">
              <p className="font-medium text-foreground mb-1">Rate Limits</p>
              <p className="text-muted-foreground">Professional: 10,000/day</p>
              <p className="text-muted-foreground">Enterprise: 1,000,000/day</p>
            </div>
            <div className="p-3 rounded-md bg-secondary/50">
              <p className="font-medium text-foreground mb-1">Pagination</p>
              <p className="text-muted-foreground"><code className="text-primary">limit</code> (max 500) + <code className="text-primary">offset</code></p>
              <p className="text-muted-foreground mt-1">Response includes <code className="text-primary">meta.total</code></p>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground mb-3">Endpoints</h2>
          {ENDPOINTS.map((ep) => {
            const isExpanded = expandedEndpoint === ep.action;
            return (
              <div key={ep.action} className="rounded-lg border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedEndpoint(isExpanded ? null : ep.action)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <ep.icon className="h-4 w-4 text-primary" />
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium text-foreground">{ep.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">?action={ep.action}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-mono">GET</span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">{ep.description}</p>
                    {ep.params.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Parameters</p>
                        <div className="space-y-1">
                          {ep.params.map((p) => (
                            <div key={p.name} className="flex items-start gap-2 text-xs">
                              <code className="text-primary font-mono bg-primary/5 px-1.5 py-0.5 rounded min-w-[100px]">{p.name}</code>
                              <span className="text-muted-foreground/60 font-mono text-[10px] min-w-[50px]">{p.type}</span>
                              <span className="text-muted-foreground">{p.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Example</p>
                      <CodeBlock code={ep.example} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Response format */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Response Format</h2>
          <CodeBlock language="json" code={`{
  "data": [ ... ],
  "meta": {
    "total": 7844,
    "limit": 50,
    "offset": 0,
    "action": "companies",
    "tier": "professional"
  }
}`} />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Rate limit headers: <code className="text-primary">X-RateLimit-Remaining</code>, <code className="text-primary">X-RateLimit-Tier</code></p>
            <p>• Errors return <code className="text-primary">{"{ error: string }"}</code> with appropriate HTTP status</p>
            <p>• All timestamps are ISO 8601 / UTC</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Developers;
