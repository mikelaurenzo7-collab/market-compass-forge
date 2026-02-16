import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, MessageSquare, CheckCircle2, Vote, ThumbsUp, ThumbsDown, Minus, FileText, Shield, BarChart3, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import SharedNotes from "@/components/SharedNotes";
import PipelineTasks from "@/components/PipelineTasks";
import { DealComments, DecisionLog, ICTemplateSelector, DecisionOutcomes } from "@/components/DealCollaboration";

type DealWorkspaceProps = {
  dealId: string;
  companyId: string;
  companyName: string;
  onClose: () => void;
};

const VOTE_ICONS = {
  proceed: <ThumbsUp className="h-3.5 w-3.5" />,
  pass: <ThumbsDown className="h-3.5 w-3.5" />,
  hold: <Minus className="h-3.5 w-3.5" />,
};

const VOTE_COLORS = {
  proceed: "text-success bg-success/10 border-success/30",
  pass: "text-destructive bg-destructive/10 border-destructive/30",
  hold: "text-warning bg-warning/10 border-warning/30",
};

export default function DealWorkspace({ dealId, companyId, companyName, onClose }: DealWorkspaceProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"comments" | "tasks" | "vote" | "decisions" | "templates" | "outcomes">("comments");
  const [voteComment, setVoteComment] = useState("");

  const { data: votes } = useQuery({
    queryKey: ["deal-votes", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_votes")
        .select("*")
        .eq("pipeline_deal_id", dealId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });

  const castVote = useMutation({
    mutationFn: async (vote: "proceed" | "pass" | "hold") => {
      const { error } = await supabase
        .from("deal_votes")
        .upsert({
          pipeline_deal_id: dealId,
          user_id: user!.id,
          vote,
          comment: voteComment || null,
        }, { onConflict: "pipeline_deal_id,user_id" });
      if (error) throw error;

      // Log to immutable decision log
      await supabase.from("decision_log").insert({
        deal_id: dealId,
        user_id: user!.id,
        decision_type: vote === "proceed" ? "approval" : vote === "pass" ? "rejection" : "note",
        rationale: voteComment || `Voted: ${vote}`,
        metadata: { vote_type: vote },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-votes", dealId] });
      queryClient.invalidateQueries({ queryKey: ["decision-log", dealId] });
      setVoteComment("");
      toast({ title: "Vote recorded & logged" });
    },
  });

  const myVote = votes?.find(v => v.user_id === user?.id);
  const voteSummary = {
    proceed: votes?.filter(v => v.vote === "proceed").length ?? 0,
    pass: votes?.filter(v => v.vote === "pass").length ?? 0,
    hold: votes?.filter(v => v.vote === "hold").length ?? 0,
  };

  const tabs = [
    { id: "comments" as const, label: "Comments", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { id: "tasks" as const, label: "Tasks", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    { id: "vote" as const, label: "IC Vote", icon: <Vote className="h-3.5 w-3.5" /> },
    { id: "decisions" as const, label: "Decisions", icon: <Shield className="h-3.5 w-3.5" /> },
    { id: "outcomes" as const, label: "Outcomes", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "templates" as const, label: "Templates", icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-t-lg sm:rounded-lg border border-border bg-card shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{companyName}</h2>
            <p className="text-[10px] text-muted-foreground">Deal Workspace</p>
          </div>
          <div className="flex items-center gap-3">
            {(voteSummary.proceed + voteSummary.pass + voteSummary.hold) > 0 && (
              <div className="flex items-center gap-1">
                {voteSummary.proceed > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-success/10 text-success">{voteSummary.proceed} ✓</span>}
                {voteSummary.hold > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-warning/10 text-warning">{voteSummary.hold} —</span>}
                {voteSummary.pass > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-destructive/10 text-destructive">{voteSummary.pass} ✗</span>}
              </div>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs - scrollable on mobile */}
        <div className="px-4 border-b border-border flex gap-1 overflow-x-auto shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "comments" && (
            <div className="space-y-4">
              <DealComments dealId={dealId} />
              <SharedNotes companyId={companyId} />
            </div>
          )}

          {activeTab === "tasks" && <PipelineTasks dealId={dealId} />}

          {activeTab === "vote" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cast Your Vote</h4>
                <div className="flex gap-2 mb-3">
                  {(["proceed", "pass", "hold"] as const).map(vote => (
                    <button
                      key={vote}
                      onClick={() => castVote.mutate(vote)}
                      disabled={castVote.isPending}
                      className={`flex-1 h-10 rounded-md border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                        myVote?.vote === vote
                          ? VOTE_COLORS[vote]
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {VOTE_ICONS[vote]} {vote.charAt(0).toUpperCase() + vote.slice(1)}
                    </button>
                  ))}
                </div>
                <input
                  value={voteComment}
                  onChange={(e) => setVoteComment(e.target.value)}
                  placeholder="Add a comment with your vote..."
                  className="w-full h-9 px-3 rounded-md border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {votes && votes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vote Record</h4>
                  <div className="space-y-2">
                    {votes.map(v => (
                      <div key={v.id} className="flex items-start gap-2 p-2 rounded-md bg-secondary/30">
                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${VOTE_COLORS[v.vote as keyof typeof VOTE_COLORS]}`}>
                          {v.vote.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground font-mono">{v.user_id.slice(0, 8)}...</p>
                          {v.comment && <p className="text-xs text-muted-foreground mt-0.5">{v.comment}</p>}
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "decisions" && <DecisionLog dealId={dealId} />}
          {activeTab === "outcomes" && <DecisionOutcomes dealId={dealId} />}
          {activeTab === "templates" && (
            <ICTemplateSelector onSelect={(t) => toast({ title: `Template: ${t.name}`, description: `${(t.sections as any[]).length} sections, ${(t.checklist as any[]).length} checklist items` })} />
          )}
        </div>
      </div>
    </div>
  );
}
