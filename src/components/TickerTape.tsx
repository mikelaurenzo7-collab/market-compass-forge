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
 * Scrolling horizontal ticker tape for the header status strip.
 * Shows private market deal flow metrics, sector multiples, and macro indicators.
 */
export default function TickerTape() {
  const { data: items } = useQuery({
    queryKey: ["ticker-tape"],
    queryFn: async (): Promise<TickerItem[]> => {
      const [macroRes, sectorRes, dealRes, distressedRes] = await Promise.all([
        supabase
          .from("macro_indicators")
          .select("series_id, label, value")
          .in("series_id", ["DGS10", "FEDFUNDS"])
          .order("observation_date", { ascending: false })
          .limit(2),
        supabase
          .from("mv_sector_multiples")
          .select("sector, ev_rev_median, ev_ebitda_median, ev_rev_count")
          .order("ev_rev_count", { ascending: false })
          .limit(5),
        supabase
          .from("funding_rounds")
          .select("round_type, amount, date")
          .order("date", { ascending: false })
          .limit(10),
        supabase
          .from("distressed_assets")
          .select("id")
          .eq("status", "active"),
      ]);

      const tickers: TickerItem[] = [];

      // Macro indicators (rates only — no stock tickers)
      (macroRes.data ?? []).forEach((m: any) => {
        const labels: Record<string, string> = {
          DGS10: "10Y UST",
          FEDFUNDS: "Fed Rate",
        };
        tickers.push({
          label: labels[m.series_id] ?? m.label,
          value: `${Number(m.value).toFixed(2)}%`,
        });
      });

      // Sector multiples from private market data
      (sectorRes.data ?? []).forEach((s: any) => {
        if (s.ev_rev_median && s.ev_rev_median > 0) {
          tickers.push({
            label: `${(s.sector ?? "Unknown").slice(0, 12)} EV/Rev`,
            value: `${Number(s.ev_rev_median).toFixed(1)}x`,
          });
        }
      });

      // Recent deal flow summary
      const recentDeals = dealRes.data ?? [];
      if (recentDeals.length > 0) {
        const totalCapital = recentDeals.reduce((sum: number, d: any) => sum + (d.amount ?? 0), 0);
        if (totalCapital > 0) {
          tickers.push({
            label: "Recent Deals",
            value: totalCapital >= 1e9 ? `$${(totalCapital / 1e9).toFixed(1)}B` : `$${(totalCapital / 1e6).toFixed(0)}M`,
          });
        }
        tickers.push({
          label: "Deal Flow",
          value: `${recentDeals.length} rounds`,
        });
      }

      // Distressed asset count
      const activeDistressed = distressedRes.data?.length ?? 0;
      if (activeDistressed > 0) {
        tickers.push({
          label: "Distressed Active",
          value: `${activeDistressed} assets`,
        });
      }

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
