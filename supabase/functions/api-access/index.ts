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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer lpi_")) {
      return new Response(JSON.stringify({ error: "Invalid API key format. Keys start with lpi_" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = authHeader.replace("Bearer ", "");
    const keyHash = await hashKey(apiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify API key via secure secrets table
    const { data: secretRecord, error: secretError } = await supabase
      .from("api_key_secrets")
      .select("api_key_id")
      .eq("key_hash", keyHash)
      .single();

    if (secretError || !secretRecord) {
      return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "API key has expired" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update last_used_at
    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id);

    // Parse request
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "companies";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 500);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    const sector = url.searchParams.get("sector");
    const stage = url.searchParams.get("stage");
    const search = url.searchParams.get("search");

    let data: any = null;
    let count: number | null = null;

    switch (action) {
      case "companies": {
        let query = supabase
          .from("companies")
          .select("id, name, sector, stage, hq_country, hq_city, employee_count, founded_year, domain, description", { count: "exact" });
        
        if (sector) query = query.eq("sector", sector);
        if (stage) query = query.eq("stage", stage);
        if (search) query = query.ilike("name", `%${search}%`);
        
        const result = await query.order("name").range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "financials": {
        const companyId = url.searchParams.get("company_id");
        let query = supabase
          .from("financials")
          .select("company_id, period, revenue, arr, gross_margin, ebitda, burn_rate, runway_months, confidence_score, source", { count: "exact" });
        
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
          .select("company_id, round_type, amount, valuation_post, valuation_pre, date, lead_investors, confidence_score", { count: "exact" });
        
        if (companyId) query = query.eq("company_id", companyId);
        
        const result = await query.order("date", { ascending: false }).range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      case "investors": {
        const result = await supabase
          .from("investors")
          .select("id, name, type, hq_country, aum, website", { count: "exact" })
          .order("name")
          .range(offset, offset + limit - 1);
        if (result.error) throw result.error;
        data = result.data;
        count = result.count;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}. Use: companies, financials, funding, investors` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ data, meta: { total: count, limit, offset } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("API access error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
