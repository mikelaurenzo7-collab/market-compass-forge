import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Check, Circle, Clock, Trash2, Loader2 } from "lucide-react";

type PipelineTask = {
  id: string;
  pipeline_deal_id: string;
  title: string;
  assignee_id: string;
  due_date: string | null;
  status: string;
  created_at: string;
};

const STATUS_ICONS: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  done: Check,
};

const PipelineTasks = ({ dealId }: { dealId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [showInput, setShowInput] = useState(false);

  const { data: tasks } = useQuery({
    queryKey: ["pipeline-tasks", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_tasks")
        .select("*")
        .eq("pipeline_deal_id", dealId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PipelineTask[];
    },
    enabled: !!dealId && !!user,
  });

  const addTask = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("pipeline_tasks").insert({
        pipeline_deal_id: dealId,
        title,
        assignee_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-tasks", dealId] });
      setNewTitle("");
      setShowInput(false);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const next = status === "todo" ? "in_progress" : status === "in_progress" ? "done" : "todo";
      const { error } = await supabase.from("pipeline_tasks").update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline-tasks", dealId] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pipeline_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline-tasks", dealId] }),
  });

  const pending = (tasks ?? []).filter((t) => t.status !== "done").length;

  return (
    <div className="mt-2 ml-5">
      {(tasks ?? []).length > 0 && (
        <div className="space-y-1">
          {tasks!.map((t) => {
            const Icon = STATUS_ICONS[t.status] ?? Circle;
            return (
              <div key={t.id} className="flex items-center gap-1.5 group">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleStatus.mutate({ id: t.id, status: t.status }); }}
                  className={`p-0.5 rounded transition-colors ${
                    t.status === "done" ? "text-success" : t.status === "in_progress" ? "text-warning" : "text-muted-foreground"
                  } hover:text-primary`}
                >
                  <Icon className="h-3 w-3" />
                </button>
                <span className={`text-[11px] flex-1 ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {t.title}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTask.mutate(t.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showInput ? (
        <form
          onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) addTask.mutate(newTitle.trim()); }}
          className="flex gap-1 mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={() => { if (!newTitle.trim()) setShowInput(false); }}
            placeholder="Task..."
            className="flex-1 h-6 px-2 rounded text-[11px] bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || addTask.isPending}
            className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-[10px] disabled:opacity-50"
          >
            {addTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </button>
        </form>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setShowInput(true); }}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary mt-1 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add task
        </button>
      )}
    </div>
  );
};

export default PipelineTasks;
