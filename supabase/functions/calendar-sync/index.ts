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

    const { action, provider, event, deal_id } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get calendar integration config
    const calTypes = ["google_calendar", "outlook_calendar"];
    const { data: settings } = await adminClient
      .from("integration_settings")
      .select("*")
      .eq("user_id", user.id)
      .in("integration_type", calTypes);

    const setting = settings?.find((s: Record<string, unknown>) => s.enabled);
    const config = (setting?.config ?? {}) as Record<string, string>;
    const accessToken = config.access_token;
    const calProvider = config.provider || provider;

    if (!accessToken) {
      return new Response(
        JSON.stringify({
          events: [],
          note: "Calendar not fully connected — OAuth credentials pending",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "push" && event) {
      if (calProvider === "google") {
        const calendarId = config.calendar_id || "primary";
        const resp = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              summary: event.title,
              description: event.description || `Grapevine Deal Room: ${deal_id || ""}`,
              start: { dateTime: event.date, timeZone: "UTC" },
              end: {
                dateTime: new Date(new Date(event.date).getTime() + 3600000).toISOString(),
                timeZone: "UTC",
              },
            }),
          }
        );

        if (!resp.ok) throw new Error(`Google Calendar API error: ${await resp.text()}`);
        const created = await resp.json();
        return new Response(JSON.stringify({ success: true, event_id: created.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (calProvider === "microsoft") {
        const resp = await fetch("https://graph.microsoft.com/v1.0/me/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: event.title,
            body: { contentType: "Text", content: event.description || `Grapevine Deal: ${deal_id || ""}` },
            start: { dateTime: event.date, timeZone: "UTC" },
            end: {
              dateTime: new Date(new Date(event.date).getTime() + 3600000).toISOString(),
              timeZone: "UTC",
            },
          }),
        });

        if (!resp.ok) throw new Error(`Microsoft Calendar API error: ${await resp.text()}`);
        const created = await resp.json();
        return new Response(JSON.stringify({ success: true, event_id: created.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "pull") {
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 30 * 86400000).toISOString();

      if (calProvider === "google") {
        const calendarId = config.calendar_id || "primary";
        const resp = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
            `timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(future)}&singleEvents=true&orderBy=startTime&maxResults=20`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!resp.ok) throw new Error("Google Calendar list error");
        const data = await resp.json();
        return new Response(JSON.stringify({ events: data.items ?? [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (calProvider === "microsoft") {
        const resp = await fetch(
          `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${encodeURIComponent(now)}&endDateTime=${encodeURIComponent(future)}&$top=20&$orderby=start/dateTime`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!resp.ok) throw new Error("Microsoft Calendar list error");
        const data = await resp.json();
        return new Response(JSON.stringify({ events: data.value ?? [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action or provider" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Calendar sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
