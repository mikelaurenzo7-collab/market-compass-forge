import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { action, company_id, folder_id } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get integration config
    const { data: setting } = await adminClient
      .from("integration_settings")
      .select("config")
      .eq("user_id", user.id)
      .eq("integration_type", "google_drive")
      .maybeSingle();

    const config = (setting?.config ?? {}) as Record<string, string>;
    const accessToken = config.access_token;

    if (!accessToken) {
      return new Response(
        JSON.stringify({
          files: [],
          files_synced: 0,
          note: "Drive not fully connected — OAuth credentials pending",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list") {
      const query = folder_id ? `'${folder_id}' in parents` : "trashed = false";
      const resp = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Drive API error: ${err}`);
      }

      const data = await resp.json();
      return new Response(JSON.stringify({ files: data.files ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync") {
      if (!company_id) {
        return new Response(JSON.stringify({ error: "company_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const query = folder_id ? `'${folder_id}' in parents` : "trashed = false";
      const resp = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,webViewLink)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!resp.ok) throw new Error("Failed to list Drive files");
      const driveData = await resp.json();
      const files = driveData.files ?? [];

      let synced = 0;
      for (const file of files) {
        const { error: insertError } = await adminClient.from("company_documents").upsert(
          {
            company_id,
            file_name: file.name,
            file_url: file.webViewLink || `https://drive.google.com/file/d/${file.id}`,
            document_type: "other",
            uploaded_by: user.id,
          },
          { onConflict: "company_id,file_name" }
        );
        if (!insertError) synced++;
      }

      // Update sync stats
      await adminClient.from("integration_settings").update({
        config: {
          ...config,
          last_sync_at: new Date().toISOString(),
          items_synced: synced,
        },
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id).eq("integration_type", "google_drive");

      return new Response(JSON.stringify({ files_synced: synced }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Google Drive sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
