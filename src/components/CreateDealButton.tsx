import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";

const DEFAULT_CHECKLIST = [
  { category: "Financial", items: ["Review audited/unaudited financials", "Validate revenue recognition", "Verify ARR/MRR breakdown", "Assess burn rate & runway", "Confirm cap table accuracy"] },
  { category: "Legal", items: ["Review corporate documents", "Check IP ownership & patents", "Review material contracts", "Assess pending/threatened litigation", "Confirm regulatory compliance"] },
  { category: "Commercial", items: ["Validate customer concentration", "Review churn & retention metrics", "Assess competitive positioning", "Verify key customer references", "Evaluate pricing strategy"] },
  { category: "Technical", items: ["Review tech architecture", "Assess scalability & tech debt", "Evaluate security posture", "Review data privacy compliance"] },
];

interface CreateDealButtonProps {
  companyId: string;
  companyName: string;
  compact?: boolean;
}

const CreateDealButton = ({ companyId, companyName, compact }: CreateDealButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState(false);
  const [dealId, setDealId] = useState<string | null>(null);

  const createDeal = useMutation({
    mutationFn: async () => {
      // Check if deal already exists
      const { data: existing } = await supabase
        .from("deal_pipeline")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        setDealId(existing.id);
        setCreated(true);
        toast.info("Deal already exists in your pipeline");
        return existing.id;
      }

      // Create the deal
      const { data: deal, error } = await supabase
        .from("deal_pipeline")
        .insert({
          company_id: companyId,
          user_id: user!.id,
          stage: "sourced",
          priority: "medium",
          notes: `Deal created from company detail page. Diligence checklist auto-generated.\n\n${DEFAULT_CHECKLIST.map(
            (cat) => `## ${cat.category} Diligence\n${cat.items.map((item) => `- [ ] ${item}`).join("\n")}`
          ).join("\n\n")}`,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Log a decision log entry
      await supabase.from("decision_log").insert({
        deal_id: deal.id,
        user_id: user!.id,
        decision_type: "stage_change",
        to_state: "sourced",
        rationale: `Initiated from ${companyName} company detail with auto-generated diligence checklist.`,
      });

      logActivity({
        userId: user!.id,
        action: "created deal with checklist for",
        entityType: "deal",
        entityId: deal.id,
        entityName: companyName,
      });

      return deal.id;
    },
    onSuccess: (id) => {
      setDealId(id);
      setCreated(true);
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Deal created with diligence checklist");
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to create deal");
    },
  });

  if (created && dealId) {
    return (
      <button
        onClick={() => navigate("/deals")}
        className={`inline-flex items-center gap-2 rounded-md bg-success/10 text-success font-medium transition-colors hover:bg-success/20 ${
          compact ? "h-9 px-3 text-xs" : "h-10 px-4 text-sm"
        }`}
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>In Pipeline</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => createDeal.mutate()}
      disabled={createDeal.isPending || !user}
      className={`inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 ${
        compact ? "h-9 px-3 text-xs" : "h-10 px-4 text-sm"
      }`}
    >
      {createDeal.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Briefcase className="h-4 w-4" />
      )}
      <span>Create Deal</span>
    </button>
  );
};

export default CreateDealButton;
