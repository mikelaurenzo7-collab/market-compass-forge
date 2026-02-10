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

    const resend = new Resend(RESEND_API_KEY);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all users with briefing enabled
    const { data: prefs, error: prefsErr } = await supabase
      .from("briefing_preferences")
      .select("*")
      .eq("enabled", true);

    if (prefsErr) throw prefsErr;
    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ message: "No users with briefings enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const pref of prefs) {
      try {
        // Get user email
        const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(pref.user_id);
        if (userErr || !user?.email) continue;

        const email = pref.email_override || user.email;
        const sections: string[] = [];

        // -- Portfolio P&L --
        if (pref.include_portfolio) {
          const { data: portfolios } = await supabase
            .from("portfolios")
            .select("id, name")
            .eq("user_id", pref.user_id);

          if (portfolios && portfolios.length > 0) {
            const portfolioIds = portfolios.map((p: any) => p.id);
            const { data: positions } = await supabase
              .from("portfolio_positions")
              .select("shares, entry_price, company_id, companies(name, market_type), portfolio_id")
              .in("portfolio_id", portfolioIds);

            if (positions && positions.length > 0) {
              const companyIds = [...new Set(positions.map((p: any) => p.company_id))];
              const { data: marketData } = await supabase
                .from("public_market_data")
                .select("company_id, price, price_change_pct")
                .in("company_id", companyIds);

              const mktMap = new Map((marketData ?? []).map((m: any) => [m.company_id, m]));
              let totalValue = 0;
              let totalCost = 0;
              const positionLines: string[] = [];

              for (const pos of positions as any[]) {
                const mkt = mktMap.get(pos.company_id);
                const currentPrice = mkt?.price ?? pos.entry_price;
                const value = Number(pos.shares) * Number(currentPrice);
                const cost = Number(pos.shares) * Number(pos.entry_price);
                totalValue += value;
                totalCost += cost;
                const pnl = value - cost;
                const pnlPct = cost > 0 ? ((pnl / cost) * 100).toFixed(1) : "0.0";
                const arrow = pnl >= 0 ? "↑" : "↓";
                const color = pnl >= 0 ? "#22c55e" : "#ef4444";
                positionLines.push(
                  `<tr><td style="padding:6px 12px;">${pos.companies?.name ?? "Unknown"}</td><td style="padding:6px 12px;text-align:right;">$${value.toLocaleString("en", { maximumFractionDigits: 0 })}</td><td style="padding:6px 12px;text-align:right;color:${color};">${arrow} ${pnlPct}%</td></tr>`
                );
              }

              const totalPnl = totalValue - totalCost;
              const totalPnlPct = totalCost > 0 ? ((totalPnl / totalCost) * 100).toFixed(1) : "0.0";

              sections.push(`
                <h2 style="color:#f8fafc;margin:24px 0 8px;">📊 Portfolio Summary</h2>
                <p style="color:#94a3b8;margin-bottom:12px;">Total Value: <strong style="color:#f8fafc;">$${totalValue.toLocaleString("en", { maximumFractionDigits: 0 })}</strong> · P&L: <strong style="color:${totalPnl >= 0 ? "#22c55e" : "#ef4444"};">${totalPnl >= 0 ? "+" : ""}${totalPnlPct}%</strong></p>
                <table style="width:100%;border-collapse:collapse;font-size:13px;color:#cbd5e1;">
                  <thead><tr style="border-bottom:1px solid #334155;"><th style="padding:6px 12px;text-align:left;color:#64748b;">Company</th><th style="padding:6px 12px;text-align:right;color:#64748b;">Value</th><th style="padding:6px 12px;text-align:right;color:#64748b;">Return</th></tr></thead>
                  <tbody>${positionLines.slice(0, 10).join("")}</tbody>
                </table>
              `);
            }
          }
        }

        // -- Watchlist movements --
        if (pref.include_watchlists) {
          const { data: watchlists } = await supabase
            .from("user_watchlists")
            .select("name, company_ids")
            .eq("user_id", pref.user_id);

          if (watchlists && watchlists.length > 0) {
            const allIds = watchlists.flatMap((w: any) => w.company_ids ?? []);
            if (allIds.length > 0) {
              const { data: mktData } = await supabase
                .from("public_market_data")
                .select("company_id, ticker, price, price_change_pct, companies(name)")
                .in("company_id", allIds)
                .not("price_change_pct", "is", null)
                .order("price_change_pct", { ascending: false })
                .limit(8);

              if (mktData && mktData.length > 0) {
                const lines = (mktData as any[]).map((m) => {
                  const color = m.price_change_pct >= 0 ? "#22c55e" : "#ef4444";
                  const arrow = m.price_change_pct >= 0 ? "↑" : "↓";
                  return `<tr><td style="padding:4px 12px;color:#94a3b8;font-family:monospace;font-size:11px;">${m.ticker}</td><td style="padding:4px 12px;">${m.companies?.name}</td><td style="padding:4px 12px;text-align:right;">$${Number(m.price).toFixed(2)}</td><td style="padding:4px 12px;text-align:right;color:${color};">${arrow} ${Math.abs(m.price_change_pct).toFixed(1)}%</td></tr>`;
                });

                sections.push(`
                  <h2 style="color:#f8fafc;margin:24px 0 8px;">👀 Watchlist Movers</h2>
                  <table style="width:100%;border-collapse:collapse;font-size:13px;color:#cbd5e1;">
                    <tbody>${lines.join("")}</tbody>
                  </table>
                `);
              }
            }
          }
        }

        // -- Recent funding rounds --
        if (pref.include_funding) {
          const yesterday = new Date(Date.now() - 86400_000 * 7).toISOString().split("T")[0];
          const { data: rounds } = await supabase
            .from("funding_rounds")
            .select("round_type, amount, date, companies(name, sector)")
            .gte("date", yesterday)
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
        }

        // -- News sentiment --
        if (pref.include_news_sentiment) {
          const { data: news } = await supabase
            .from("news_articles")
            .select("title, sentiment_label, sentiment_score, source_name, ai_summary")
            .order("published_at", { ascending: false })
            .limit(5);

          if (news && news.length > 0) {
            const lines = (news as any[]).map((n) => {
              const emoji = n.sentiment_label === "bullish" ? "🟢" : n.sentiment_label === "bearish" ? "🔴" : "⚪";
              return `<div style="padding:8px 0;border-bottom:1px solid #1e293b;"><span style="font-size:12px;">${emoji}</span> <strong style="color:#f8fafc;">${n.title}</strong><br/><span style="color:#64748b;font-size:12px;">${n.source_name} · ${n.ai_summary ?? ""}</span></div>`;
            });

            sections.push(`
              <h2 style="color:#f8fafc;margin:24px 0 8px;">📰 Market Sentiment</h2>
              ${lines.join("")}
            `);
          }
        }

        if (sections.length === 0) continue;

        const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

        const html = `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="color:#f8fafc;font-size:20px;margin:0;">🍇 Grapevine Daily Briefing</h1>
              <p style="color:#64748b;font-size:13px;margin:8px 0 0;">${today}</p>
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
          to: [email],
          subject: `📊 Your Daily Briefing — ${today}`,
          html,
        });

        sentCount++;
      } catch (userErr) {
        console.error(`Failed for user ${pref.user_id}:`, userErr);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-briefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
