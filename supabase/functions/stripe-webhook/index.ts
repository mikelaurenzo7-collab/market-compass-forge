import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PRODUCT_TO_PLAN: Record<string, string> = {
  prod_Tx4XPahkBHh3ys: "essential",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response("STRIPE_SECRET_KEY not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const event = JSON.parse(body) as Stripe.Event;
    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan ?? "essential";
        if (userId) {
          await supabase.from("subscription_tiers").upsert(
            { user_id: userId, tier: plan },
            { onConflict: "user_id" }
          );
          await supabase.from("conversion_events").insert({
            user_id: userId,
            event_type: "paid_conversion",
            metadata: { plan, session_id: session.id, amount: session.amount_total },
          });
          logStep("Checkout completed", { userId, plan });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const email = sub.customer ? undefined : undefined;
        // Look up user by customer email
        const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
        if (customer.email) {
          const { data: users } = await supabase.auth.admin.listUsers();
          const user = users?.users?.find(u => u.email === customer.email);
          if (user) {
            const productId = sub.items.data[0]?.price?.product as string;
            const plan = PRODUCT_TO_PLAN[productId] ?? "professional";
            const tier = sub.status === "active" ? plan : "essential";
            await supabase.from("subscription_tiers").upsert(
              { user_id: user.id, tier },
              { onConflict: "user_id" }
            );
            logStep("Subscription updated", { userId: user.id, tier, status: sub.status });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
        if (customer.email) {
          const { data: users } = await supabase.auth.admin.listUsers();
          const user = users?.users?.find(u => u.email === customer.email);
          if (user) {
            await supabase.from("subscription_tiers").upsert(
              { user_id: user.id, tier: "essential" },
              { onConflict: "user_id" }
            );
            await supabase.from("conversion_events").insert({
              user_id: user.id,
              event_type: "churn",
              metadata: { subscription_id: sub.id },
            });
            logStep("Subscription canceled", { userId: user.id });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        logStep("Payment failed", { invoice: (event.data.object as any).id });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
