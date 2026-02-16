import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Plan → Stripe price mapping (monthly + yearly)
const PLAN_PRICES: Record<string, Record<string, string>> = {
  essential: {
    month: "price_1SzAOUBkj1ceqM1kle9Sevii",
    year: "price_essential_yearly", // TODO: create in Stripe dashboard
  },
  professional: {
    month: "price_professional_monthly", // TODO: create in Stripe dashboard
    year: "price_professional_yearly",
  },
  institutional: {
    month: "price_institutional_monthly", // TODO: create in Stripe dashboard
    year: "price_institutional_yearly",
  },
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { plan = "essential", interval = "month" } = await req.json();
    const planPrices = PLAN_PRICES[plan];
    if (!planPrices) throw new Error(`Unknown plan: ${plan}`);
    const priceId = planPrices[interval] ?? planPrices.month;
    if (!priceId || priceId.startsWith("price_") && priceId.includes("_monthly") || priceId.includes("_yearly")) {
      // Placeholder IDs — check if they're real
      logStep("Warning: using placeholder price ID", { plan, interval, priceId });
    }
    logStep("Selected price", { plan, interval, priceId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      // Check for existing active subscription
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (subs.data.length > 0) {
        logStep("User already has active subscription", { subscriptionId: subs.data[0].id });
        // Redirect to portal instead
        const portal = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${req.headers.get("origin") || "https://market-compass-forge.lovable.app"}/settings?tab=billing`,
        });
        return new Response(JSON.stringify({ url: portal.url, type: "portal" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const origin = req.headers.get("origin") || "https://market-compass-forge.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/settings?tab=billing&checkout=success`,
      cancel_url: `${origin}/settings?tab=billing&checkout=canceled`,
      metadata: { user_id: user.id, plan, interval },
    });

    // Track conversion event
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    await adminClient.from("conversion_events").insert({
      user_id: user.id,
      event_type: "checkout_started",
      metadata: { plan, interval, session_id: session.id },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url, type: "checkout" }), {
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
