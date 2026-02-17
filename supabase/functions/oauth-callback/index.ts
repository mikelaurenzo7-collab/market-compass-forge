import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN_ENDPOINTS: Record<string, string> = {
  google: "https://oauth2.googleapis.com/token",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  dropbox: "https://api.dropboxapi.com/oauth2/token",
  salesforce: "https://login.salesforce.com/services/oauth2/token",
};

const TYPE_TO_PROVIDER: Record<string, string> = {
  google_drive: "google",
  gmail: "google",
  google_calendar: "google",
  onedrive: "microsoft",
  outlook_email: "microsoft",
  outlook_calendar: "microsoft",
  dropbox: "dropbox",
  crm_salesforce: "salesforce",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, integration_type, redirect_uri } = await req.json();
    const provider = TYPE_TO_PROVIDER[integration_type];

    if (!provider || !code) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prefix = provider.toUpperCase();
    const clientId = Deno.env.get(`${prefix}_CLIENT_ID`);
    const clientSecret = Deno.env.get(`${prefix}_CLIENT_SECRET`);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (!clientId || !clientSecret) {
      // No real credentials — store placeholder connected state
      await adminClient.from("integration_settings").upsert(
        {
          user_id: user.id,
          integration_type,
          config: {
            connected_at: new Date().toISOString(),
            provider,
            status: "pending_credentials",
          },
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,integration_type" }
      );

      return new Response(
        JSON.stringify({ success: true, note: "Connected (credentials pending)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange code for tokens
    const tokenEndpoint = TOKEN_ENDPOINTS[provider];
    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    await adminClient.from("integration_settings").upsert(
      {
        user_id: user.id,
        integration_type,
        config: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type,
          expires_at: expiresAt,
          provider,
          connected_at: new Date().toISOString(),
        },
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,integration_type" }
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("OAuth callback error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
