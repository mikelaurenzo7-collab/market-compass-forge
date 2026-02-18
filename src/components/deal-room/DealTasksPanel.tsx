import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, Circle, AlertTriangle, Plus, Trash2, Loader2, ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface DealTasksPanelProps {
  dealId: string;
  currentStage: string;
}

const DealTasksPanel = ({ dealId, currentStage }: DealTasksPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({ [currentStage]: true });

  const { data: tasks } = useQuery({
    queryKey: ["deal-tasks", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_tasks")
        .select("*")
        .eq("deal_id", dealId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("deal_tasks")
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deal-tasks", dealId] }),
  });

  const addTask = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("deal_tasks").insert({
        deal_id: dealId,
        title,
        stage: currentStage,
        is_critical: false,
        sort_order: (tasks?.filter((t: any) => t.stage === currentStage).length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-tasks", dealId] });
      setNewTitle("");
      setShowAdd(false);
      toast.success("Task added");
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deal_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-tasks", dealId] });
      toast.success("Task removed");
    },
  });

  // Group tasks by stage
  const tasksByStage: Record<string, any[]> = {};
  (tasks ?? []).forEach((t: any) => {
    if (!tasksByStage[t.stage]) tasksByStage[t.stage] = [];
    tasksByStage[t.stage].push(t);
  });

  const STAGE_ORDER = ["sourced", "screening", "due_diligence", "ic_review", "committed", "passed"];
  const STAGE_LABELS: Record<string, string> = {
    sourced: "Sourced", screening: "Screening", due_diligence: "Due Diligence",
    ic_review: "IC Review", committed: "Committed", passed: "Passed",
  };

  const toggleStage = (stage: string) => {
    setExpandedStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Stage Tasks</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-[10px] text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Add Task
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) addTask.mutate(newTitle.trim()); }}
          className="px-4 py-2 border-b border-border/50 flex gap-2"
        >
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={`New task for ${STAGE_LABELS[currentStage] ?? currentStage}...`}
            className="flex-1 h-8 px-2.5 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || addTask.isPending}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-50"
          >
            {addTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
          </button>
        </form>
      )}

      <div className="max-h-[400px] overflow-y-auto">
        {STAGE_ORDER.filter((s) => tasksByStage[s]?.length > 0).map((stage) => {
          const stageTasks = tasksByStage[stage] ?? [];
          const done = stageTasks.filter((t: any) => t.is_completed).length;
          const total = stageTasks.length;
          const isActive = stage === currentStage;
          const expanded = expandedStages[stage] ?? false;
          const criticalBlockers = stageTasks.filter((t: any) => t.is_critical && !t.is_completed);

          return (
            <div key={stage} className={isActive ? "bg-primary/5" : ""}>
              <button
                onClick={() => toggleStage(stage)}
                className="w-full px-4 py-2 flex items-center gap-2 hover:bg-secondary/30 transition-colors"
              >
                {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                  {STAGE_LABELS[stage] ?? stage}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground ml-auto">{done}/{total}</span>
                {criticalBlockers.length > 0 && isActive && (
                  <span className="text-[9px] text-destructive flex items-center gap-0.5">
                    <ShieldAlert className="h-3 w-3" /> {criticalBlockers.length} blocker{criticalBlockers.length > 1 ? "s" : ""}
                  </span>
                )}
              </button>

              {expanded && (
                <div className="px-4 pb-2 space-y-0.5">
                  {stageTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center gap-2 group py-1">
                      <button
                        onClick={() => toggleTask.mutate({ id: task.id, completed: !task.is_completed })}
                        className={`flex-shrink-0 ${task.is_completed ? "text-success" : task.is_critical ? "text-destructive" : "text-muted-foreground"} hover:text-primary transition-colors`}
                      >
                        {task.is_completed
                          ? <CheckCircle2 className="h-3.5 w-3.5" />
                          : <Circle className="h-3.5 w-3.5" />
                        }
                      </button>
                      <span className={`text-xs flex-1 ${task.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </span>
                      {task.is_critical && !task.is_completed && (
                        <span className="text-[9px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                          Critical
                        </span>
                      )}
                      <button
                        onClick={() => deleteTask.mutate(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {(!tasks || tasks.length === 0) && (
          <div className="p-6 text-center">
            <p className="text-xs text-muted-foreground">No tasks yet. Tasks are auto-generated when a deal advances stages.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealTasksPanel;
