import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PRODUCT_TO_PLAN: Record<string, string> = {
  prod_Tx4XPahkBHh3ys: "essential",
  // Add product IDs here when Professional / Institutional products are created
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

async function resolveUserByCustomer(
  stripe: Stripe,
  supabase: any,
  customerId: string
): Promise<{ userId: string; email: string } | null> {
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  if (!customer.email) return null;
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find((u: any) => u.email === customer.email);
  if (!user) return null;
  return { userId: user.id, email: customer.email };
}

function resolvePlan(sub: Stripe.Subscription): { plan: string; priceId: string; interval: string } {
  const item = sub.items.data[0];
  const productId = item?.price?.product as string;
  const priceId = item?.price?.id ?? "";
  const interval = item?.price?.recurring?.interval ?? "month";
  const plan = PRODUCT_TO_PLAN[productId] ?? sub.metadata?.plan ?? "professional";
  return { plan, priceId, interval };
}

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
        const interval = session.metadata?.interval ?? "month";
        if (userId && session.subscription) {
          // Fetch the full subscription to get period end
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = sub.items.data[0]?.price?.id ?? "";
          await supabase.from("subscription_tiers").upsert(
            {
              user_id: userId,
              tier: plan,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_status: sub.status,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              stripe_price_id: priceId,
              billing_interval: interval,
              last_webhook_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
          await supabase.from("conversion_events").insert({
            user_id: userId,
            event_type: "paid_conversion",
            metadata: { plan, session_id: session.id, amount: session.amount_total },
          });
          logStep("Checkout completed — tier synced", { userId, plan, status: sub.status });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const resolved = await resolveUserByCustomer(stripe, supabase, sub.customer as string);
        if (resolved) {
          const { plan, priceId, interval } = resolvePlan(sub);
          const tier = sub.status === "active" ? plan : "essential";
          await supabase.from("subscription_tiers").upsert(
            {
              user_id: resolved.userId,
              tier,
              stripe_customer_id: sub.customer as string,
              stripe_subscription_id: sub.id,
              subscription_status: sub.status,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              stripe_price_id: priceId,
              billing_interval: interval,
              last_webhook_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
          logStep("Subscription synced", { userId: resolved.userId, tier, status: sub.status });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const resolved = await resolveUserByCustomer(stripe, supabase, sub.customer as string);
        if (resolved) {
          await supabase.from("subscription_tiers").upsert(
            {
              user_id: resolved.userId,
              tier: "essential",
              stripe_subscription_id: sub.id,
              subscription_status: "canceled",
              last_webhook_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
          await supabase.from("conversion_events").insert({
            user_id: resolved.userId,
            event_type: "churn",
            metadata: { subscription_id: sub.id },
          });
          logStep("Subscription canceled", { userId: resolved.userId });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        logStep("Payment failed", { invoice: invoice.id, customer: invoice.customer });
        // Optionally downgrade or flag
        const resolved = await resolveUserByCustomer(stripe, supabase, invoice.customer);
        if (resolved) {
          await supabase.from("subscription_tiers").update({
            subscription_status: "past_due",
            last_webhook_event_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("user_id", resolved.userId);
        }
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
