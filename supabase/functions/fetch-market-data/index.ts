import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FMP_BASE = "https://financialmodelingprep.com/stable";

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
    const limit = body.limit ?? 50; // Number of companies to process per invocation

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

    // FMP supports comma-separated tickers in batch (up to ~50)
    const tickerMap = new Map<string, { id: string; company_id: string }>();
    for (const row of marketRows) {
      if (row.ticker) tickerMap.set(row.ticker.toUpperCase(), { id: row.id, company_id: row.company_id });
    }

    const tickers = Array.from(tickerMap.keys());
    let processed = 0;
    let errors: string[] = [];

    // Process in chunks of 30 tickers (FMP batch limit varies by plan)
    for (let i = 0; i < tickers.length; i += 30) {
      const chunk = tickers.slice(i, i + 30);
      const tickerStr = chunk.join(",");

      try {
        // Fetch batch quotes using new stable endpoint
        const quoteRes = await fetch(`${FMP_BASE}/quote?symbol=${tickerStr}&apikey=${FMP_API_KEY}`);
        if (!quoteRes.ok) {
          const errText = await quoteRes.text();
          errors.push(`Quote API ${quoteRes.status}: ${errText}`);
          continue;
        }

        const quotes = await quoteRes.json();
        if (!Array.isArray(quotes)) {
          errors.push("Invalid quote response format");
          continue;
        }

        for (const q of quotes) {
          const sym = q.symbol?.toUpperCase();
          const entry = tickerMap.get(sym);
          if (!entry) continue;

          const updateData: Record<string, any> = {
            price: q.price ?? null,
            market_cap: q.marketCap ?? null,
            pe_ratio: q.pe ?? null,
            eps: q.eps ?? null,
            price_change_pct: q.changesPercentage ?? null,
            fifty_two_week_high: q.yearHigh ?? null,
            fifty_two_week_low: q.yearLow ?? null,
            volume_avg: q.avgVolume ?? null,
            beta: null, // Not in basic quote endpoint
            exchange: q.exchange ?? null,
            updated_at: new Date().toISOString(),
          };

          // Compute enterprise value if we have enough data
          // EV = Market Cap + Total Debt - Cash (we'll get debt/cash from income statement later)
          if (q.marketCap) {
            updateData.enterprise_value = q.marketCap; // Approximate, refined with financials
          }

          const { error: updateErr } = await supabase
            .from("public_market_data")
            .update(updateData)
            .eq("id", entry.id);

          if (updateErr) {
            errors.push(`Update ${sym}: ${updateErr.message}`);
          } else {
            processed++;
          }

          // Update company staleness
          await supabase.from("companies")
            .update({ last_market_fetch: new Date().toISOString() })
            .eq("id", entry.company_id);
        }

        // Now fetch income statements for fundamentals (revenue, EBITDA)
        // FMP free tier: use individual calls for top tickers
        const topTickers = chunk.slice(0, 5); // Limit to conserve API calls
        for (const ticker of topTickers) {
          try {
            const incRes = await fetch(`${FMP_BASE}/income-statement?symbol=${ticker}&limit=4&apikey=${FMP_API_KEY}`);
            if (!incRes.ok) continue;
            const incData = await incRes.json();
            if (!Array.isArray(incData) || !incData.length) continue;

            const latest = incData[0];
            const entry = tickerMap.get(ticker);
            if (!entry) continue;

            const revenue = latest.revenue ?? null;
            const ebitda = latest.ebitda ?? null;
            const marketData = quotes.find((q: any) => q.symbol?.toUpperCase() === ticker);
            const marketCap = marketData?.marketCap ?? null;

            const fundamentals: Record<string, any> = {
              revenue,
              ebitda,
            };

            // Compute EV more accurately
            if (marketCap && latest.totalDebt != null && latest.cashAndCashEquivalents != null) {
              fundamentals.enterprise_value = marketCap + (latest.totalDebt ?? 0) - (latest.cashAndCashEquivalents ?? 0);
            }

            // Compute multiples
            if (fundamentals.enterprise_value && revenue && revenue > 0) {
              fundamentals.ev_revenue = fundamentals.enterprise_value / revenue;
            }
            if (fundamentals.enterprise_value && ebitda && ebitda > 0) {
              fundamentals.ev_ebitda = fundamentals.enterprise_value / ebitda;
            }

            await supabase
              .from("public_market_data")
              .update(fundamentals)
              .eq("id", entry.id);

            // Also upsert into financials table so the scoring engine picks it up
            if (revenue || ebitda) {
              const period = latest.calendarYear ? `${latest.calendarYear}` : new Date().getFullYear().toString();
              await supabase.from("financials").upsert({
                company_id: entry.company_id,
                period,
                period_type: "annual",
                revenue,
                ebitda,
                gross_margin: latest.grossProfit && revenue ? latest.grossProfit / revenue : null,
                source: "fmp",
                confidence_score: "high",
              }, {
                onConflict: "company_id,period",
              });
            }
          } catch (incErr) {
            // Non-critical: skip individual income statement failures
          }
        }
      } catch (batchErr) {
        errors.push(`Batch error: ${(batchErr as Error).message}`);
      }

      // Rate limiting between chunks
      if (i + 30 < tickers.length) await sleep(1000);
    }

    // Refresh materialized views
    await supabase.rpc("refresh_materialized_views");

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
