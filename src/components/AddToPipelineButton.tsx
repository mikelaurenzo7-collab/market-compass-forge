import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";

const DILIGENCE_CHECKLIST = [
  { category: "Financial", items: ["Review financials & valuation basis", "Validate discount / recovery assumptions", "Assess capital requirements"] },
  { category: "Legal", items: ["Review legal status & filings", "Confirm ownership / lien position", "Assess regulatory requirements"] },
  { category: "Commercial", items: ["Evaluate market comparables", "Assess competitive dynamics", "Review key stakeholders"] },
];

interface AddToPipelineButtonProps {
  entityName: string;
  entityType: "distressed_asset" | "private_listing";
  entityId: string;
  sector?: string | null;
  description?: string | null;
  compact?: boolean;
}

const AddToPipelineButton = ({ entityName, entityType, entityId, sector, description, compact }: AddToPipelineButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState(false);
  const [dealId, setDealId] = useState<string | null>(null);

  const createDeal = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");

      // Check if a company already exists for this entity
      const { data: existingCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("name", entityName)
        .maybeSingle();

      let companyId: string;

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        // Create a company record for tracking
        const { data: newCompany, error: companyErr } = await supabase
          .from("companies")
          .insert({
            name: entityName,
            sector: sector ?? (entityType === "private_listing" ? "Real Estate" : "Special Situations"),
            description: description ?? `Sourced from ${entityType.replace("_", " ")}`,
            market_type: "private",
            source_type: entityType,
            source_url: entityId,
            is_synthetic: false,
          })
          .select("id")
          .single();

        if (companyErr) throw companyErr;
        companyId = newCompany.id;
      }

      // Check if deal already exists
      const { data: existing } = await supabase
        .from("deal_pipeline")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        setDealId(existing.id);
        setCreated(true);
        toast.info("Already in your pipeline");
        return existing.id;
      }

      const checklistNotes = DILIGENCE_CHECKLIST.map(
        (cat) => `## ${cat.category} Diligence\n${cat.items.map((item) => `- [ ] ${item}`).join("\n")}`
      ).join("\n\n");

      const { data: deal, error } = await supabase
        .from("deal_pipeline")
        .insert({
          company_id: companyId,
          user_id: user.id,
          stage: "sourced",
          priority: "medium",
          notes: `Sourced from ${entityType.replace("_", " ")}: ${entityName}\n\n${checklistNotes}`,
        })
        .select("id")
        .single();

      if (error) throw error;

      await supabase.from("decision_log").insert({
        deal_id: deal.id,
        user_id: user.id,
        decision_type: "stage_change",
        to_state: "sourced",
        rationale: `Added from ${entityType.replace("_", " ")} module with auto-generated diligence checklist.`,
      });

      logActivity({
        userId: user.id,
        action: "added to pipeline from",
        entityType: "deal",
        entityId: deal.id,
        entityName,
      });

      return deal.id;
    },
    onSuccess: (id) => {
      setDealId(id);
      setCreated(true);
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Added to pipeline with diligence checklist");
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to add to pipeline");
    },
  });

  if (created && dealId) {
    return (
      <button
        onClick={() => navigate("/deals")}
        className={`inline-flex items-center gap-2 rounded-md bg-success/10 text-success font-medium transition-colors hover:bg-success/20 ${
          compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
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
        compact ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"
      }`}
    >
      {createDeal.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Briefcase className="h-4 w-4" />
      )}
      <span>Add to Pipeline</span>
    </button>
  );
};

export default AddToPipelineButton;
