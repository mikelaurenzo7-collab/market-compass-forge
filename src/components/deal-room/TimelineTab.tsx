import { Clock } from "lucide-react";
import { format } from "date-fns";
import { STAGE_LABELS } from "./types";

interface TimelineTabProps {
  decisions: any[];
}

const TimelineTab = ({ decisions }: TimelineTabProps) => {
  if (decisions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center max-w-lg mx-auto">
        <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No timeline events yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Stage changes, votes, and notes will appear here</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-1">
      {decisions.map((d: any, i: number) => (
        <div key={d.id} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`h-7 w-7 rounded-full border-2 bg-card flex items-center justify-center shrink-0 ${
              d.decision_type === "stage_change" ? "border-primary" : "border-border"
            }`}>
              <Clock className="h-3 w-3 text-muted-foreground" />
            </div>
            {i < decisions.length - 1 && <div className="w-px flex-1 bg-border/50" />}
          </div>
          <div className="pb-4 flex-1">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground capitalize">{d.decision_type.replace(/_/g, " ")}</span>
                {d.from_state && d.to_state && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {STAGE_LABELS[d.from_state] ?? d.from_state} → {STAGE_LABELS[d.to_state] ?? d.to_state}
                  </span>
                )}
              </div>
              {d.rationale && <p className="text-xs text-muted-foreground mt-1">{d.rationale}</p>}
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">{format(new Date(d.created_at), "MMM d, yyyy h:mm a")}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineTab;
