import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SLACK_API_KEY = Deno.env.get("SLACK_API_KEY");
  if (!SLACK_API_KEY) {
    return new Response(JSON.stringify({ error: "SLACK_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { type, channel, data, user_id } = await req.json();

    // Build Slack message based on notification type
    let blocks: any[] = [];
    let text = "";

    switch (type) {
      case "deal_stage_change": {
        text = `🔄 Deal moved: ${data.company_name} → ${data.new_stage}`;
        blocks = [
          {
            type: "header",
            text: { type: "plain_text", text: "🔄 Deal Stage Change", emoji: true },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Company:*\n${data.company_name}` },
              { type: "mrkdwn", text: `*New Stage:*\n${data.new_stage}` },
            ],
          },
          ...(data.previous_stage ? [{
            type: "context",
            elements: [{ type: "mrkdwn", text: `Previous: ${data.previous_stage} → ${data.new_stage}` }],
          }] : []),
        ];
        break;
      }

      case "alert_triggered": {
        text = `🚨 Alert: ${data.alert_name} — ${data.title}`;
        blocks = [
          {
            type: "header",
            text: { type: "plain_text", text: "🚨 Alert Triggered", emoji: true },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*${data.alert_name}*\n${data.title}` },
          },
          ...(data.detail ? [{
            type: "section",
            text: { type: "mrkdwn", text: data.detail.substring(0, 500) },
          }] : []),
        ];
        break;
      }

      case "intelligence_summary": {
        text = `📊 Intelligence: ${data.headline}`;
        blocks = [
          {
            type: "header",
            text: { type: "plain_text", text: "📊 Intelligence Signal", emoji: true },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*${data.headline}*\n${data.summary || ""}` },
          },
          ...(data.sector ? [{
            type: "context",
            elements: [{ type: "mrkdwn", text: `Sector: ${data.sector} | Confidence: ${data.confidence || "N/A"}` }],
          }] : []),
        ];
        break;
      }

      case "portfolio_update": {
        text = `💼 Portfolio: ${data.company_name} — ${data.update_type}`;
        blocks = [
          {
            type: "header",
            text: { type: "plain_text", text: "💼 Portfolio Update", emoji: true },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Company:*\n${data.company_name}` },
              { type: "mrkdwn", text: `*Update:*\n${data.update_type}` },
            ],
          },
          ...(data.details ? [{
            type: "section",
            text: { type: "mrkdwn", text: data.details },
          }] : []),
        ];
        break;
      }

      case "deal_added": {
        text = `➕ New deal: ${data.company_name} added to pipeline`;
        blocks = [
          {
            type: "header",
            text: { type: "plain_text", text: "➕ New Deal Added", emoji: true },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Company:*\n${data.company_name}` },
              { type: "mrkdwn", text: `*Stage:*\n${data.stage || "Sourced"}` },
            ],
          },
          ...(data.sector ? [{
            type: "context",
            elements: [{ type: "mrkdwn", text: `Sector: ${data.sector}` }],
          }] : []),
        ];
        break;
      }

      case "watchlist_update": {
        text = `👀 Watchlist: ${data.company_name} — ${data.event}`;
        blocks = [
          {
            type: "header",
            text: { type: "plain_text", text: "👀 Watchlist Activity", emoji: true },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*${data.company_name}*\n${data.event}` },
          },
        ];
        break;
      }

      default:
        text = data.message || "Notification from Grapevine";
        blocks = [{
          type: "section",
          text: { type: "mrkdwn", text: text },
        }];
    }

    // Add Grapevine footer to all messages
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: "Sent from *Grapevine* Intelligence Platform" }],
    });

    // Send to Slack via connector gateway
    const slackResponse = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": SLACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        text,
        blocks,
        username: "Grapevine",
        icon_emoji: ":grapes:",
      }),
    });

    const slackData = await slackResponse.json();
    if (!slackResponse.ok || !slackData.ok) {
      throw new Error(`Slack API error: ${JSON.stringify(slackData)}`);
    }

    // Log the notification
    if (user_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("slack_notifications").insert({
        user_id,
        channel,
        message_type: type,
        payload: data,
        slack_ts: slackData.ts,
        status: "sent",
      });
    }

    return new Response(JSON.stringify({ success: true, ts: slackData.ts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Slack notify error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
