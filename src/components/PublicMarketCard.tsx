import { TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react";
import { formatCurrency } from "@/hooks/useData";

interface PublicMarketData {
  ticker: string;
  exchange: string | null;
  market_cap: number | null;
  pe_ratio: number | null;
  eps: number | null;
  dividend_yield: number | null;
  price: number | null;
  price_change_pct: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  volume_avg: number | null;
  beta: number | null;
}

const PublicMarketCard = ({ data }: { data: PublicMarketData }) => {
  const isPositive = (data.price_change_pct ?? 0) >= 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Market Data</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-accent text-accent-foreground">
            {data.ticker}
          </span>
          {data.exchange && (
            <span className="text-[10px] text-muted-foreground font-mono">{data.exchange}</span>
          )}
        </div>
      </div>

      {/* Price & Change */}
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold font-mono text-foreground">
          ${data.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className={`flex items-center gap-0.5 text-sm font-mono font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {isPositive ? "+" : ""}{data.price_change_pct?.toFixed(2)}%
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Market Cap" value={formatCurrency(data.market_cap)} />
        <Metric label="P/E Ratio" value={data.pe_ratio ? data.pe_ratio.toFixed(1) : "—"} />
        <Metric label="EPS" value={data.eps ? `$${data.eps.toFixed(2)}` : "—"} />
        <Metric label="Beta" value={data.beta ? data.beta.toFixed(2) : "—"} />
        <Metric label="Dividend Yield" value={data.dividend_yield ? `${(data.dividend_yield * 100).toFixed(2)}%` : "—"} />
        <Metric label="Avg Volume" value={data.volume_avg ? `${(data.volume_avg / 1e6).toFixed(1)}M` : "—"} />
        <Metric label="52W High" value={data.fifty_two_week_high ? `$${data.fifty_two_week_high.toLocaleString()}` : "—"} />
        <Metric label="52W Low" value={data.fifty_two_week_low ? `$${data.fifty_two_week_low.toLocaleString()}` : "—"} />
      </div>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-sm font-medium font-mono text-foreground mt-0.5">{value}</p>
  </div>
);

export default PublicMarketCard;
