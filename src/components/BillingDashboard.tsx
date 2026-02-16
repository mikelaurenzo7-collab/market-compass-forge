import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, ExternalLink, Loader2, RefreshCw, Users, Receipt, TrendingUp, Crown, Zap, Building2, ArrowUpRight, CheckCircle, AlertTriangle, Clock, Webhook } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

const PLANS = [
  {
    id: "essential",
    name: "Essential",
    priceMonthly: "$299",
    priceYearly: "$2,990",
    features: ["10 AI queries/day", "5 memos/day", "5 enrichments/day", "Basic search & charts", "1 watchlist"],
    icon: Zap,
  },
  {
    id: "professional",
    name: "Professional",
    priceMonthly: "$599",
    priceYearly: "$5,990",
    features: ["200 AI queries/day", "100 memos/day", "100 enrichments/day", "REST API access", "Email briefings", "Premium datasets"],
    icon: Crown,
    popular: true,
  },
  {
    id: "institutional",
    name: "Institutional",
    priceMonthly: "$1,999",
    priceYearly: "$19,990",
    features: ["Unlimited AI queries", "Unlimited memos", "Unlimited enrichments", "Priority API", "Custom integrations", "Dedicated support"],
    icon: Building2,
  },
];

const STATUS_BADGES: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  active: { label: "Active", className: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle },
  past_due: { label: "Past Due", className: "bg-warning/10 text-warning border-warning/20", icon: AlertTriangle },
  canceled: { label: "Canceled", className: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
  none: { label: "No Subscription", className: "bg-muted text-muted-foreground border-border", icon: Clock },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground border-border", icon: Clock },
};

