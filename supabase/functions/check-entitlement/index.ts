import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { feature_key, track = false } = await req.json();
    if (!feature_key) throw new Error("feature_key required");

    // Server-side entitlement check via DB function
    const { data, error } = await supabaseClient.rpc("check_entitlement", {
      _user_id: user.id,
      _feature_key: feature_key,
    });
    if (error) throw new Error(`Entitlement check failed: ${error.message}`);

    const result = data as { allowed: boolean; reason?: string; plan?: string; daily_remaining?: number; limit?: number; used?: number; upgrade_required?: boolean };

    // Track usage if allowed and tracking requested
    if (result.allowed && track) {
      await supabaseClient.from("usage_tracking").insert({
        user_id: user.id,
        action: feature_key,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.allowed ? 200 : 403,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ allowed: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
