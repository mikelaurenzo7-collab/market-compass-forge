import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Globe, Newspaper, ExternalLink } from "lucide-react";
import ConfidenceBadge from "@/components/ConfidenceBadge";

interface EnrichmentPanelProps {
  companyId: string;
  companyName: string;
}

const EnrichmentPanel = ({ companyId, companyName }: EnrichmentPanelProps) => {
  const queryClient = useQueryClient();

  const { data: enrichments, isLoading } = useQuery({
    queryKey: ["enrichments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_enrichments")
        .select("*")
        .eq("company_id", companyId)
        .order("scraped_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const enrich = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("enrich-company", {
        body: { companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrichments", companyId] });
    },
  });

  const typeIcon = (type: string) => {
    switch (type) {
      case "website": return <Globe className="h-3.5 w-3.5 text-primary" />;
      case "news": return <Newspaper className="h-3.5 w-3.5 text-warning" />;
      default: return <Globe className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Enriched Data</h3>
        <button
          onClick={() => enrich.mutate()}
          disabled={enrich.isPending}
          className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {enrich.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {enrich.isPending ? "Enriching…" : "Enrich Now"}
        </button>
      </div>

      <div className="divide-y divide-border/50 max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="p-6 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && enrichments && enrichments.length > 0
          ? enrichments.map((e) => (
              <div key={e.id} className="px-4 py-3 space-y-1">
                <div className="flex items-start gap-2">
                  {typeIcon(e.data_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {e.title || "Untitled"}
                      </p>
                      <ConfidenceBadge
                        level={e.confidence_score}
                        source={e.source_name}
                        scrapedAt={e.scraped_at}
                      />
                    </div>
                    {e.summary && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {e.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(e.scraped_at).toLocaleDateString()}
                      </span>
                      {e.source_url && (
                        <a
                          href={e.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          : !isLoading && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No enrichment data yet. Click "Enrich Now" to scrape.
              </div>
            )}
      </div>
    </div>
  );
};

export default EnrichmentPanel;
