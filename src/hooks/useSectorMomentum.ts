import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, format } from "date-fns";

export type SectorFlow = {
  sector: string;
  dealCount: number;
  totalCapital: number;
  avgDealSize: number;
  trend: number; // % change vs prior period
  sentimentScore: number; // -1 to 1
  sentimentVelocity: number; // rate of change
  signalDirection: "bullish" | "bearish" | "neutral";
  signalMagnitude: number;
  confidence: string;
};

export type SectorTimeSeries = {
  month: string;
  sector: string;
  deals: number;
  capital: number;
};

export const useSectorMomentum = () =>
  useQuery({
    queryKey: ["sector-momentum"],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString().split("T")[0];
      const twelveMonthsAgo = subMonths(new Date(), 12).toISOString().split("T")[0];

      const [recentRounds, priorRounds, signals, alphaSignals] = await Promise.all([
        supabase
          .from("funding_rounds")
          .select("company_id, amount, date, companies(sector)")
          .gte("date", sixMonthsAgo)
          .not("date", "is", null),
        supabase
          .from("funding_rounds")
          .select("company_id, amount, date, companies(sector)")
          .gte("date", twelveMonthsAgo)
          .lt("date", sixMonthsAgo)
          .not("date", "is", null),
        supabase
          .from("intelligence_signals")
          .select("sentiment, tags, created_at")
          .gte("created_at", sixMonthsAgo)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("alpha_signals")
          .select("sector, direction, magnitude_pct, confidence, generated_at")
          .order("generated_at", { ascending: false })
          .limit(50),
      ]);

      // Aggregate recent by sector
      const recentBySector: Record<string, { deals: number; capital: number }> = {};
      (recentRounds.data ?? []).forEach((r: any) => {
        const sector = r.companies?.sector || "Other";
        if (!recentBySector[sector]) recentBySector[sector] = { deals: 0, capital: 0 };
        recentBySector[sector].deals++;
        recentBySector[sector].capital += r.amount ?? 0;
      });

      // Aggregate prior by sector
      const priorBySector: Record<string, { deals: number; capital: number }> = {};
      (priorRounds.data ?? []).forEach((r: any) => {
        const sector = r.companies?.sector || "Other";
        if (!priorBySector[sector]) priorBySector[sector] = { deals: 0, capital: 0 };
        priorBySector[sector].deals++;
        priorBySector[sector].capital += r.amount ?? 0;
      });

      // Sentiment by sector tag
      const sentimentMap: Record<string, { total: number; count: number }> = {};
      (signals.data ?? []).forEach((s: any) => {
        const score = s.sentiment === "bullish" ? 1 : s.sentiment === "bearish" ? -1 : 0;
        (s.tags ?? []).forEach((tag: string) => {
          if (!sentimentMap[tag]) sentimentMap[tag] = { total: 0, count: 0 };
          sentimentMap[tag].total += score;
          sentimentMap[tag].count++;
        });
      });

      // Latest alpha signal per sector
      const latestAlpha: Record<string, { direction: string; magnitude: number; confidence: string }> = {};
      (alphaSignals.data ?? []).forEach((a: any) => {
        if (!latestAlpha[a.sector]) {
          latestAlpha[a.sector] = {
            direction: a.direction,
            magnitude: a.magnitude_pct ?? 0,
            confidence: a.confidence,
          };
        }
      });

      // Build sector flows
      const allSectors = new Set([...Object.keys(recentBySector), ...Object.keys(priorBySector)]);
      const flows: SectorFlow[] = [];

      allSectors.forEach((sector) => {
        const recent = recentBySector[sector] ?? { deals: 0, capital: 0 };
        const prior = priorBySector[sector] ?? { deals: 0, capital: 0 };
        const trend = prior.capital > 0 ? ((recent.capital - prior.capital) / prior.capital) * 100 : recent.capital > 0 ? 100 : 0;

        const sent = sentimentMap[sector];
        const sentimentScore = sent ? sent.total / sent.count : 0;
        const alpha = latestAlpha[sector];

        flows.push({
          sector,
          dealCount: recent.deals,
          totalCapital: recent.capital,
          avgDealSize: recent.deals > 0 ? recent.capital / recent.deals : 0,
          trend,
          sentimentScore,
          sentimentVelocity: Math.abs(sentimentScore) > 0.3 ? sentimentScore * 2 : sentimentScore,
          signalDirection: (alpha?.direction as any) ?? "neutral",
          signalMagnitude: alpha?.magnitude ?? 0,
          confidence: alpha?.confidence ?? "medium",
        });
      });

      // Sort by capital flow
      flows.sort((a, b) => b.totalCapital - a.totalCapital);

      // Time series for top sectors (monthly)
      const timeSeries: SectorTimeSeries[] = [];
      const topSectors = flows.slice(0, 8).map((f) => f.sector);
      const allRounds = [...(recentRounds.data ?? []), ...(priorRounds.data ?? [])];

      const monthBuckets: Record<string, Record<string, { deals: number; capital: number }>> = {};
      allRounds.forEach((r: any) => {
        const sector = r.companies?.sector || "Other";
        if (!topSectors.includes(sector)) return;
        const month = format(new Date(r.date), "MMM yy");
        if (!monthBuckets[month]) monthBuckets[month] = {};
        if (!monthBuckets[month][sector]) monthBuckets[month][sector] = { deals: 0, capital: 0 };
        monthBuckets[month][sector].deals++;
        monthBuckets[month][sector].capital += r.amount ?? 0;
      });

      Object.entries(monthBuckets).forEach(([month, sectors]) => {
        Object.entries(sectors).forEach(([sector, data]) => {
          timeSeries.push({ month, sector, deals: data.deals, capital: data.capital });
        });
      });

      // Rotation detection: sectors gaining vs losing share
      const rotations = flows
        .filter((f) => Math.abs(f.trend) > 10)
        .sort((a, b) => b.trend - a.trend);

      const gaining = rotations.filter((r) => r.trend > 0).slice(0, 5);
      const declining = rotations.filter((r) => r.trend < 0).slice(0, 5);

      return { flows: flows.slice(0, 15), timeSeries, gaining, declining, topSectors };
    },
    staleTime: 5 * 60 * 1000,
  });
