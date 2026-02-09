import { useActivityEvents } from "@/hooks/useData";
import { Clock, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const ActivityFeed = () => {
  const { data: events, isLoading } = useActivityEvents();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card animate-fade-in">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Live Activity Feed</h3>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse-slow" />
          <span className="text-[10px] font-mono text-success uppercase">Live</span>
        </div>
      </div>
      <div className="divide-y divide-border/50">
        {(events ?? []).slice(0, 8).map((e) => (
          <div
            key={e.id}
            onClick={() => e.company_id && navigate(`/companies/${e.company_id}`)}
            className="px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
                  {e.headline}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {e.published_at ? formatDistanceToNow(new Date(e.published_at), { addSuffix: true }) : "—"}
                  </span>
                  {e.companies?.sector && (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                      {e.companies.sector}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
            </div>
          </div>
        ))}
        {(!events || events.length === 0) && (
          <div className="p-6 text-center text-sm text-muted-foreground">No activity events</div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
