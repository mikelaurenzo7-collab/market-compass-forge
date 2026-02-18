import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, CheckCircle, XCircle, Send, Loader2, Skull, AlertTriangle, ShieldAlert, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

interface DiscussionTabProps {
  comments: any[];
  dealId: string;
  votes: any[];
  profiles: Record<string, string>;
  thesis?: string;
  financials?: any;
  companyName?: string;
  sector?: string;
  stage?: string;
}

interface PreMortemResult {
  counter_thesis: { title: string; reasoning: string }[];
  overall_risk_rating: string;
  recommended_diligence: string;
}

const RISK_COLORS: Record<string, { bg: string; text: string; icon: typeof Shield }> = {
  low: { bg: "bg-success/10 border-success/20", text: "text-success", icon: Shield },
  medium: { bg: "bg-warning/10 border-warning/20", text: "text-warning", icon: AlertTriangle },
  high: { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", icon: ShieldAlert },
  critical: { bg: "bg-destructive/20 border-destructive/40", text: "text-destructive", icon: Skull },
};

const DiscussionTab = ({ comments, dealId, votes, profiles, thesis, financials, companyName, sector, stage }: DiscussionTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [convictionScore, setConvictionScore] = useState(5);
  const [premortem, setPremortem] = useState<PreMortemResult | null>(null);

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
        await supabase.from("deal_votes").update({ vote, conviction_score: convictionScore } as any).eq("id", existing.id);
      } else {
        await supabase.from("deal_votes").insert({ pipeline_deal_id: dealId, user_id: user.id, vote, conviction_score: convictionScore } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-votes", dealId] });
      toast.success("Vote recorded");
    },
  });

  const runPremortem = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-premortem", {
        body: {
          company_name: companyName,
          thesis,
          financials,
          sector,
          stage,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.premortem as PreMortemResult;
    },
    onSuccess: (data) => {
      setPremortem(data);
      toast.success("Devil's Advocate analysis complete");
    },
    onError: (e: any) => {
      toast.error(e.message || "Pre-Mortem generation failed");
    },
  });

  const myVote = votes.find((v: any) => v.user_id === user?.id);
  const myVoteDirection = myVote?.vote;
  const myConviction = (myVote as any)?.conviction_score;
  const yesVotes = votes.filter((v: any) => v.vote === "yes");
  const noVotes = votes.filter((v: any) => v.vote === "no");
  const avgConviction = votes.length > 0
    ? (votes.reduce((s: number, v: any) => s + (Number(v.conviction_score) || 5), 0) / votes.length).toFixed(1)
    : null;

  return (
    <div className="max-w-2xl space-y-4">
      {/* IC Vote with Conviction Score */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">IC Vote</h3>
          {avgConviction && (
            <span className="text-[10px] font-mono text-muted-foreground">
              Avg Conviction: <span className="text-primary font-semibold">{avgConviction}/10</span>
            </span>
          )}
        </div>

        {/* Conviction slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Conviction Score</span>
            <span className="text-sm font-mono font-bold text-primary">{convictionScore}/10</span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[convictionScore]}
            onValueChange={([v]) => setConvictionScore(v)}
            className="w-full"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground/50 font-mono">
            <span>Low conviction</span>
            <span>High conviction</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => castVote.mutate("yes")}
            disabled={castVote.isPending}
            className={`h-9 px-4 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 ${myVoteDirection === "yes" ? "bg-success text-success-foreground" : "border border-border text-muted-foreground hover:text-success hover:border-success/30 hover:bg-success/5"}`}
          >
            {castVote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Proceed ({yesVotes.length})
          </button>
          <button
            onClick={() => castVote.mutate("no")}
            disabled={castVote.isPending}
            className={`h-9 px-4 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 ${myVoteDirection === "no" ? "bg-destructive text-destructive-foreground" : "border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5"}`}
          >
            {castVote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Pass ({noVotes.length})
          </button>
        </div>

        {/* Per-voter conviction breakdown */}
        {votes.length > 0 && (
          <div className="pt-2 border-t border-border/50 space-y-1">
            {votes.map((v: any) => {
              const conviction = Number(v.conviction_score) || 5;
              return (
                <div key={v.id} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{profiles[v.user_id] ?? v.user_id.slice(0, 8)}</span>
                  <span className="flex items-center gap-2">
                    <span className={v.vote === "yes" ? "text-success font-medium" : "text-destructive font-medium"}>
                      {v.vote === "yes" ? "Proceed" : "Pass"}
                    </span>
                    <span className="font-mono text-foreground">{conviction}/10</span>
                    <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${v.vote === "yes" ? "bg-success" : "bg-destructive"}`}
                        style={{ width: `${conviction * 10}%` }}
                      />
                    </div>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Pre-Mortem */}
      <div className="rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Skull className="h-4 w-4 text-destructive" /> Devil's Advocate
          </h3>
          <button
            onClick={() => runPremortem.mutate()}
            disabled={runPremortem.isPending}
            className="h-7 px-3 rounded-md border border-destructive/30 bg-destructive/10 text-[10px] text-destructive font-medium hover:bg-destructive/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {runPremortem.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Skull className="h-3 w-3" />}
            {runPremortem.isPending ? "Analyzing..." : "Run AI Pre-Mortem"}
          </button>
        </div>

        {!premortem && !runPremortem.isPending && (
          <p className="text-xs text-muted-foreground">
            Challenge the thesis before committing capital. The AI will generate 3 specific reasons why this deal might fail.
          </p>
        )}

        {premortem && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Risk rating badge */}
            {(() => {
              const riskMeta = RISK_COLORS[premortem.overall_risk_rating] ?? RISK_COLORS.medium;
              const Icon = riskMeta.icon;
              return (
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold ${riskMeta.bg} ${riskMeta.text}`}>
                  <Icon className="h-3 w-3" />
                  {premortem.overall_risk_rating.toUpperCase()} RISK
                </div>
              );
            })()}

            {/* Counter-thesis points */}
            <div className="space-y-2">
              {premortem.counter_thesis.map((ct, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="rounded-md border border-destructive/15 bg-card p-3 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-destructive bg-destructive/10 rounded px-1.5 py-0.5">#{i + 1}</span>
                    <h4 className="text-xs font-semibold text-foreground">{ct.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ct.reasoning}</p>
                </motion.div>
              ))}
            </div>

            {/* Recommended diligence */}
            <div className="rounded-md bg-primary/5 border border-primary/15 p-2.5">
              <p className="text-[10px] font-semibold text-primary mb-0.5">Recommended Next Step</p>
              <p className="text-xs text-muted-foreground">{premortem.recommended_diligence}</p>
            </div>
          </motion.div>
        )}
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
