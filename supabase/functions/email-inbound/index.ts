import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple company name extraction heuristics
function extractCompanyName(subject: string, body: string): string | null {
  // Pattern: "Intro: [Company]" or "Introduction to [Company]"
  const introPatterns = [
    /(?:intro|introduction)\s*(?:to|:)\s*(.+?)(?:\s*[-–—|]|\s*$)/i,
    /(?:re|fwd?):\s*(?:intro|introduction)\s*(?:to|:)\s*(.+?)(?:\s*[-–—|]|\s*$)/i,
    /(?:meeting|call)\s+(?:with|re:?)\s+(.+?)(?:\s*[-–—|]|\s*$)/i,
  ];

  for (const pattern of introPatterns) {
    const match = subject.match(pattern);
    if (match) return match[1].trim();
  }

  // Try body: look for "company:" or "regarding:" patterns
  const bodyPatterns = [
    /(?:company|regarding|about|re)\s*:\s*(.+?)(?:\n|$)/i,
  ];
  const bodySnippet = body.substring(0, 1000);
  for (const pattern of bodyPatterns) {
    const match = bodySnippet.match(pattern);
    if (match) return match[1].trim();
  }

  return null;
}

// Extract email addresses and names from body
function extractContacts(body: string): { name?: string; email: string }[] {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const contacts: { name?: string; email: string }[] = [];
  const seen = new Set<string>();
  let match;

  while ((match = emailRegex.exec(body)) !== null) {
    const email = match[1].toLowerCase();
    if (!seen.has(email) && !email.includes("noreply") && !email.includes("no-reply")) {
      seen.add(email);
      // Try to find name before email: "John Smith <john@example.com>" or "John Smith john@example.com"
      const beforeEmail = body.substring(Math.max(0, match.index - 60), match.index);
      const nameMatch = beforeEmail.match(/([A-Z][a-z]+ [A-Z][a-z]+)\s*<?$/);
      contacts.push({ name: nameMatch ? nameMatch[1] : undefined, email });
    }
  }

  return contacts.slice(0, 10); // cap at 10
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify webhook secret to prevent unauthorized access
  const webhookSecret = Deno.env.get("EMAIL_WEBHOOK_SECRET");
  if (webhookSecret) {
    const providedSecret = req.headers.get("x-webhook-secret");
    if (providedSecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { from_email, subject, body_text, user_id } = await req.json();

    if (!from_email || !user_id) {
      return new Response(JSON.stringify({ error: "from_email and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyName = extractCompanyName(subject || "", body_text || "");
    const contacts = extractContacts(body_text || "");
    let actionTaken = "ignored";
    let entityId: string | null = null;

    if (companyName) {
      // Check if company exists
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", companyName)
        .maybeSingle();

      if (existing) {
        entityId = existing.id;
        actionTaken = "company_found";
      } else {
        // Create new company
        const { data: newCompany, error } = await supabase
          .from("companies")
          .insert({
            name: companyName,
            sector: "Unknown",
            description: `Auto-created from email: "${subject}"`,
            market_type: "private",
            source_type: "email_inbound",
            is_synthetic: false,
          })
          .select("id")
          .single();

        if (!error && newCompany) {
          entityId = newCompany.id;
          actionTaken = "company_created";

          // Auto-create pipeline deal
          const { data: deal } = await supabase
            .from("deal_pipeline")
            .insert({
              company_id: newCompany.id,
              user_id,
              stage: "sourced",
              priority: "medium",
              notes: `Auto-sourced from email\nSubject: ${subject}\nFrom: ${from_email}\n\nContacts:\n${contacts.map(c => `- ${c.name || ""} ${c.email}`).join("\n")}`,
            })
            .select("id")
            .single();

          if (deal) {
            actionTaken = "deal_created";
            entityId = deal.id;

            // Log decision
            await supabase.from("decision_log").insert({
              deal_id: deal.id,
              user_id,
              decision_type: "stage_change",
              to_state: "sourced",
              rationale: `Auto-sourced from email: "${subject}" from ${from_email}`,
            });
          }
        }
      }
    }

    // Log the inbound email
    await supabase.from("email_inbound_log").insert({
      user_id,
      from_email,
      subject,
      parsed_company: companyName,
      parsed_contacts: contacts,
      action_taken: actionTaken,
      entity_id: entityId,
      raw_snippet: (body_text || "").substring(0, 500),
    });

    return new Response(JSON.stringify({
      success: true,
      action: actionTaken,
      company: companyName,
      contacts_found: contacts.length,
      entity_id: entityId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Email inbound error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