const BillingDashboard = () => {
  const { user } = useAuth();
  const subscription = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  // Usage data
  const { data: usageData } = useQuery({
    queryKey: ["billing-usage", user?.id],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [daily, monthly] = await Promise.all([
        supabase
          .from("usage_tracking")
          .select("action", { count: "exact" })
          .eq("user_id", user!.id)
          .gte("created_at", startOfDay.toISOString()),
        supabase
          .from("usage_tracking")
          .select("action")
          .eq("user_id", user!.id)
          .gte("created_at", startOfMonth.toISOString()),
      ]);

      const monthlyByAction: Record<string, number> = {};
      (monthly.data ?? []).forEach((r: any) => {
        monthlyByAction[r.action] = (monthlyByAction[r.action] ?? 0) + 1;
      });

      return { dailyCount: daily.count ?? 0, monthlyByAction };
    },
    enabled: !!user,
  });

  const { data: entitlements } = useQuery({
    queryKey: ["plan-entitlements", subscription.plan],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_entitlements")
        .select("*")
        .eq("plan_name", subscription.plan === "pro" ? "professional" : subscription.plan);
      if (error) throw error;
      return data;
    },
    enabled: !!subscription.plan,
  });

  // Seat count
  const { data: seatCount } = useQuery({
    queryKey: ["billing-seats", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("billing_seats")
        .select("*", { count: "exact", head: true })
        .is("removed_at", null);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const handleCheckout = async (plan: string) => {
    setCheckoutLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, interval: billingInterval },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({ title: "Checkout failed", description: e.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({ title: "Portal failed", description: e.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlan = subscription.plan === "pro" ? "professional" : (subscription.plan || "essential");
  const statusBadge = STATUS_BADGES[subscription.subscription_status] ?? STATUS_BADGES.none;

  return (
    <div className="space-y-6">
      {/* ── Billing Verification Panel ── */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Subscription Status</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => subscription.refetch()}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${subscription.isLoading ? "animate-spin" : ""}`} />
            </button>
            {subscription.subscribed && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors"
              >
                {portalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                Manage
              </button>
            )}
          </div>
        </div>

        {/* Verification grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tier</p>
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 capitalize">
              {currentPlan}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${statusBadge.className}`}>
              <statusBadge.icon className="h-3 w-3" />
              {statusBadge.label}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Renewal</p>
            <p className="text-xs text-foreground font-mono">
              {subscription.subscription_end
                ? format(new Date(subscription.subscription_end), "MMM d, yyyy")
                : "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Seats</p>
            <p className="text-xs text-foreground font-mono">{seatCount ?? 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Webhook</p>
            <p className="text-xs text-foreground font-mono flex items-center gap-1">
              <Webhook className="h-3 w-3 text-muted-foreground" />
              {subscription.last_webhook_event_at
                ? formatDistanceToNow(new Date(subscription.last_webhook_event_at), { addSuffix: true })
                : "Never"}
            </p>
          </div>
        </div>

        {subscription.upcoming_amount != null && (
          <p className="text-xs text-muted-foreground">
            Next invoice: ${(subscription.upcoming_amount / 100).toFixed(2)}
            {subscription.upcoming_date && ` on ${format(new Date(subscription.upcoming_date), "MMM d, yyyy")}`}
          </p>
        )}
      </div>

      {/* ── Billing Interval Toggle ── */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setBillingInterval("month")}
          className={`px-4 py-1.5 rounded-l-md text-xs font-medium border transition-colors ${
            billingInterval === "month" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-secondary"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingInterval("year")}
          className={`px-4 py-1.5 rounded-r-md text-xs font-medium border transition-colors ${
            billingInterval === "year" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-secondary"
          }`}
        >
          Yearly <span className="text-[10px] opacity-70">(Save ~17%)</span>
        </button>
      </div>

      {/* ── Plans Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const price = billingInterval === "year" ? plan.priceYearly : plan.priceMonthly;
          const period = billingInterval === "year" ? "/yr" : "/mo";
          return (
            <div
              key={plan.id}
              className={`rounded-lg border p-4 space-y-3 transition-colors ${
                isCurrentPlan
                  ? "border-primary bg-primary/5"
                  : plan.popular
                  ? "border-primary/40"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <plan.icon className={`h-4 w-4 ${isCurrentPlan ? "text-primary" : "text-muted-foreground"}`} />
                  <h4 className="text-sm font-semibold text-foreground">{plan.name}</h4>
                </div>
                {isCurrentPlan && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    Current
                  </span>
                )}
                {plan.popular && !isCurrentPlan && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                    Popular
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-bold text-foreground">{price}</span>
                <span className="text-xs text-muted-foreground">{period}</span>
              </div>

              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-primary/50" />
                    {f}
                  </li>
                ))}
              </ul>

              {!isCurrentPlan && (
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={checkoutLoading === plan.id}
                  className="w-full mt-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {checkoutLoading === plan.id ? (
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

      {/* ── Usage & Entitlements ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Usage & Limits</h3>
          </div>
          <div className="space-y-2">
            {(entitlements ?? []).filter((e: any) => e.daily_limit != null).map((e: any) => {
              const used = usageData?.monthlyByAction?.[e.feature_key] ?? 0;
              const monthlyLimit = e.monthly_limit ?? (e.daily_limit * 30);
              const pct = Math.min((used / monthlyLimit) * 100, 100);
              const isOverage = pct >= 90;
              return (
                <div key={e.feature_key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground capitalize">{e.feature_key.replace(/_/g, " ")}</span>
                    <span className={isOverage ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {used} / {monthlyLimit}{isOverage ? " ⚠" : ""}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOverage ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(entitlements ?? []).filter((e: any) => !e.enabled).map((e: any) => (
              <div key={e.feature_key} className="flex justify-between text-xs py-1">
                <span className="text-muted-foreground capitalize">{e.feature_key.replace(/_/g, " ")}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">Upgrade required</span>
              </div>
            ))}
          </div>
        </div>

        {/* Seat Management — only show for institutional */}
        {currentPlan === "institutional" && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Seat Management</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {seatCount ?? 0} active seat{(seatCount ?? 0) !== 1 ? "s" : ""}. Manage through the billing portal.
            </p>
            {subscription.subscribed && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="px-3 py-1.5 rounded-md bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
              >
                {portalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                Manage Seats & Invoices
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingDashboard;
