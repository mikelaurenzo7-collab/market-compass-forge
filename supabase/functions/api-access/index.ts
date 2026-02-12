import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Rate limiting: check usage_tracking count for today
async function checkRateLimit(supabase: any, userId: string, tier: string): Promise<{ allowed: boolean; remaining: number }> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("usage_tracking")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "api_request")
    .gte("created_at", todayStart.toISOString());

  const limits: Record<string, number> = { free: 500, professional: 10000, pro: 10000, enterprise: 1000000 };
  const limit = limits[tier] ?? limits.free;
  const used = count ?? 0;

  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer lpi_")) {
      return new Response(JSON.stringify({
        error: "Invalid API key format. Keys must start with lpi_",
        docs: "See /developers for API documentation",
      }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = authHeader.replace("Bearer ", "");
    const keyHash = await hashKey(apiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify API key
    const { data: secretRecord, error: secretError } = await supabase
      .from("api_key_secrets")
      .select("api_key_id")
      .eq("key_hash", keyHash)
      .single();

    if (secretError || !secretRecord) {
      return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: keyRecord, error: keyError } = await supabase
      .from("api_keys")
      .select("id, user_id, scopes, is_active, expires_at")
      .eq("id", secretRecord.api_key_id)
      .eq("is_active", true)
      .single();

    if (keyError || !keyRecord) {
      return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "API key has expired" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user tier for rate limiting
    const { data: tierData } = await supabase
      .from("subscription_tiers")
      .select("tier")
      .eq("user_id", keyRecord.user_id)
      .single();

    const tier = tierData?.tier ?? "free";

    // Rate limit check
    const { allowed, remaining } = await checkRateLimit(supabase, keyRecord.user_id, tier);
    const rateLimitHeaders = {
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Tier": tier,
    };

    if (!allowed) {
      return new Response(JSON.stringify({
        error: "Rate limit exceeded",
        tier,
        message: `${tier} tier limit reached. Upgrade for higher limits.`,
      }), {
        status: 429,
        headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" },
      });
    }

    // Track usage + update last_used_at
    await Promise.all([
      supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id),
      supabase.from("usage_tracking").insert({ user_id: keyRecord.user_id, action: "api_request" }),
    ]);

    // Parse request
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "companies";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 500);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    let data: any = null;
    let count: number | null = null;

    switch (action) {
      case "companies": {
        const sector = url.searchParams.get("sector");
        const stage = url.searchParams.get("stage");
        const search = url.searchParams.get("search");
        const market_type = url.searchParams.get("market_type");

        let query = supabase
          .from("companies")
          .select("id, name, sector, sub_sector, stage, market_type, hq_country, hq_city, employee_count, founded_year, domain, description, status", { count: "exact" });

        if (sector) query = query.eq("sector", sector);
        if (stage) query = query.eq("stage", stage);
        if (market_type) query = query.eq("market_type", market_type);
        if (search) query = query.ilike("name", `%${search}%`);

        const result = await query.order("name").range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "market-data": {
        const ticker = url.searchParams.get("ticker");
        const companyId = url.searchParams.get("company_id");
        const minCap = url.searchParams.get("min_market_cap");
        const maxCap = url.searchParams.get("max_market_cap");

        let query = supabase
          .from("public_market_data")
          .select("company_id, ticker, exchange, price, price_change_pct, market_cap, pe_ratio, eps, beta, volume_avg, dividend_yield, fifty_two_week_high, fifty_two_week_low, updated_at, companies(name, sector)", { count: "exact" });

        if (ticker) query = query.eq("ticker", ticker);
        if (companyId) query = query.eq("company_id", companyId);
        if (minCap) query = query.gte("market_cap", Number(minCap));
        if (maxCap) query = query.lte("market_cap", Number(maxCap));

        const result = await query.order("market_cap", { ascending: false, nullsFirst: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "screening": {
        const sector = url.searchParams.get("sector");
        const market_type = url.searchParams.get("market_type");
        const min_revenue = url.searchParams.get("min_revenue");
        const max_revenue = url.searchParams.get("max_revenue");
        const min_arr = url.searchParams.get("min_arr");
        const stage = url.searchParams.get("stage");

        // Join companies with latest financials
        let query = supabase
          .from("companies")
          .select("id, name, sector, sub_sector, stage, market_type, hq_country, employee_count, founded_year, financials(revenue, arr, gross_margin, ebitda, period), public_market_data(price, market_cap, pe_ratio, ticker)", { count: "exact" });

        if (sector) query = query.eq("sector", sector);
        if (market_type) query = query.eq("market_type", market_type);
        if (stage) query = query.eq("stage", stage);

        const result = await query.order("name").range(offset, offset + limit - 1);
        if (result.error) throw result.error;

        // Post-filter by financial metrics
        let filtered = (result.data ?? []).map((c: any) => {
          const latestFin = c.financials?.sort((a: any, b: any) => b.period.localeCompare(a.period))?.[0];
          const mkt = Array.isArray(c.public_market_data) ? c.public_market_data[0] : c.public_market_data;
          return {
            id: c.id, name: c.name, sector: c.sector, sub_sector: c.sub_sector,
            stage: c.stage, market_type: c.market_type, hq_country: c.hq_country,
            employee_count: c.employee_count, founded_year: c.founded_year,
            revenue: latestFin?.revenue ?? null,
            arr: latestFin?.arr ?? null,
            gross_margin: latestFin?.gross_margin ?? null,
            ebitda: latestFin?.ebitda ?? null,
            price: mkt?.price ?? null,
            market_cap: mkt?.market_cap ?? null,
            pe_ratio: mkt?.pe_ratio ?? null,
            ticker: mkt?.ticker ?? null,
          };
        });

        if (min_revenue) filtered = filtered.filter((c: any) => c.revenue && c.revenue >= Number(min_revenue));
        if (max_revenue) filtered = filtered.filter((c: any) => c.revenue && c.revenue <= Number(max_revenue));
        if (min_arr) filtered = filtered.filter((c: any) => c.arr && c.arr >= Number(min_arr));

        data = filtered;
        count = result.count;
        break;
      }

      case "financials": {
        const companyId = url.searchParams.get("company_id");
        let query = supabase
          .from("financials")
          .select("company_id, period, period_type, revenue, arr, gross_margin, ebitda, burn_rate, runway_months, confidence_score, source", { count: "exact" });

        if (companyId) query = query.eq("company_id", companyId);

        const result = await query.order("period", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "funding": {
        const companyId = url.searchParams.get("company_id");
        let query = supabase
          .from("funding_rounds")
          .select("company_id, round_type, amount, valuation_post, valuation_pre, date, lead_investors, co_investors, confidence_score", { count: "exact" });

        if (companyId) query = query.eq("company_id", companyId);

        const result = await query.order("date", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "investors": {
        const search = url.searchParams.get("search");
        const type = url.searchParams.get("type");
        let query = supabase
          .from("investors")
          .select("id, name, type, hq_country, aum, website", { count: "exact" });

        if (search) query = query.ilike("name", `%${search}%`);
        if (type) query = query.eq("type", type);

        const result = await query.order("name").range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "news": {
        const companyId = url.searchParams.get("company_id");
        const sentiment = url.searchParams.get("sentiment");
        let query = supabase
          .from("news_articles")
          .select("id, company_id, title, summary, ai_summary, source_name, published_at, sentiment_score, sentiment_label, tags", { count: "exact" });

        if (companyId) query = query.eq("company_id", companyId);
        if (sentiment) query = query.eq("sentiment_label", sentiment);

        const result = await query.order("published_at", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      default:
        return new Response(JSON.stringify({
          error: `Unknown action: ${action}`,
          available_actions: ["companies", "market-data", "screening", "financials", "funding", "investors", "news"],
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      data,
      meta: { total: count, limit, offset, action, tier },
    }), {
      status: 200,
      headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("API access error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message ?? "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
