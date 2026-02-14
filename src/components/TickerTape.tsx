import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

type TickerItem = {
  label: string;
  value: string;
  change?: number;
};

/**
 * Scrolling horizontal market ticker tape for the header status strip.
 * Shows live sector multiples and macro indicators.
 */
export default function TickerTape() {
  const { data: items } = useQuery({
    queryKey: ["ticker-tape"],
    queryFn: async (): Promise<TickerItem[]> => {
      const [macroRes, sectorRes] = await Promise.all([
        supabase
          .from("macro_indicators")
          .select("series_id, label, value")
          .in("series_id", ["DGS10", "FEDFUNDS", "CPIAUCSL", "UNRATE"])
          .order("observation_date", { ascending: false })
          .limit(4),
        supabase
          .from("public_market_data")
          .select("ticker, price, price_change_pct")
          .order("market_cap", { ascending: false })
          .limit(6),
      ]);

      const tickers: TickerItem[] = [];

      (macroRes.data ?? []).forEach((m: any) => {
        const labels: Record<string, string> = {
          DGS10: "10Y UST",
          FEDFUNDS: "Fed Rate",
          CPIAUCSL: "CPI",
          UNRATE: "Unemp.",
        };
        tickers.push({
          label: labels[m.series_id] ?? m.label,
          value: `${Number(m.value).toFixed(2)}%`,
        });
      });

      (sectorRes.data ?? []).forEach((s: any) => {
        tickers.push({
          label: s.ticker,
          value: `$${Number(s.price).toFixed(2)}`,
          change: s.price_change_pct,
        });
      });

      return tickers;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (!items?.length) return null;

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden relative">
      <motion.div
        className="flex items-center gap-6 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="text-muted-foreground/60">{item.label}</span>
            <span className="text-foreground/80">{item.value}</span>
            {item.change != null && (
              <span
                className={`flex items-center gap-0.5 ${
                  item.change >= 0 ? "text-success/80" : "text-destructive/80"
                }`}
              >
                {item.change >= 0 ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                {Math.abs(item.change).toFixed(1)}%
              </span>
            )}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
