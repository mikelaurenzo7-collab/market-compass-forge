import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};


function parseBoundedInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkRateLimit(supabase: any, userId: string, tier: string): Promise<{ allowed: boolean; remaining: number; limit: number; used: number }> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("usage_tracking")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "api_request")
    .gte("created_at", todayStart.toISOString());

  const limits: Record<string, number> = {
    free: 500,
    analyst: 500,
    essential: 500,
    professional: 10000,
    pro: 10000,
    enterprise: 1000000,
    institutional: 1000000,
  };
  const limit = limits[tier] ?? limits.free;
  const used = count ?? 0;

  return { allowed: used < limit, remaining: Math.max(0, limit - used), limit, used };
}


async function trackRateWindow(supabase: any, userId: string, endpoint: string): Promise<number> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCMinutes(0, 0, 0);

  const { data: existing, error: readError } = await supabase
    .from("rate_limits")
    .select("id, request_count")
    .eq("identifier", userId)
    .eq("endpoint", endpoint)
    .eq("window_start", windowStart.toISOString())
    .maybeSingle();

  if (readError) {
    console.warn("rate limit read failed", readError);
    return 0;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("rate_limits").insert({
      identifier: userId,
      endpoint,
      window_start: windowStart.toISOString(),
      request_count: 1,
    });
    if (insertError) {
      console.warn("rate limit insert failed", insertError);
      return 0;
    }
    return 1;
  }

  const nextCount = (existing.request_count ?? 0) + 1;
  const { error: updateError } = await supabase
    .from("rate_limits")
    .update({ request_count: nextCount })
    .eq("id", existing.id);

  if (updateError) {
    console.warn("rate limit update failed", updateError);
    return existing.request_count ?? 0;
  }

  return nextCount;
}

