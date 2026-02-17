import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-enrich a company when viewing it, if no enrichment data exists
 * or data is older than 7 days. Uses Firecrawl to scrape real company data.
 */
export function useAutoEnrich(companyId: string | undefined, enabled: boolean) {
  const triggered = useRef(false);

  const { data: enrichments } = useQuery({
    queryKey: ["enrichments-check", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_enrichments")
        .select("id, scraped_at")
        .eq("company_id", companyId!)
        .order("scraped_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!companyId || !enabled || triggered.current) return;

    const shouldEnrich = (() => {
      if (!enrichments || enrichments.length === 0) return true;
      // Re-enrich if data is older than 7 days
      const lastScraped = new Date(enrichments[0].scraped_at);
      const daysSince = (Date.now() - lastScraped.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 7;
    })();

    if (!shouldEnrich) return;

    triggered.current = true;

    supabase.functions
      .invoke("enrich-company", { body: { companyId } })
      .then(({ error }) => {
        if (error) console.error("Auto-enrich failed:", error);
      });
  }, [companyId, enabled, enrichments]);
}
