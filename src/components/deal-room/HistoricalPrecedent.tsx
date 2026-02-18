import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowRight, Tag, Loader2 } from "lucide-react";
import { STAGE_LABELS } from "./types";

interface HistoricalPrecedentProps {
  companyId: string;
  dealId: string;
}

const HistoricalPrecedent = ({ companyId, dealId }: HistoricalPrecedentProps) => {
  const navigate = useNavigate();

  const { data: similar, isLoading } = useQuery({
    queryKey: ["similar-deals", companyId, dealId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("find_similar_deals", {
        target_company_id: companyId,
        target_deal_id: dealId,
        result_limit: 3,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId && !!dealId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-primary" /> Historical Precedent
        </h3>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!similar || similar.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-primary" /> Historical Precedent
      </h3>
      <p className="text-[10px] text-muted-foreground mb-3">
        Similar deals your firm has evaluated in the past.
      </p>
      <div className="space-y-2">
        {similar.map((d: any) => (
          <button
            key={d.deal_id}
            onClick={() => navigate(`/deals/${d.deal_id}`)}
            className="w-full text-left rounded-md border border-border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                {d.company_name}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              {d.company_sector && (
                <span className="text-[10px] text-muted-foreground">{d.company_sector}</span>
              )}
              <span className="text-[10px] font-medium text-primary/80">
                {STAGE_LABELS[d.stage] ?? d.stage}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <Tag className="h-2.5 w-2.5 text-primary/60" />
              <span className="text-[10px] text-primary/70 font-medium">{d.similarity_reason}</span>
            </div>
            {d.thesis && (
              <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {d.thesis}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HistoricalPrecedent;
