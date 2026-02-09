import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "./useData";

export const useValuationByStage = () =>
  useQuery({
    queryKey: ["valuation-by-stage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funding_rounds")
        .select("round_type, valuation_post")
        .not("valuation_post", "is", null);
      if (error) throw error;

      const grouped: Record<string, number[]> = {};
      (data ?? []).forEach((r) => {
        if (!grouped[r.round_type]) grouped[r.round_type] = [];
        grouped[r.round_type].push(r.valuation_post!);
      });

      return Object.entries(grouped)
        .map(([stage, vals]) => ({
          stage,
          median: vals.sort((a, b) => a - b)[Math.floor(vals.length / 2)] / 1e9,
          count: vals.length,
        }))
        .sort((a, b) => a.median - b.median);
    },
  });

export const useGeographicDistribution = () =>
  useQuery({
    queryKey: ["geo-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("hq_country")
        .not("hq_country", "is", null);
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data ?? []).forEach((c) => {
        const country = c.hq_country!;
        counts[country] = (counts[country] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

export const useTopCompaniesByARR = () =>
  useQuery({
    queryKey: ["top-arr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financials")
        .select("company_id, arr, companies(name, sector)")
        .not("arr", "is", null)
        .order("arr", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Deduplicate by company (take highest ARR)
      const seen = new Set<string>();
      const results: { name: string; sector: string | null; arr: number }[] = [];
      (data ?? []).forEach((f: any) => {
        if (!seen.has(f.company_id) && f.companies) {
          seen.add(f.company_id);
          results.push({
            name: f.companies.name,
            sector: f.companies.sector,
            arr: f.arr,
          });
        }
      });

      return results.slice(0, 10);
    },
  });

export const useInvestors = () =>
  useQuery({
    queryKey: ["investors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

export const useInvestorPortfolio = (investorId: string | null) =>
  useQuery({
    queryKey: ["investor-portfolio", investorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_company")
        .select("company_id, round_id, companies(id, name, sector, stage), funding_rounds(round_type, amount, date)")
        .eq("investor_id", investorId!);
      if (error) throw error;

      // Deduplicate by company
      const seen = new Set<string>();
      return (data ?? []).filter((d: any) => {
        if (seen.has(d.company_id)) return false;
        seen.add(d.company_id);
        return true;
      });
    },
    enabled: !!investorId,
  });

export { formatCurrency };
