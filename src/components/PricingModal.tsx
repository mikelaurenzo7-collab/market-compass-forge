import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Zap, Crown, Building2, Check, Loader2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    id: "essential",
    name: "Essential",
    price: 299,
    icon: Zap,
    features: ["10 AI queries/day", "5 memos/day", "5 enrichments/day", "3 deal matches/day", "Basic search"],
  },
  {
    id: "professional",
    name: "Professional",
    price: 599,
    icon: Crown,
    popular: true,
    features: ["200 AI queries/day", "100 memos/day", "100 enrichments/day", "50 deal matches/day", "REST API", "Email briefings"],
  },
  {
    id: "institutional",
    name: "Institutional",
    price: 1999,
    icon: Building2,
    features: ["Unlimited everything", "Priority API", "Team seats", "Custom integrations", "Dedicated support"],
  },
];

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  highlightPlan?: string;
  reason?: string;
}

const PricingModal = ({ open, onClose, highlightPlan, reason }: PricingModalProps) => {
  const subscription = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const currentPlan = subscription.plan === "pro" ? "professional" : (subscription.plan || "essential");

  const handleCheckout = async (plan: string) => {
    if (plan === "institutional") {
      window.open("mailto:sales@grapevine.io?subject=Institutional%20Plan%20Inquiry", "_blank");
      return;
    }
    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, interval: "month" },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          {reason && (
            <DialogDescription>{reason}</DialogDescription>
          )}
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isHighlighted = highlightPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-lg border p-3 space-y-2.5 transition-colors ${
                  isCurrent
                    ? "border-primary bg-primary/5"
                    : isHighlighted || plan.popular
                    ? "border-primary/40"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <plan.icon className={`h-3.5 w-3.5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                    <h4 className="text-xs font-semibold text-foreground">{plan.name}</h4>
                  </div>
                  {isCurrent && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Current</span>
                  )}
                </div>

                <div className="flex items-baseline gap-0.5">
                  <span className="text-xl font-bold text-foreground">${plan.price}</span>
                  <span className="text-[10px] text-muted-foreground">/mo</span>
                </div>

                <ul className="space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Check className="h-2.5 w-2.5 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loading === plan.id}
                    className="w-full mt-1 px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                  >
                    {loading === plan.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3" />
                    )}
                    {plan.id === "institutional" ? "Contact Sales" : "Upgrade"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
