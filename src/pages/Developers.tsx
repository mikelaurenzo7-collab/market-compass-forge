import { useState } from "react";
import { Code, Terminal, Key, Zap, Database, TrendingUp, Search, Newspaper, Users, DollarSign, Copy, Check, BookOpen } from "lucide-react";
import ApiKeyManager from "@/components/ApiKeyManager";

const ENDPOINTS = [
  {
    action: "companies",
    label: "Companies",
    icon: Database,
    description: "Search and list all tracked companies across private and public markets.",
    params: [
      { name: "search", type: "string", desc: "Filter by company name" },
      { name: "sector", type: "string", desc: "Filter by sector (e.g. 'Fintech')" },
      { name: "stage", type: "string", desc: "Filter by stage (e.g. 'Series B')" },
      { name: "market_type", type: "string", desc: "'private' or 'public'" },
      { name: "limit", type: "number", desc: "Max results (default 50, max 500)" },
      { name: "offset", type: "number", desc: "Pagination offset" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://API_URL/functions/v1/api-access?action=companies&sector=Fintech&limit=10"`,
    response: `{
  "data": [
    {
      "id": "uuid",
      "name": "Stripe",
      "sector": "Fintech",
      "stage": "Series H",
      "market_type": "private",
      "hq_country": "US",
      "employee_count": 8000,
      "founded_year": 2010
    }
  ],
  "meta": { "total": 142, "limit": 10, "offset": 0 }
}`,
  },
  {
    action: "market-data",
    label: "Market Data",
    icon: TrendingUp,
    description: "Real-time public market data including price, market cap, P/E, beta, and 52-week range.",
    params: [
      { name: "ticker", type: "string", desc: "Filter by ticker symbol (e.g. 'AAPL')" },
      { name: "company_id", type: "uuid", desc: "Filter by company UUID" },
      { name: "min_market_cap", type: "number", desc: "Minimum market cap filter" },
      { name: "max_market_cap", type: "number", desc: "Maximum market cap filter" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://API_URL/functions/v1/api-access?action=market-data&ticker=AAPL"`,
    response: `{
  "data": [
    {
      "ticker": "AAPL",
      "price": 189.84,
      "price_change_pct": 1.23,
      "market_cap": 2950000000000,
      "pe_ratio": 31.2,
      "beta": 1.28,
      "fifty_two_week_high": 199.62,
      "fifty_two_week_low": 164.08,
      "companies": { "name": "Apple", "sector": "Technology" }
    }
  ],
  "meta": { "total": 1, "limit": 50, "offset": 0 }
}`,
  },
  {
    action: "screening",
    label: "Screening",
    icon: Search,
    description: "Cross-market screening with financial filters. Returns companies with their latest financials and market data joined.",
    params: [
      { name: "sector", type: "string", desc: "Filter by sector" },
      { name: "market_type", type: "string", desc: "'private' or 'public'" },
      { name: "stage", type: "string", desc: "Filter by stage" },
      { name: "min_revenue", type: "number", desc: "Minimum revenue filter" },
      { name: "max_revenue", type: "number", desc: "Maximum revenue filter" },
      { name: "min_arr", type: "number", desc: "Minimum ARR filter" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://API_URL/functions/v1/api-access?action=screening&sector=SaaS&min_arr=10000000"`,
    response: `{
  "data": [
    {
      "name": "Datadog",
      "sector": "SaaS",
      "market_type": "public",
      "revenue": 2100000000,
      "arr": 2200000000,
      "gross_margin": 0.78,
      "market_cap": 42000000000,
      "ticker": "DDOG"
    }
  ],
  "meta": { "total": 23, "limit": 50, "offset": 0 }
}`,
  },
  {
    action: "financials",
    label: "Financials",
    icon: DollarSign,
    description: "Revenue, ARR, margins, EBITDA, and burn rate data with confidence scoring.",
    params: [
      { name: "company_id", type: "uuid", desc: "Filter by company UUID" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://API_URL/functions/v1/api-access?action=financials&company_id=UUID"`,
    response: `{
  "data": [
    {
      "company_id": "uuid",
      "period": "2025",
      "revenue": 500000000,
      "arr": 520000000,
      "gross_margin": 0.72,
      "ebitda": 50000000,
      "confidence_score": "high"
    }
  ]
}`,
  },
  {
    action: "funding",
    label: "Funding Rounds",
    icon: Zap,
    description: "Funding history with round type, amount, valuation, and investor data.",
    params: [
      { name: "company_id", type: "uuid", desc: "Filter by company UUID" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://API_URL/functions/v1/api-access?action=funding&company_id=UUID"`,
    response: `{
  "data": [
    {
      "round_type": "Series D",
      "amount": 200000000,
      "valuation_post": 5000000000,
      "date": "2024-06-15",
      "lead_investors": ["Sequoia Capital"]
    }
  ]
}`,
  },
  {
    action: "investors",
    label: "Investors",
    icon: Users,
    description: "Investor directory with AUM, type, and portfolio data.",
    params: [
      { name: "search", type: "string", desc: "Search by investor name" },
      { name: "type", type: "string", desc: "Filter by type (e.g. 'VC', 'PE')" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://API_URL/functions/v1/api-access?action=investors&type=VC&search=Sequoia"`,
    response: `{
  "data": [
    {
      "name": "Sequoia Capital",
      "type": "VC",
      "hq_country": "US",
      "aum": 85000000000
    }
  ]
}`,
  },
  {
    action: "news",
    label: "News & Sentiment",
    icon: Newspaper,
    description: "AI-scored news articles with sentiment analysis (-1.0 bearish to +1.0 bullish).",
    params: [
      { name: "company_id", type: "uuid", desc: "Filter by company" },
      { name: "sentiment", type: "string", desc: "'bullish', 'bearish', or 'neutral'" },
    ],
    example: `curl -H "Authorization: Bearer lpi_YOUR_KEY" \\
  "https://API_URL/functions/v1/api-access?action=news&sentiment=bullish&limit=5"`,
    response: `{
  "data": [
    {
      "title": "AI Startup Raises $50M Series B",
      "sentiment_score": 0.85,
      "sentiment_label": "bullish",
      "ai_summary": "Strong growth signal for enterprise AI sector",
      "source_name": "TechCrunch"
    }
  ]
}`,
  },
];

const RATE_LIMITS = [
  { tier: "Free", limit: "100 req/day", color: "text-muted-foreground" },
  { tier: "Pro", limit: "10,000 req/day", color: "text-primary" },
  { tier: "Enterprise", limit: "Unlimited", color: "text-success" },
];

const CodeBlock = ({ code, lang = "bash" }: { code: string; lang?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-background border border-border rounded-md p-3 text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded bg-muted/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
};

const Developers = () => {
  const [activeEndpoint, setActiveEndpoint] = useState("companies");

  const selected = ENDPOINTS.find((e) => e.action === activeEndpoint) ?? ENDPOINTS[0];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" /> API Documentation
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Programmatic access to 1,000+ companies across private & public markets
        </p>
      </div>

      {/* Quick start */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" /> Quick Start
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold shrink-0">1</span>
            <p className="text-muted-foreground">Create an API key in <strong className="text-foreground">Settings → API Access</strong></p>
          </div>
          <div className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold shrink-0">2</span>
            <p className="text-muted-foreground">Add <code className="text-xs font-mono text-primary">Authorization: Bearer lpi_...</code> header</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold shrink-0">3</span>
            <p className="text-muted-foreground">Use <code className="text-xs font-mono text-primary">?action=</code> to select endpoint</p>
          </div>
        </div>
        <CodeBlock code={`# Base URL\nGET /functions/v1/api-access?action={endpoint}&{params}\n\n# Example: Search Fintech companies\ncurl -H "Authorization: Bearer lpi_YOUR_KEY" \\\n  "https://YOUR_PROJECT.supabase.co/functions/v1/api-access?action=companies&sector=Fintech"`} />
      </div>

      {/* Rate limits */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Rate Limits
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {RATE_LIMITS.map((r) => (
            <div key={r.tier} className="text-center">
              <p className={`text-lg font-mono font-semibold ${r.color}`}>{r.limit}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.tier}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Rate limit info returned in <code className="font-mono">X-RateLimit-Remaining</code> and <code className="font-mono">X-RateLimit-Tier</code> response headers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Endpoint nav */}
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Endpoints</h3>
          {ENDPOINTS.map((ep) => (
            <button
              key={ep.action}
              onClick={() => setActiveEndpoint(ep.action)}
              className={`w-full px-3 py-2 rounded-md text-sm text-left flex items-center gap-2 transition-colors ${
                activeEndpoint === ep.action
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <ep.icon className="h-3.5 w-3.5" />
              {ep.label}
            </button>
          ))}
        </div>

        {/* Endpoint detail */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-success/10 text-success">GET</span>
                <code className="text-sm font-mono text-foreground">?action={selected.action}</code>
              </div>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
            </div>

            {/* Parameters */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Parameters</h4>
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.params.map((p) => (
                      <tr key={p.name} className="border-b border-border/50">
                        <td className="px-3 py-2 font-mono text-xs text-primary">{p.name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.type}</td>
                        <td className="px-3 py-2 text-xs text-foreground/80">{p.desc}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-border/50">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">limit</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">number</td>
                      <td className="px-3 py-2 text-xs text-foreground/80">Max results (default 50, max 500)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">offset</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">number</td>
                      <td className="px-3 py-2 text-xs text-foreground/80">Pagination offset</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Example request */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Example Request</h4>
              <CodeBlock code={selected.example} />
            </div>

            {/* Example response */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Example Response</h4>
              <CodeBlock code={selected.response} lang="json" />
            </div>
          </div>
        </div>
      </div>

      {/* API Key management inline */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" /> Your API Keys
        </h2>
        <ApiKeyManager />
      </div>

      {/* Error codes */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Error Codes</h3>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Code</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              <tr className="border-b border-border/50"><td className="px-3 py-2 font-mono text-destructive">401</td><td className="px-3 py-2 text-foreground/80">Invalid, expired, or missing API key</td></tr>
              <tr className="border-b border-border/50"><td className="px-3 py-2 font-mono text-warning">400</td><td className="px-3 py-2 text-foreground/80">Invalid action or parameters</td></tr>
              <tr className="border-b border-border/50"><td className="px-3 py-2 font-mono text-warning">429</td><td className="px-3 py-2 text-foreground/80">Rate limit exceeded — upgrade tier or wait</td></tr>
              <tr><td className="px-3 py-2 font-mono text-destructive">500</td><td className="px-3 py-2 text-foreground/80">Internal server error</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Developers;
