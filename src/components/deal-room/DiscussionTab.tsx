import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, CheckCircle, XCircle, Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface DiscussionTabProps {
  comments: any[];
  dealId: string;
  votes: any[];
  profiles: Record<string, string>;
}

const DiscussionTab = ({ comments, dealId, votes, profiles }: DiscussionTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const addComment = useMutation({
    mutationFn: async () => {
      if (!newComment.trim() || !user) return;
      const { error } = await supabase.from("deal_comments").insert({ deal_id: dealId, user_id: user.id, content: newComment.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["deal-comments", dealId] });
    },
  });

  const castVote = useMutation({
    mutationFn: async (vote: string) => {
      if (!user) return;
      const { data: existing } = await supabase.from("deal_votes").select("id").eq("pipeline_deal_id", dealId).eq("user_id", user.id).maybeSingle();
      if (existing) {
        await supabase.from("deal_votes").update({ vote }).eq("id", existing.id);
      } else {
        await supabase.from("deal_votes").insert({ pipeline_deal_id: dealId, user_id: user.id, vote });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-votes", dealId] });
      toast.success("Vote recorded");
    },
  });

  const myVote = votes.find((v: any) => v.user_id === user?.id)?.vote;
  const yesVotes = votes.filter((v: any) => v.vote === "yes").length;
  const noVotes = votes.filter((v: any) => v.vote === "no").length;

  return (
    <div className="max-w-2xl space-y-4">
      {/* IC Vote */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">IC Vote</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => castVote.mutate("yes")}
            disabled={castVote.isPending}
            className={`h-9 px-4 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 ${myVote === "yes" ? "bg-success text-success-foreground" : "border border-border text-muted-foreground hover:text-success hover:border-success/30 hover:bg-success/5"}`}
          >
            {castVote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Proceed ({yesVotes})
          </button>
          <button
            onClick={() => castVote.mutate("no")}
            disabled={castVote.isPending}
            className={`h-9 px-4 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 ${myVote === "no" ? "bg-destructive text-destructive-foreground" : "border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5"}`}
          >
            {castVote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Pass ({noVotes})
          </button>
        </div>
      </div>

      {/* Comment input */}
      <div className="flex gap-2">
        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !addComment.isPending && addComment.mutate()}
          placeholder="Add a comment or IC note..."
          className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
        <button onClick={() => addComment.mutate()} disabled={!newComment.trim() || addComment.isPending} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5">
          {addComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Post
        </button>
      </div>
      {comments.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Start the IC conversation about this deal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c: any) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{profiles[c.user_id] ?? c.user_id.slice(0, 8)}</span>
                <span className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
              </div>
              <p className="text-sm text-foreground">{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscussionTab;
