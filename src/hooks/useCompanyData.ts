import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type KPIMetric = {
  id: string;
  company_id: string;
  metric_name: string;
  value: number;
  period: string;
  period_type: string;
  definition_source: string | null;
  confidence_score: string | null;
  created_at: string;
};

export type CapTableEntry = {
  id: string;
  company_id: string;
  snapshot_date: string;
  shareholder_name: string;
  share_class: string;
  shares: number;
  ownership_pct: number | null;
  notes: string | null;
  created_at: string;
};

export type CompanyDocument = {
  id: string;
  company_id: string;
  file_name: string;
  file_url: string;
  document_type: string;
  extracted_metrics: Record<string, unknown>;
  citations: unknown[];
  version: number;
  ai_summary: string | null;
  red_flags: unknown[];
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FundingRoundWithTerms = {
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
  instrument_type: string | null;
  liquidation_preference: number | null;
  participation_cap: number | null;
  anti_dilution_type: string | null;
  option_pool_pct: number | null;
  pro_rata_rights: boolean | null;
};

export const useCompanyKPIs = (companyId: string) =>
  useQuery({
    queryKey: ["kpi-metrics", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_metrics")
        .select("*")
        .eq("company_id", companyId)
        .order("period", { ascending: true });
      if (error) throw error;
      return data as KPIMetric[];
    },
    enabled: !!companyId,
  });

export const useCapTable = (companyId: string) =>
  useQuery({
    queryKey: ["cap-table", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cap_table_snapshots")
        .select("*")
        .eq("company_id", companyId)
        .order("snapshot_date", { ascending: false });
      if (error) throw error;
      return data as CapTableEntry[];
    },
    enabled: !!companyId,
  });

export const useCompanyDocuments = (companyId: string) =>
  useQuery({
    queryKey: ["company-documents", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CompanyDocument[];
    },
    enabled: !!companyId,
  });

export const useFundingRoundsWithTerms = (companyId: string) =>
  useQuery({
    queryKey: ["funding-rounds-terms", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funding_rounds")
        .select("*")
        .eq("company_id", companyId)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as FundingRoundWithTerms[];
    },
    enabled: !!companyId,
  });

export const useKeyPersonnel = (companyId: string) =>
  useQuery({
    queryKey: ["key-personnel", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("key_personnel")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
