import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SECFiling {
  id: string;
  company_id: string;
  cik_number: string;
  accession_number: string;
  filing_type: string;
  filing_date: string;
  description: string | null;
  primary_document_url: string | null;
  created_at: string;
}

export interface SECFinancialFact {
  id: string;
  company_id: string;
  cik_number: string;
  taxonomy: string;
  concept: string;
  period_start: string | null;
  period_end: string;
  value: number;
  unit: string;
  form_type: string | null;
  filed_date: string | null;
  created_at: string;
}

export function useSECFilings(companyId: string | undefined) {
  return useQuery({
    queryKey: ["sec-filings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sec_filings")
        .select("*")
        .eq("company_id", companyId!)
        .order("filing_date", { ascending: false });
      if (error) throw error;
      return data as SECFiling[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}

export function useSECFinancials(companyId: string | undefined) {
  return useQuery({
    queryKey: ["sec-financials", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sec_financial_facts")
        .select("*")
        .eq("company_id", companyId!)
        .order("period_end", { ascending: false });
      if (error) throw error;
      return data as SECFinancialFact[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}

export function useFetchSECData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, cik, action = "all" }: { companyId: string; cik: string; action?: string }) => {
      const { data, error } = await supabase.functions.invoke("fetch-sec-filings", {
        body: { companyId, cik, action },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sec-filings", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["sec-financials", variables.companyId] });
    },
  });
}

/** Group financial facts by concept for charting */
export function groupFactsByConcept(facts: SECFinancialFact[]) {
  const map: Record<string, SECFinancialFact[]> = {};
  for (const f of facts) {
    if (!map[f.concept]) map[f.concept] = [];
    map[f.concept].push(f);
  }
  // Sort each group by period_end ascending
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => a.period_end.localeCompare(b.period_end));
  }
  return map;
}

const CONCEPT_LABELS: Record<string, string> = {
  Revenues: "Revenue",
  RevenueFromContractWithCustomerExcludingAssessedTax: "Revenue",
  NetIncomeLoss: "Net Income",
  Assets: "Total Assets",
  EarningsPerShareBasic: "EPS",
  OperatingIncomeLoss: "Operating Income",
  GrossProfit: "Gross Profit",
  StockholdersEquity: "Equity",
  LongTermDebt: "Long-Term Debt",
  CashAndCashEquivalentsAtCarryingValue: "Cash & Equivalents",
};

export function getConceptLabel(concept: string) {
  return CONCEPT_LABELS[concept] ?? concept;
}