async function logTelemetry(supabase: any, payload: {
  statusCode: number;
  latencyMs: number;
  userId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  method?: string;
}) {
  const { error } = await supabase.from("api_telemetry").insert({
    function_name: "api-access",
    method: payload.method ?? "GET",
    status_code: payload.statusCode,
    latency_ms: payload.latencyMs,
    user_id: payload.userId ?? null,
    error_message: payload.errorMessage ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) console.warn("telemetry insert failed", error);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestStart = Date.now();
  let telemetryUserId: string | undefined;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer lpi_")) {
      await logTelemetry(supabase, {
        statusCode: 401,
        latencyMs: Date.now() - requestStart,
        errorMessage: "Invalid API key format",
        metadata: { endpoint: "api-access" },
      });

      return new Response(JSON.stringify({
        error: "Invalid API key format. Keys must start with lpi_",
        docs: "See /developers for API documentation",
      }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = authHeader.replace("Bearer ", "");
    const keyHash = await hashKey(apiKey);

    // Verify API key
    const { data: secretRecord, error: secretError } = await supabase
      .from("api_key_secrets")
      .select("api_key_id")
      .eq("key_hash", keyHash)
      .single();

    if (secretError || !secretRecord) {
      await logTelemetry(supabase, {
        statusCode: 401,
        latencyMs: Date.now() - requestStart,
        errorMessage: "Invalid or inactive API key",
        metadata: { endpoint: "api-access" },
      });

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
      await logTelemetry(supabase, {
        statusCode: 401,
        latencyMs: Date.now() - requestStart,
        errorMessage: "Invalid or inactive API key",
        metadata: { endpoint: "api-access" },
      });

      return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      await logTelemetry(supabase, {
        statusCode: 401,
        latencyMs: Date.now() - requestStart,
        userId: keyRecord.user_id,
        errorMessage: "API key has expired",
        metadata: { endpoint: "api-access" },
      });

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
    telemetryUserId = keyRecord.user_id;

    // Rate limit check
    const { allowed, remaining, limit: tierLimit, used } = await checkRateLimit(supabase, keyRecord.user_id, tier);
    const rateLimitHeaders = {
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Tier": tier,
      "X-RateLimit-Limit": String(tierLimit),
    };

    if (!allowed) {
      await logTelemetry(supabase, {
        statusCode: 429,
        latencyMs: Date.now() - requestStart,
        userId: keyRecord.user_id,
        errorMessage: "Rate limit exceeded",
        metadata: { tier, tierLimit, used, endpoint: "api-access" },
      });

      return new Response(JSON.stringify({
        error: "Rate limit exceeded",
        tier,
        message: `${tier} tier limit reached. Upgrade for higher limits.`,
      }), {
        status: 429,
        headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" },
      });
    }

    // Track usage + update last_used_at + hourly rate window
    const hourlyCountPromise = trackRateWindow(supabase, keyRecord.user_id, "api-access");
    await Promise.all([
      supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id),
      supabase.from("usage_tracking").insert({ user_id: keyRecord.user_id, action: "api_request" }),
      hourlyCountPromise,
    ]);
    const currentHourRequests = await hourlyCountPromise;

    // Parse request
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "companies";
    const limit = parseBoundedInt(url.searchParams.get("limit"), 50, 1, 500);
    const offset = parseBoundedInt(url.searchParams.get("offset"), 0, 0, 1_000_000);

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

        let query = supabase
          .from("companies")
          .select("id, name, sector, sub_sector, stage, market_type, hq_country, employee_count, founded_year, financials(revenue, arr, gross_margin, ebitda, period), public_market_data(price, market_cap, pe_ratio, ticker)", { count: "exact" });

        if (sector) query = query.eq("sector", sector);
        if (market_type) query = query.eq("market_type", market_type);
        if (stage) query = query.eq("stage", stage);

        const result = await query.order("name").range(offset, offset + limit - 1);
        if (result.error) throw result.error;

        let filtered = (result.data ?? []).map((c: any) => {
          const latestFin = c.financials?.sort((a: any, b: any) => b.period.localeCompare(a.period))?.[0];
          const mkt = Array.isArray(c.public_market_data) ? c.public_market_data[0] : c.public_market_data;
          return {
            id: c.id, name: c.name, sector: c.sector, sub_sector: c.sub_sector,
            stage: c.stage, market_type: c.market_type, hq_country: c.hq_country,
            employee_count: c.employee_count, founded_year: c.founded_year,
            revenue: latestFin?.revenue ?? null, arr: latestFin?.arr ?? null,
            gross_margin: latestFin?.gross_margin ?? null, ebitda: latestFin?.ebitda ?? null,
            price: mkt?.price ?? null, market_cap: mkt?.market_cap ?? null,
            pe_ratio: mkt?.pe_ratio ?? null, ticker: mkt?.ticker ?? null,
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

      // --- NEW ENDPOINTS ---

      case "distressed": {
        const sector = url.searchParams.get("sector");
        const distress_type = url.searchParams.get("distress_type");
        const asset_type = url.searchParams.get("asset_type");
        const status = url.searchParams.get("status");
        const min_discount = url.searchParams.get("min_discount");

        let query = supabase
          .from("distressed_assets")
          .select("id, name, sector, asset_type, distress_type, status, asking_price, estimated_value, discount_pct, location_city, location_state, listed_date, description, key_metrics, source", { count: "exact" });

        if (sector) query = query.eq("sector", sector);
        if (distress_type) query = query.eq("distress_type", distress_type);
        if (asset_type) query = query.eq("asset_type", asset_type);
        if (status) query = query.eq("status", status);
        if (min_discount) query = query.gte("discount_pct", Number(min_discount));

        const result = await query.order("listed_date", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "deals": {
        const deal_type = url.searchParams.get("deal_type");
        const industry = url.searchParams.get("industry");
        const status = url.searchParams.get("status");
        const min_value = url.searchParams.get("min_value");

        let query = supabase
          .from("deal_transactions")
          .select("id, target_company, acquirer_investor, deal_type, deal_value, ev_revenue, ev_ebitda, target_industry, status, announced_date, closed_date", { count: "exact" });

        if (deal_type) query = query.eq("deal_type", deal_type);
        if (industry) query = query.eq("target_industry", industry);
        if (status) query = query.eq("status", status);
        if (min_value) query = query.gte("deal_value", Number(min_value));

        const result = await query.order("announced_date", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "funds": {
        const strategy = url.searchParams.get("strategy");
        const min_irr = url.searchParams.get("min_irr");
        const vintage_year = url.searchParams.get("vintage_year");

        let query = supabase
          .from("funds")
          .select("id, name, gp_name, strategy, vintage_year, fund_size, net_irr, tvpi, dpi, quartile", { count: "exact" });

        if (strategy) query = query.eq("strategy", strategy);
        if (min_irr) query = query.gte("net_irr", Number(min_irr));
        if (vintage_year) query = query.eq("vintage_year", Number(vintage_year));

        const result = await query.order("vintage_year", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "global-opportunities": {
        const region = url.searchParams.get("region");
        const country = url.searchParams.get("country");
        const opportunity_type = url.searchParams.get("opportunity_type");
        const sector = url.searchParams.get("sector");
        const min_value = url.searchParams.get("min_value");

        let query = supabase
          .from("global_opportunities")
          .select("id, name, country, region, opportunity_type, sector, deal_value_usd, deal_value_local, local_currency, risk_rating, stage, status, listed_date, description, sovereign_fund_interest", { count: "exact" });

        if (region) query = query.eq("region", region);
        if (country) query = query.eq("country", country);
        if (opportunity_type) query = query.eq("opportunity_type", opportunity_type);
        if (sector) query = query.eq("sector", sector);
        if (min_value) query = query.gte("deal_value_usd", Number(min_value));

        const result = await query.order("listed_date", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "real-estate": {
        const property_type = url.searchParams.get("property_type");
        const state = url.searchParams.get("state");
        const city = url.searchParams.get("city");
        const listing_type = url.searchParams.get("listing_type");

        let query = supabase
          .from("private_listings")
          .select("id, property_type, listing_type, city, state, address, asking_price, estimated_cap_rate, noi, size_sf, units, year_built, status, listed_date, description, source_network", { count: "exact" });

        if (property_type) query = query.eq("property_type", property_type);
        if (state) query = query.eq("state", state);
        if (city) query = query.eq("city", city);
        if (listing_type) query = query.eq("listing_type", listing_type);

        const result = await query.order("listed_date", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "signals": {
        const category = url.searchParams.get("category");
        const sentiment = url.searchParams.get("sentiment");

        let query = supabase
          .from("intelligence_signals")
          .select("id, headline, ai_summary, category, sentiment, source, tags, url, created_at", { count: "exact" });

        if (category) query = query.eq("category", category);
        if (sentiment) query = query.eq("sentiment", sentiment);

        const result = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "precedent-transactions": {
        const sector = url.searchParams.get("sector");
        const deal_type = url.searchParams.get("deal_type");

        let query = supabase
          .from("precedent_transactions")
          .select("id, target_company_name, acquirer_company_name, deal_value, ev_revenue, ev_ebitda, sector, deal_type, deal_date, target_revenue, target_ebitda", { count: "exact" });

        if (sector) query = query.eq("sector", sector);
        if (deal_type) query = query.eq("deal_type", deal_type);

        const result = await query.order("deal_date", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      default:
        await logTelemetry(supabase, {
          statusCode: 400,
          latencyMs: Date.now() - requestStart,
          userId: keyRecord.user_id,
          errorMessage: `Unknown action: ${action}`,
          metadata: { action },
        });

        return new Response(JSON.stringify({
          error: `Unknown action: ${action}`,
          available_actions: [
            "companies", "financials", "funding", "investors", "news",
            "market-data", "screening",
            "distressed", "deals", "funds", "global-opportunities",
            "real-estate", "signals", "precedent-transactions"
          ],
        }), { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" } });
    }

    await logTelemetry(supabase, {
      statusCode: 200,
      latencyMs: Date.now() - requestStart,
      userId: keyRecord.user_id,
      metadata: { action, limit, offset, tier, total: count ?? 0, currentHourRequests },
    });

    return new Response(JSON.stringify({
      data,
      meta: { total: count, limit, offset, action, tier, current_hour_requests: currentHourRequests },
    }), {
      status: 200,
      headers: { ...corsHeaders, ...rateLimitHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("API access error:", error);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await logTelemetry(supabase, {
        statusCode: 500,
        latencyMs: Date.now() - requestStart,
        userId: telemetryUserId,
        errorMessage: (error as Error).message ?? "Internal server error",
        metadata: { endpoint: "api-access" },
      });
    } catch (telemetryError) {
      console.error("Failed to log telemetry", telemetryError);
    }

    return new Response(JSON.stringify({ error: (error as Error).message ?? "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
