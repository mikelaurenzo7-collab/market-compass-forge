import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { MarketFilter } from "@/components/MarketToggle";

export type Company = {
  id: string;
  name: string;
  domain: string | null;
  sector: string | null;
  sub_sector: string | null;
  hq_country: string | null;
  hq_city: string | null;
  founded_year: number | null;
  description: string | null;
  employee_count: number | null;
  stage: string | null;
  status: string | null;
  market_type?: string | null;
};

export type FundingRound = {
  id: string;
  company_id: string;
  round_type: string;
  amount: number | null;
  valuation_pre: number | null;
  valuation_post: number | null;
  date: string | null;
  lead_investors: string[] | null;
  co_investors: string[] | null;
  confidence_score: string | null;
};

export type Financial = {
  id: string;
  company_id: string;
  period: string;
  revenue: number | null;
  arr: number | null;
  gross_margin: number | null;
  burn_rate: number | null;
  ebitda: number | null;
  source: string | null;
  confidence_score: string | null;
};

export type ActivityEvent = {
  id: string;
  company_id: string | null;
  event_type: string;
  headline: string;
  detail: string | null;
  published_at: string | null;
  companies?: { name: string; sector: string | null } | null;
};

export const useCompanies = () =>
  useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

export const useCompany = (id: string) =>
  useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Company | null;
    },
    enabled: !!id,
  });

export const useCompanyFunding = (companyId: string) =>
  useQuery({
    queryKey: ["funding", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funding_rounds")
        .select("*")
        .eq("company_id", companyId)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as FundingRound[];
    },
    enabled: !!companyId,
  });

export const useCompanyFinancials = (companyId: string) =>
  useQuery({
    queryKey: ["financials", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financials")
        .select("*")
        .eq("company_id", companyId)
        .order("period", { ascending: false });
      if (error) throw error;
      return data as Financial[];
    },
    enabled: !!companyId,
  });

export const useActivityEvents = (companyId?: string) =>
  useQuery({
    queryKey: ["activity_events", companyId],
    queryFn: async () => {
      let query = supabase
        .from("activity_events")
        .select("*, companies(name, sector)")
        .order("published_at", { ascending: false })
        .limit(20);
      if (companyId) query = query.eq("company_id", companyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityEvent[];
    },
  });

export const useDashboardMetrics = () =>
  useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const [companiesRes, roundsRes] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("funding_rounds").select("amount, valuation_post, date").order("date", { ascending: false }),
      ]);

      const totalCompanies = companiesRes.count ?? 0;
      const rounds = roundsRes.data ?? [];

      const totalDealValue = rounds.reduce((sum, r) => sum + (r.amount ?? 0), 0);
      const valuations = rounds.filter((r) => r.valuation_post).map((r) => r.valuation_post!);
      valuations.sort((a, b) => a - b);
      const medianValuation = valuations.length
        ? valuations[Math.floor(valuations.length / 2)]
        : 0;

      return { totalCompanies, totalDealValue, medianValuation, totalRounds: rounds.length };
    },
  });

export const useSectorData = () =>
  useQuery({
    queryKey: ["sector-data"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sectors").select("name, deal_count_trailing_12m").order("deal_count_trailing_12m", { ascending: false }).limit(8);
      if (error) throw error;
      return data;
    },
  });

export const useDealFlowData = () =>
  useQuery({
    queryKey: ["deal-flow"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funding_rounds")
        .select("amount, date")
        .not("date", "is", null)
        .order("date", { ascending: true });
      if (error) throw error;

      // Group by month
      const byMonth: Record<string, { deals: number; value: number }> = {};
      (data ?? []).forEach((r) => {
        const d = new Date(r.date!);
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
        if (!byMonth[key]) byMonth[key] = { deals: 0, value: 0 };
        byMonth[key].deals++;
        byMonth[key].value += (r.amount ?? 0) / 1e9;
      });

      return Object.entries(byMonth)
        .slice(-8)
        .map(([month, d]) => ({ month, deals: d.deals, value: Math.round(d.value * 10) / 10 }));
    },
  });

