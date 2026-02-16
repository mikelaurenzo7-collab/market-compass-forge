import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Zap, Check, ArrowUpRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACTION_LABELS: Record<string, string> = {
  ai_research: "AI Research queries",
  memo_generation: "Memo generations",
  enrichment: "Company enrichments",
  deal_matcher: "Deal Matcher runs",
  export: "Exports",
  api_access: "API calls",
};

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  blockedAction: string | null;
}

const UpgradePrompt = ({ open, onClose, blockedAction }: UpgradePromptProps) => {
  const label = blockedAction ? ACTION_LABELS[blockedAction] ?? blockedAction : "requests";
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: "professional", interval: "month" },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Daily limit reached
          </DialogTitle>
          <DialogDescription>
            You've used all {label} for today. Upgrade to Professional for higher limits, or wait until midnight UTC.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Professional Plan — $599/mo</h3>
            <ul className="space-y-1.5">
              {["200 AI queries / day", "100 memo generations / day", "100 enrichments / day", "50 deal matches / day", "REST API access", "Full platform access"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
            Upgrade to Professional
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePrompt;
