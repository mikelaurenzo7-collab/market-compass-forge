import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, BookOpen, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { STAGE_LABELS } from "./types";

interface UpdatesTabProps {
  decisions: any[];
  dealId: string;
}

const UpdatesTab = ({ decisions, dealId }: UpdatesTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showLogger, setShowLogger] = useState(false);
  const [logForm, setLogForm] = useState({ decision_type: "note", rationale: "" });

  const addDecision = useMutation({
    mutationFn: async () => {
      if (!user || !logForm.rationale.trim()) return;
      const { error } = await supabase.from("decision_log").insert({
        deal_id: dealId, user_id: user.id,
        decision_type: logForm.decision_type, rationale: logForm.rationale.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-decisions", dealId] });
      setLogForm({ decision_type: "note", rationale: "" });
      setShowLogger(false);
      toast.success("Entry logged");
    },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Decision Journal & Updates</h3>
        <button onClick={() => setShowLogger(!showLogger)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
          <Plus className="h-3 w-3" /> Log Entry
        </button>
      </div>

      {showLogger && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <select value={logForm.decision_type} onChange={(e) => setLogForm({ ...logForm, decision_type: e.target.value })} className="h-9 w-full px-3 rounded-md border border-border bg-background text-sm text-foreground">
            <option value="note">IC Note</option>
            <option value="kpi_update">KPI Update</option>
            <option value="risk_flag">Risk Flag</option>
            <option value="thesis_update">Thesis Update</option>
            <option value="meeting_note">Meeting Note</option>
            <option value="memo">Investment Memo</option>
          </select>
          <textarea
            value={logForm.rationale}
            onChange={(e) => setLogForm({ ...logForm, rationale: e.target.value })}
            rows={3}
            placeholder="What happened? What did you decide? Why?"
            className="w-full rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <button onClick={() => addDecision.mutate()} disabled={!logForm.rationale.trim() || addDecision.isPending} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            {addDecision.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save Entry
          </button>
        </div>
      )}

      {decisions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No entries yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Log IC notes, KPI updates, risk flags, and memos to build institutional memory.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {decisions.map((d: any) => (
            <div key={d.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${
                    d.decision_type === "risk_flag" ? "bg-destructive/10 text-destructive" :
                    d.decision_type === "kpi_update" ? "bg-success/10 text-success" :
                    d.decision_type === "stage_change" ? "bg-primary/10 text-primary" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {d.decision_type.replace(/_/g, " ")}
                  </span>
                  {d.from_state && d.to_state && (
                    <span className="text-[10px] text-muted-foreground">{STAGE_LABELS[d.from_state] ?? d.from_state} → {STAGE_LABELS[d.to_state] ?? d.to_state}</span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/60">{format(new Date(d.created_at), "MMM d, yyyy")}</span>
              </div>
              {d.rationale && <p className="text-sm text-foreground leading-relaxed">{d.rationale}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpdatesTab;