export const useCompaniesWithFinancials = () =>
  useQuery({
    queryKey: ["companies-with-financials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, sector, stage, hq_country, employee_count, founded_year, domain")
        .order("name");
      if (error) throw error;

      // Get latest funding round and financials for each
      const companyIds = data.map((c) => c.id);

      const [fundingRes, financialsRes] = await Promise.all([
        supabase.from("funding_rounds").select("company_id, round_type, valuation_post, amount, date").in("company_id", companyIds).order("date", { ascending: false }),
        supabase.from("financials").select("company_id, arr, revenue").in("company_id", companyIds).order("period", { ascending: false }),
      ]);

      const latestFunding: Record<string, (typeof fundingRes.data)[0]> = {};
      (fundingRes.data ?? []).forEach((r) => {
        if (!latestFunding[r.company_id]) latestFunding[r.company_id] = r;
      });

      const latestFinancials: Record<string, (typeof financialsRes.data)[0]> = {};
      (financialsRes.data ?? []).forEach((f) => {
        if (!latestFinancials[f.company_id]) latestFinancials[f.company_id] = f;
      });

      return data.map((c) => ({
        ...c,
        latestRound: latestFunding[c.id] ?? null,
        latestFinancials: latestFinancials[c.id] ?? null,
      }));
    },
  });

export const useSearchCompanies = (query: string) =>
  useQuery({
    queryKey: ["search-companies", query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, sector, stage")
        .ilike("name", `%${query}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });

export const useSearchInvestors = (query: string) =>
  useQuery({
    queryKey: ["search-investors", query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("id, name, type")
        .ilike("name", `%${query}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });

export const usePublicMarketData = (companyId: string) =>
  useQuery({
    queryKey: ["public-market-data", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_market_data")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

export const usePublicMarketLeaders = () =>
  useQuery({
    queryKey: ["public-market-leaders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_market_data")
        .select("*, companies(id, name, sector, stage)")
        .order("market_cap", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

export const usePublicMarketMovers = () =>
  useQuery({
    queryKey: ["public-market-movers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_market_data")
        .select("*, companies(id, name, sector)")
        .order("price_change_pct", { ascending: false })
        .limit(40);
      if (error) throw error;
      const gainers = (data ?? []).slice(0, 5);
      const losers = (data ?? []).reverse().slice(0, 5).reverse();
      return { gainers, losers };
    },
  });

export const useCompaniesFiltered = (marketType: MarketFilter = "all") =>
  useQuery({
    queryKey: ["companies-filtered", marketType],
    queryFn: async () => {
      let query = supabase.from("companies").select("*").order("name");
      if (marketType !== "all") query = query.eq("market_type", marketType);
      const { data, error } = await query;
      if (error) throw error;
      return data as Company[];
    },
  });

export const useCompaniesWithFinancialsFiltered = (marketType: MarketFilter = "all") =>
  useQuery({
    queryKey: ["companies-with-financials", marketType],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select("id, name, sector, stage, hq_country, employee_count, founded_year, domain, market_type")
        .order("name");
      if (marketType !== "all") query = query.eq("market_type", marketType);
      const { data, error } = await query;
      if (error) throw error;

      const companyIds = data.map((c) => c.id);

      const [fundingRes, financialsRes, marketDataRes] = await Promise.all([
        supabase.from("funding_rounds").select("company_id, round_type, valuation_post, amount, date").in("company_id", companyIds).order("date", { ascending: false }),
        supabase.from("financials").select("company_id, arr, revenue").in("company_id", companyIds).order("period", { ascending: false }),
        supabase.from("public_market_data").select("company_id, ticker, market_cap, pe_ratio, price_change_pct, price").in("company_id", companyIds),
      ]);

      const latestFunding: Record<string, (typeof fundingRes.data)[0]> = {};
      (fundingRes.data ?? []).forEach((r) => {
        if (!latestFunding[r.company_id]) latestFunding[r.company_id] = r;
      });

      const latestFinancials: Record<string, (typeof financialsRes.data)[0]> = {};
      (financialsRes.data ?? []).forEach((f) => {
        if (!latestFinancials[f.company_id]) latestFinancials[f.company_id] = f;
      });

      const marketData: Record<string, (typeof marketDataRes.data)[0]> = {};
      (marketDataRes.data ?? []).forEach((m) => {
        marketData[m.company_id] = m;
      });

      return data.map((c) => ({
        ...c,
        latestRound: latestFunding[c.id] ?? null,
        latestFinancials: latestFinancials[c.id] ?? null,
        publicMarketData: marketData[c.id] ?? null,
      }));
    },
  });

export const formatCurrency = (value: number | null, compact = true): string => {
  if (value === null || value === undefined) return "—";
  if (compact) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
};

export const formatPercent = (value: number | null): string => {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(0)}%`;
};
