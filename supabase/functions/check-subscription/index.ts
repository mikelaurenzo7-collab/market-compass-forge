import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  prod_Tx4XPahkBHh3ys: "essential",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // First check DB for cached subscription state (written by webhook)
    const { data: dbTier } = await supabaseClient
      .from("subscription_tiers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // If we have a recent webhook update (< 5 min ago), trust the DB
    if (dbTier?.last_webhook_event_at) {
      const webhookAge = Date.now() - new Date(dbTier.last_webhook_event_at).getTime();
      if (webhookAge < 5 * 60 * 1000) {
        logStep("Using cached DB state", { tier: dbTier.tier, status: dbTier.subscription_status });
        return new Response(JSON.stringify({
          subscribed: dbTier.subscription_status === "active",
          plan: dbTier.tier,
          subscription_end: dbTier.current_period_end,
          subscription_id: dbTier.stripe_subscription_id,
          stripe_customer_id: dbTier.stripe_customer_id,
          subscription_status: dbTier.subscription_status,
          billing_interval: dbTier.billing_interval,
          last_webhook_event_at: dbTier.last_webhook_event_at,
          upcoming_amount: null,
          upcoming_date: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Fallback: query Stripe directly
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({
        subscribed: false, plan: dbTier?.tier ?? "essential",
        subscription_status: "none",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActive = subscriptions.data.length > 0;
    let plan = dbTier?.tier ?? "essential";
    let subscriptionEnd: string | null = null;
    let subscriptionId: string | null = null;
    let subscriptionStatus = "none";
    let billingInterval = "month";
    let priceId: string | null = null;

    if (hasActive) {
      const sub = subscriptions.data[0];
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      subscriptionId = sub.id;
      subscriptionStatus = sub.status;
      const productId = sub.items.data[0]?.price?.product as string;
      priceId = sub.items.data[0]?.price?.id ?? null;
      billingInterval = sub.items.data[0]?.price?.recurring?.interval ?? "month";
      plan = PRODUCT_TO_PLAN[productId] ?? sub.metadata?.plan ?? "professional";
      logStep("Active subscription", { plan, subscriptionEnd });

      // Sync to DB
      await supabaseClient.from("subscription_tiers").upsert(
        {
          user_id: user.id,
          tier: plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: subscriptionStatus,
          current_period_end: subscriptionEnd,
          stripe_price_id: priceId,
          billing_interval: billingInterval,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    // Get upcoming invoice
    let upcomingAmount: number | null = null;
    let upcomingDate: string | null = null;
    try {
      const invoice = await stripe.invoices.retrieveUpcoming({ customer: customerId });
      upcomingAmount = invoice.amount_due;
      upcomingDate = invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000).toISOString()
        : null;
    } catch { /* no upcoming invoice */ }

    return new Response(JSON.stringify({
      subscribed: hasActive,
      plan,
      subscription_end: subscriptionEnd,
      subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      subscription_status: subscriptionStatus,
      billing_interval: billingInterval,
      last_webhook_event_at: dbTier?.last_webhook_event_at ?? null,
      upcoming_amount: upcomingAmount,
      upcoming_date: upcomingDate,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
