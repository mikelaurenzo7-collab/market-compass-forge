import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send, Users, Trash2, Wifi } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SharedNotes = ({ companyId }: { companyId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isLive, setIsLive] = useState(false);

  const { data: notes } = useQuery({
    queryKey: ["shared-notes", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shared_notes")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Real-time subscription for live updates
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`shared-notes-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shared_notes",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log("Realtime shared_notes update:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["shared-notes", companyId] });
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  const addNote = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from("shared_notes").insert({
        company_id: companyId,
        user_id: user!.id,
        content: text,
      });
      if (error) throw error;
      await supabase.from("team_activity").insert({
        user_id: user!.id,
        action: "added a shared note on",
        entity_type: "company",
        entity_id: companyId,
        entity_name: "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-notes", companyId] });
      setContent("");
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shared_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shared-notes", companyId] }),
  });

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Team Notes</h3>
        {isLive && (
          <span className="flex items-center gap-1 ml-auto text-[10px] text-success">
            <Wifi className="h-3 w-3" /> Live
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <form
          onSubmit={(e) => { e.preventDefault(); if (content.trim()) addNote.mutate(content.trim()); }}
          className="flex gap-2"
        >
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a team note..."
            className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!content.trim() || addNote.isPending}
            className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notes?.map((n) => (
            <div key={n.id} className="p-2 rounded bg-secondary/50 text-sm text-foreground group animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p>{n.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    User · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {n.user_id === user?.id && (
                  <button
                    onClick={() => deleteNote.mutate(n.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {(!notes || notes.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-2">No team notes yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedNotes;
