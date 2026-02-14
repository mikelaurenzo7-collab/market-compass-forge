import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Auth user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user?.email) throw new Error("Not authenticated");

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resend = new Resend(RESEND_API_KEY);
    const sections: string[] = [];

    // Recent funding rounds
    const { data: rounds } = await serviceSupabase
      .from("funding_rounds")
      .select("round_type, amount, date, companies(name, sector)")
      .order("date", { ascending: false })
      .limit(6);

    if (rounds && rounds.length > 0) {
      const lines = (rounds as any[]).map((r) => {
        const amt = r.amount ? `$${(r.amount / 1e6).toFixed(0)}M` : "Undisclosed";
        return `<tr><td style="padding:4px 12px;">${r.companies?.name ?? "Unknown"}</td><td style="padding:4px 12px;">${r.round_type}</td><td style="padding:4px 12px;text-align:right;font-family:monospace;">${amt}</td></tr>`;
      });
      sections.push(`
        <h2 style="color:#f8fafc;margin:24px 0 8px;">💰 Recent Funding Rounds</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#cbd5e1;">
          <tbody>${lines.join("")}</tbody>
        </table>
      `);
    }

    // News sentiment
    const { data: news } = await serviceSupabase
      .from("news_articles")
      .select("title, sentiment_label, source_name, ai_summary")
      .order("published_at", { ascending: false })
      .limit(5);

    if (news && news.length > 0) {
      const lines = (news as any[]).map((n) => {
        const emoji = n.sentiment_label === "bullish" ? "🟢" : n.sentiment_label === "bearish" ? "🔴" : "⚪";
        return `<div style="padding:8px 0;border-bottom:1px solid #1e293b;"><span style="font-size:12px;">${emoji}</span> <strong style="color:#f8fafc;">${n.title}</strong><br/><span style="color:#64748b;font-size:12px;">${n.source_name ?? ""} · ${n.ai_summary ?? ""}</span></div>`;
      });
      sections.push(`
        <h2 style="color:#f8fafc;margin:24px 0 8px;">📰 Market Sentiment</h2>
        ${lines.join("")}
      `);
    }

    // Distressed highlights
    const { data: distressed } = await serviceSupabase
      .from("distressed_assets")
      .select("name, sector, discount_pct, asking_price, distress_type")
      .eq("status", "active")
      .order("listed_date", { ascending: false })
      .limit(4);

    if (distressed && distressed.length > 0) {
      const lines = (distressed as any[]).map((d) => {
        const price = d.asking_price ? `$${(d.asking_price / 1e6).toFixed(0)}M` : "TBD";
        const disc = d.discount_pct ? `${d.discount_pct}% off` : "";
        return `<tr><td style="padding:4px 12px;">${d.name}</td><td style="padding:4px 12px;color:#64748b;">${d.sector ?? d.distress_type}</td><td style="padding:4px 12px;text-align:right;font-family:monospace;">${price}</td><td style="padding:4px 12px;text-align:right;color:#f59e0b;">${disc}</td></tr>`;
      });
      sections.push(`
        <h2 style="color:#f8fafc;margin:24px 0 8px;">🔥 Distressed Opportunities</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#cbd5e1;">
          <tbody>${lines.join("")}</tbody>
        </table>
      `);
    }

    if (sections.length === 0) {
      sections.push(`<p style="color:#94a3b8;">No data available for your briefing yet. Add companies to your portfolio and watchlists to personalize.</p>`);
    }

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="color:#f8fafc;font-size:20px;margin:0;">🍇 Grapevine Daily Briefing</h1>
          <p style="color:#64748b;font-size:13px;margin:8px 0 0;">${today}</p>
          <p style="color:#f59e0b;font-size:11px;margin:4px 0 0;">⚡ TEST BRIEFING — This is a preview of your daily digest</p>
        </div>
        ${sections.join('<hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;"/>')}
        <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0 16px;"/>
        <p style="color:#475569;font-size:11px;text-align:center;">
          For informational purposes only. Not investment advice.<br/>
          Manage your briefing preferences in Settings → Briefing.
        </p>
      </div>
    </body>
    </html>`;

    await resend.emails.send({
      from: "Grapevine <briefing@updates.lovable.app>",
      to: [user.email],
      subject: `📊 Test Briefing — ${today}`,
      html,
    });

    return new Response(JSON.stringify({ success: true, sent_to: user.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-test-briefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
