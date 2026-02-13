import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    if (!FMP_API_KEY) {
      return new Response(JSON.stringify({ error: "FMP_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit ?? 50, 250);

    // Get companies that have tickers but no price data, or stale data
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: marketRows, error: fetchErr } = await supabase
      .from("public_market_data")
      .select("id, company_id, ticker")
      .or(`price.is.null,updated_at.lt.${cutoff}`)
      .order("updated_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (fetchErr) throw fetchErr;
    if (!marketRows?.length) {
      return new Response(JSON.stringify({ message: "No tickers need refresh", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tickerMap = new Map<string, { id: string; company_id: string }>();
    for (const row of marketRows) {
      if (row.ticker) tickerMap.set(row.ticker.toUpperCase(), { id: row.id, company_id: row.company_id });
    }

    const tickers = Array.from(tickerMap.keys());
    let processed = 0;
    const errors: string[] = [];

    // Try /stable/profile which includes price data and is available on free tier
    // Process one ticker at a time to stay within free tier limits
    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const entry = tickerMap.get(ticker);
      if (!entry) continue;

      try {
        // /stable/profile includes: price, marketCap, beta, volAvg, etc.
        const profileRes = await fetch(
          `https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${FMP_API_KEY}`
        );

        if (!profileRes.ok) {
          const errText = await profileRes.text();
          // If 402/403, try legacy v3 as fallback
          if (profileRes.status === 402 || profileRes.status === 403) {
            errors.push(`FMP API requires paid plan for ${ticker}`);
            // Stop after first paid-plan error to conserve calls
            if (errors.length >= 3) break;
            continue;
          }
          errors.push(`Profile ${ticker}: ${profileRes.status}`);
          continue;
        }

        const profiles = await profileRes.json();
        if (!Array.isArray(profiles) || !profiles.length) continue;

        const p = profiles[0];

        const updateData: Record<string, any> = {
          price: p.price ?? null,
          market_cap: p.mktCap ?? p.marketCap ?? null,
          pe_ratio: p.pe ?? null,
          eps: p.eps ?? null,
          beta: p.beta ?? null,
          volume_avg: p.volAvg ?? null,
          fifty_two_week_high: p.range ? parseFloat(p.range.split("-")[1]) : null,
          fifty_two_week_low: p.range ? parseFloat(p.range.split("-")[0]) : null,
          price_change_pct: p.changes != null && p.price ? (p.changes / p.price) * 100 : null,
          exchange: p.exchangeShortName ?? p.exchange ?? null,
          enterprise_value: p.mktCap ?? p.marketCap ?? null,
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from("public_market_data")
          .update(updateData)
          .eq("id", entry.id);

        if (updateErr) {
          errors.push(`Update ${ticker}: ${updateErr.message}`);
        } else {
          processed++;
        }

        await supabase.from("companies")
          .update({ last_market_fetch: new Date().toISOString() })
          .eq("id", entry.company_id);

      } catch (e) {
        errors.push(`${ticker}: ${(e as Error).message}`);
      }

      // Rate limit: ~4 req/sec on free tier
      if (i < tickers.length - 1) await sleep(300);
    }

    // Refresh materialized views if we updated anything
    if (processed > 0) {
      try {
        await supabase.rpc("refresh_materialized_views");
      } catch (_e) {
        errors.push("MV refresh skipped");
      }
    }

    return new Response(JSON.stringify({
      processed,
      total: tickers.length,
      errors: errors.slice(0, 10),
      message: `Updated market data for ${processed}/${tickers.length} tickers`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-market-data error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
