import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Zap, Check, Mail } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  ai_research: "AI Research queries",
  memo_generation: "Memo generations",
  enrichment: "Company enrichments",
};

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  blockedAction: string | null;
}

const UpgradePrompt = ({ open, onClose, blockedAction }: UpgradePromptProps) => {
  const label = blockedAction ? ACTION_LABELS[blockedAction] ?? blockedAction : "requests";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Daily limit reached
          </DialogTitle>
          <DialogDescription>
            You've used all {label} for today. Your limits reset at midnight UTC. Need higher limits? Contact our team.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Professional Plan — $599/mo</h3>
            <ul className="space-y-1.5">
              {["200 AI queries / day", "100 memo generations / day", "100 enrichments / day", "REST API access (10K calls/day)", "Unlimited company profiles", "Full platform access"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <a
            href="mailto:sales@grapevine.io?subject=Increase%20Usage%20Limits"
            className="flex items-center justify-center gap-2 w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Contact Sales
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePrompt;
