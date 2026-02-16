import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  MessageSquare, Send, Trash2, ChevronDown, ChevronRight, 
  Clock, User, Shield, FileText, CheckCircle2, XCircle, AlertTriangle,
  UserPlus, History, BarChart3
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// ============================
// Deal Comments
// ============================
export function DealComments({ dealId }: { dealId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const { data: comments } = useQuery({
    queryKey: ["deal-comments", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_comments")
        .select("*")
        .eq("deal_id", dealId)
        .is("parent_id", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from("deal_comments").insert({
        deal_id: dealId,
        user_id: user!.id,
        content: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-comments", dealId] });
      setContent("");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deal_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deal-comments", dealId] }),
  });

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" /> Comments
      </h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {comments?.map((c) => (
          <div key={c.id} className="p-2.5 rounded-md bg-secondary/30 group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{c.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  <span className="font-mono">{c.user_id.slice(0, 8)}</span> · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </p>
              </div>
              {c.user_id === user?.id && (
                <button onClick={() => deleteComment.mutate(c.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
        {(!comments || comments.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (content.trim()) addComment.mutate(content.trim()); }} className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" disabled={!content.trim()} className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

// ============================
// Decision Log (immutable audit trail)
// ============================
export function DecisionLog({ dealId }: { dealId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rationale, setRationale] = useState("");
  const [decisionType, setDecisionType] = useState("note");

  const { data: logs } = useQuery({
    queryKey: ["decision-log", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_log")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("decision_log").insert({
        deal_id: dealId,
        user_id: user!.id,
        decision_type: decisionType,
        rationale: rationale || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decision-log", dealId] });
      setRationale("");
      toast({ title: "Decision logged" });
    },
  });

  const typeIcons: Record<string, React.ReactNode> = {
    stage_change: <ChevronRight className="h-3.5 w-3.5 text-primary" />,
    approval: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
    rejection: <XCircle className="h-3.5 w-3.5 text-destructive" />,
    escalation: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
    note: <FileText className="h-3.5 w-3.5 text-muted-foreground" />,
  };

  const typeColors: Record<string, string> = {
    stage_change: "border-primary/30 bg-primary/5",
    approval: "border-success/30 bg-success/5",
    rejection: "border-destructive/30 bg-destructive/5",
    escalation: "border-warning/30 bg-warning/5",
    note: "border-border bg-secondary/30",
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5" /> Decision Log <span className="text-[10px] font-normal">(immutable)</span>
      </h4>

      {/* Add entry */}
      <div className="p-3 rounded-md border border-border bg-card space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {["note", "approval", "rejection", "escalation"].map((t) => (
            <button
              key={t}
              onClick={() => setDecisionType(t)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-colors ${
                decisionType === t ? typeColors[t] + " text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Rationale / decision note..."
            className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button onClick={() => addEntry.mutate()} disabled={!rationale.trim()} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
            Log
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {logs?.map((log) => (
          <div key={log.id} className={`p-2.5 rounded-md border ${typeColors[log.decision_type] || typeColors.note}`}>
            <div className="flex items-start gap-2">
              {typeIcons[log.decision_type] || typeIcons.note}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-foreground uppercase">{log.decision_type.replace("_", " ")}</span>
                  {log.from_state && log.to_state && (
                    <span className="text-[10px] text-muted-foreground">{log.from_state} → {log.to_state}</span>
                  )}
                </div>
                {log.rationale && <p className="text-xs text-foreground mt-0.5">{log.rationale}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">
                  <span className="font-mono">{log.user_id.slice(0, 8)}</span> · {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        ))}
        {(!logs || logs.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-4">No decisions logged yet</p>
        )}
      </div>
    </div>
  );
}

// ============================
// IC Template Selector
// ============================
export function ICTemplateSelector({ strategy, onSelect }: { strategy?: string; onSelect: (template: any) => void }) {
  const { data: templates } = useQuery({
    queryKey: ["ic-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ic_templates")
        .select("*")
        .order("strategy");
      if (error) throw error;
      return data;
    },
  });

  const strategyColors: Record<string, string> = {
    growth: "border-success/30 bg-success/5 text-success",
    buyout: "border-primary/30 bg-primary/5 text-primary",
    distressed: "border-warning/30 bg-warning/5 text-warning",
    real_estate: "border-chart-4/30 bg-chart-4/5 text-chart-4",
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" /> IC Templates
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {templates?.map((t) => {
          const sections = Array.isArray(t.sections) ? t.sections : [];
          const checklist = Array.isArray(t.checklist) ? t.checklist : [];
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className={`p-3 rounded-md border text-left transition-all hover:shadow-md ${
                strategy === t.strategy ? strategyColors[t.strategy] || "border-border" : "border-border hover:border-primary/30"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <span>{sections.length} sections</span>
                <span>{checklist.length} checklist items</span>
                <span>{t.required_approvals} approvals req'd</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================
// Decision Outcome Tracker
// ============================
export function DecisionOutcomes({ dealId }: { dealId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    outcome_type: "unrealized",
    actual_return_multiple: "",
    predicted_return_multiple: "",
    notes: "",
    lessons_learned: "",
  });

  const { data: outcomes } = useQuery({
    queryKey: ["decision-outcomes", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_outcomes")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });

  const addOutcome = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("decision_outcomes").insert({
        deal_id: dealId,
        created_by: user!.id,
        outcome_type: form.outcome_type,
        actual_return_multiple: form.actual_return_multiple ? Number(form.actual_return_multiple) : null,
        predicted_return_multiple: form.predicted_return_multiple ? Number(form.predicted_return_multiple) : null,
        notes: form.notes || null,
        lessons_learned: form.lessons_learned || null,
        model_accuracy_score: form.actual_return_multiple && form.predicted_return_multiple
          ? Math.max(0, 100 - Math.abs(Number(form.actual_return_multiple) - Number(form.predicted_return_multiple)) * 20)
          : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decision-outcomes", dealId] });
      setForm({ outcome_type: "unrealized", actual_return_multiple: "", predicted_return_multiple: "", notes: "", lessons_learned: "" });
      setExpanded(false);
      toast({ title: "Outcome recorded" });
    },
  });

  const outcomeColors: Record<string, string> = {
    realized: "text-success",
    unrealized: "text-primary",
    written_off: "text-destructive",
    exited: "text-warning",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Outcome Tracking
        </h4>
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-primary hover:underline">
          {expanded ? "Cancel" : "+ Record Outcome"}
        </button>
      </div>

      {expanded && (
        <div className="p-3 rounded-md border border-border bg-card space-y-2">
          <div className="flex gap-1.5">
            {["unrealized", "realized", "exited", "written_off"].map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, outcome_type: t })}
                className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-colors ${
                  form.outcome_type === t ? "border-primary/30 bg-primary/5 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.predicted_return_multiple} onChange={(e) => setForm({ ...form, predicted_return_multiple: e.target.value })} placeholder="Predicted MOIC" className="h-8 px-3 rounded-md bg-secondary border border-border text-xs" />
            <input value={form.actual_return_multiple} onChange={(e) => setForm({ ...form, actual_return_multiple: e.target.value })} placeholder="Actual MOIC" className="h-8 px-3 rounded-md bg-secondary border border-border text-xs" />
          </div>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full h-8 px-3 rounded-md bg-secondary border border-border text-xs" />
          <input value={form.lessons_learned} onChange={(e) => setForm({ ...form, lessons_learned: e.target.value })} placeholder="Lessons learned..." className="w-full h-8 px-3 rounded-md bg-secondary border border-border text-xs" />
          <button onClick={() => addOutcome.mutate()} className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
            Save Outcome
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {outcomes?.map((o) => (
          <div key={o.id} className="p-2.5 rounded-md border border-border bg-secondary/20">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold uppercase ${outcomeColors[o.outcome_type] || "text-muted-foreground"}`}>
                {o.outcome_type.replace("_", " ")}
              </span>
              {o.model_accuracy_score != null && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Model accuracy: {Math.round(o.model_accuracy_score)}%
                </Badge>
              )}
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground">
              {o.predicted_return_multiple && <span>Predicted: {o.predicted_return_multiple}x</span>}
              {o.actual_return_multiple && <span>Actual: {o.actual_return_multiple}x</span>}
            </div>
            {o.notes && <p className="text-xs text-foreground mt-1">{o.notes}</p>}
            {o.lessons_learned && <p className="text-xs text-warning/80 mt-0.5 italic">💡 {o.lessons_learned}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================
// Review Cadence Manager
// ============================
export function ReviewCadenceManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", frequency: "weekly" });

  const { data: cadences } = useQuery({
    queryKey: ["review-cadences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_cadences")
        .select("*")
        .order("next_review_at");
      if (error) throw error;
      return data;
    },
  });

  const createCadence = useMutation({
    mutationFn: async () => {
      const intervals: Record<string, string> = { weekly: "7 days", biweekly: "14 days", monthly: "30 days", quarterly: "90 days" };
      const { error } = await supabase.from("review_cadences").insert({
        name: form.name,
        frequency: form.frequency,
        created_by: user!.id,
        next_review_at: new Date(Date.now() + parseInt(intervals[form.frequency]) * 86400000).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-cadences"] });
      setForm({ name: "", frequency: "weekly" });
      setShowNew(false);
      toast({ title: "Review cadence created" });
    },
  });

  const deleteCadence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("review_cadences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["review-cadences"] }),
  });

  const frequencyBadge: Record<string, string> = {
    weekly: "bg-success/10 text-success border-success/30",
    biweekly: "bg-primary/10 text-primary border-primary/30",
    monthly: "bg-warning/10 text-warning border-warning/30",
    quarterly: "bg-chart-4/10 text-chart-4 border-chart-4/30",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Review Cadences
        </h4>
        <button onClick={() => setShowNew(!showNew)} className="text-[10px] text-primary hover:underline">
          {showNew ? "Cancel" : "+ New Cadence"}
        </button>
      </div>

      {showNew && (
        <div className="p-3 rounded-md border border-border bg-card space-y-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekly IC Meeting" className="w-full h-8 px-3 rounded-md bg-secondary border border-border text-xs" />
          <div className="flex gap-1.5">
            {["weekly", "biweekly", "monthly", "quarterly"].map((f) => (
              <button key={f} onClick={() => setForm({ ...form, frequency: f })} className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-colors ${form.frequency === f ? frequencyBadge[f] : "border-border text-muted-foreground"}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => createCadence.mutate()} disabled={!form.name.trim()} className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
            Create
          </button>
        </div>
      )}

      <div className="space-y-2">
        {cadences?.map((c) => {
          const isOverdue = new Date(c.next_review_at) < new Date();
          return (
            <div key={c.id} className={`p-3 rounded-md border ${isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/20"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${frequencyBadge[c.frequency] || "border-border"}`}>
                      {c.frequency}
                    </span>
                    <span className={`text-[10px] ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {isOverdue ? "OVERDUE" : `Next: ${new Date(c.next_review_at).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>
                <button onClick={() => deleteCadence.mutate(c.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                {c.auto_include_watchlists && <span>📋 Watchlists</span>}
                {c.auto_include_alerts && <span>🔔 Alerts</span>}
                {c.auto_include_open_decisions && <span>⚖️ Open decisions</span>}
              </div>
            </div>
          );
        })}
        {(!cadences || cadences.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-4">No review cadences set up</p>
        )}
      </div>
    </div>
  );
}
