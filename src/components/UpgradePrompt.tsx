import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Zap, Check, Mail } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  ai_research: "AI Research queries",
  memo_generation: "Memo generations",
  enrichment: "Company enrichments",
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    current: true,
    features: ["10 AI queries/day", "3 memos/day", "5 enrichments/day", "Basic pipeline"],
  },
  {
    name: "Pro",
    price: "$99/mo",
    current: false,
    features: ["100 AI queries/day", "25 memos/day", "50 enrichments/day", "Priority support", "Team collaboration"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    current: false,
    features: ["Everything in Pro", "API access", "Custom integrations", "Dedicated support", "SLA guarantee"],
  },
];

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  blockedAction: string | null;
}

const UpgradePrompt = ({ open, onClose, blockedAction }: UpgradePromptProps) => {
  const label = blockedAction ? ACTION_LABELS[blockedAction] ?? blockedAction : "requests";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Daily limit reached
          </DialogTitle>
          <DialogDescription>
            You've used all your free {label} for today. Upgrade to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-lg border p-4 space-y-3 ${
                tier.name === "Pro"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card"
              }`}
            >
              <div>
                <h3 className="text-sm font-semibold text-foreground">{tier.name}</h3>
                <p className="text-2xl font-bold text-foreground mt-1">{tier.price}</p>
              </div>
              <ul className="space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {tier.current ? (
                <div className="text-xs text-muted-foreground text-center py-2">Current plan</div>
              ) : (
                <a
                  href="mailto:sales@grapevine.io?subject=Upgrade%20Inquiry"
                  className="flex items-center justify-center gap-2 w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Contact Us
                </a>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePrompt;
