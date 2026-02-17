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
 * Shows real macro indicators from FRED + private market deal metrics.
 */
export default function TickerTape() {
  // Trigger a FRED data refresh if stale (fire-and-forget)
  useQuery({
    queryKey: ["fred-refresh"],
    queryFn: async () => {
      // Check staleness — only refresh if last fetch was > 6 hours ago
      const { data: latest } = await supabase
        .from("macro_indicators")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1);

      const lastFetch = latest?.[0]?.fetched_at;
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

      if (!lastFetch || lastFetch < sixHoursAgo) {
        // Fire-and-forget refresh
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-fred-data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }).catch((e) => console.warn("FRED refresh failed:", e));
      }
      return true;
    },
    staleTime: 30 * 60 * 1000, // 30 min
    refetchOnWindowFocus: false,
  });

  const { data: items } = useQuery({
    queryKey: ["ticker-tape"],
    queryFn: async (): Promise<TickerItem[]> => {
      // Fetch the latest value for each macro series
      const { data: macroData } = await supabase
        .from("macro_indicators")
        .select("series_id, label, value, unit, observation_date")
        .in("series_id", [
          "DGS10", "DGS2", "FEDFUNDS", "UNRATE", "CPIAUCSL",
          "BAMLH0A0HYM2", "T10Y2Y", "VIXCLS", "MORTGAGE30US",
        ])
        .order("observation_date", { ascending: false });

      // Deduplicate: keep only the latest observation per series
      const seen = new Set<string>();
      const latestMacro = (macroData ?? []).filter((m) => {
        if (seen.has(m.series_id)) return false;
        seen.add(m.series_id);
        return true;
      });

      // Also fetch previous values for change calculation
      const tickers: TickerItem[] = [];

      const formatMap: Record<string, (v: number) => string> = {
        DGS10: (v) => `${v.toFixed(2)}%`,
        DGS2: (v) => `${v.toFixed(2)}%`,
        FEDFUNDS: (v) => `${v.toFixed(2)}%`,
        UNRATE: (v) => `${v.toFixed(1)}%`,
        CPIAUCSL: (v) => `${v.toFixed(1)}`,
        BAMLH0A0HYM2: (v) => `${v.toFixed(0)}bps`,
        T10Y2Y: (v) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(0)}bps`,
        VIXCLS: (v) => `${v.toFixed(1)}`,
        MORTGAGE30US: (v) => `${v.toFixed(2)}%`,
      };

      const labelMap: Record<string, string> = {
        DGS10: "10Y UST",
        DGS2: "2Y UST",
        FEDFUNDS: "Fed Funds",
        UNRATE: "Unemployment",
        CPIAUCSL: "CPI",
        BAMLH0A0HYM2: "HY Spread",
        T10Y2Y: "Yield Curve",
        VIXCLS: "VIX",
        MORTGAGE30US: "30Y Mortgage",
      };

      for (const m of latestMacro) {
        const fmt = formatMap[m.series_id];
        const label = labelMap[m.series_id] ?? m.label;
        tickers.push({
          label,
          value: fmt ? fmt(Number(m.value)) : `${Number(m.value).toFixed(2)}`,
        });
      }

      // Add private market metrics
      const [sectorRes, dealRes, distressedRes] = await Promise.all([
        supabase
          .from("mv_sector_multiples")
          .select("sector, ev_rev_median, ev_rev_count")
          .order("ev_rev_count", { ascending: false })
          .limit(3),
        supabase
          .from("deal_transactions")
          .select("deal_value, announced_date, is_synthetic")
          .eq("is_synthetic", false)
          .order("announced_date", { ascending: false })
          .limit(10),
        supabase
          .from("distressed_assets")
          .select("id")
          .eq("status", "active"),
      ]);

      // Sector multiples
      (sectorRes.data ?? []).forEach((s: any) => {
        if (s.ev_rev_median && s.ev_rev_median > 0) {
          tickers.push({
            label: `${(s.sector ?? "").slice(0, 12)} EV/Rev`,
            value: `${Number(s.ev_rev_median).toFixed(1)}x`,
          });
        }
      });

      // Real deal flow
      const realDeals = dealRes.data ?? [];
      if (realDeals.length > 0) {
        const totalVal = realDeals.reduce((s: number, d: any) => s + (d.deal_value ?? 0), 0);
        if (totalVal > 0) {
          tickers.push({
            label: "M&A Volume",
            value: totalVal >= 1e9 ? `$${(totalVal / 1e9).toFixed(1)}B` : `$${(totalVal / 1e6).toFixed(0)}M`,
          });
        }
      }

      // Distressed count
      const distressedCount = distressedRes.data?.length ?? 0;
      if (distressedCount > 0) {
        tickers.push({ label: "Distressed", value: `${distressedCount} active` });
      }

      return tickers;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (!items?.length) return null;

  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden relative">
      <motion.div
        className="flex items-center gap-6 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
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
