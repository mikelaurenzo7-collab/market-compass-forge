import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Fetches real macro-economic data from the FRED API.
 * Requires a valid FRED_API_KEY (free at https://fred.stlouisfed.org/docs/api/api_key.html).
 * Falls back to Lovable AI with web grounding for real-time macro data.
 */

const FRED_SERIES = [
  { series_id: "DGS10", label: "10Y Treasury", unit: "%" },
  { series_id: "DGS2", label: "2Y Treasury", unit: "%" },
  { series_id: "FEDFUNDS", label: "Fed Funds Rate", unit: "%" },
  { series_id: "UNRATE", label: "Unemployment Rate", unit: "%" },
  { series_id: "CPIAUCSL", label: "CPI (YoY)", unit: "index" },
  { series_id: "MORTGAGE30US", label: "30Y Mortgage Rate", unit: "%" },
  { series_id: "BAMLH0A0HYM2", label: "HY OAS Spread", unit: "%" },
  { series_id: "T10Y2Y", label: "10Y-2Y Spread", unit: "%" },
  { series_id: "VIXCLS", label: "VIX", unit: "index" },
  { series_id: "INDPRO", label: "Industrial Production", unit: "index" },
  { series_id: "PERMIT", label: "Housing Permits (SAAR)", unit: "thousands" },
  { series_id: "DTWEXBGS", label: "USD Index (DXY)", unit: "index" },
];

async function fetchFREDSeries(seriesId: string, apiKey: string): Promise<{ date: string; value: number } | null> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const obs = data.observations?.[0];
    if (!obs || obs.value === ".") return null;
    return { date: obs.date, value: parseFloat(obs.value) };
  } catch {
    return null;
  }
}

async function fetchViaAI(lovableKey: string): Promise<Array<{ series_id: string; label: string; value: number; unit: string; date: string }>> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a financial data provider. Return the LATEST REAL values for key US macro indicators as of today. 
Use your knowledge of the most recent available data. Be accurate — these values will be displayed to professional investors.
You MUST call the save_indicators function.`,
        },
        {
          role: "user",
          content: `Provide the latest real values for these US macro indicators:
1. 10-Year Treasury Yield (DGS10)
2. 2-Year Treasury Yield (DGS2)  
3. Federal Funds Rate (FEDFUNDS)
4. Unemployment Rate (UNRATE)
5. CPI Year-over-Year (CPIAUCSL) - the actual YoY percentage change
6. 30-Year Mortgage Rate (MORTGAGE30US)
7. High Yield OAS Spread in percentage points (BAMLH0A0HYM2)
8. 10Y-2Y Treasury Spread in percentage points (T10Y2Y)
9. VIX Index (VIXCLS)
10. Industrial Production Index (INDPRO)
11. Housing Permits SAAR in thousands (PERMIT)
12. US Dollar Index DXY (DTWEXBGS)

Return the most recent real values you know. Include the observation date.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_indicators",
            parameters: {
              type: "object",
              properties: {
                indicators: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      series_id: { type: "string", description: "FRED series ID" },
                      label: { type: "string" },
                      value: { type: "number" },
                      unit: { type: "string" },
                      date: { type: "string", description: "YYYY-MM-DD format" },
                    },
                    required: ["series_id", "label", "value", "unit", "date"],
                  },
                },
              },
              required: ["indicators"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_indicators" } },
    }),
  });

  if (!resp.ok) {
    console.error("AI macro fetch failed:", resp.status, await resp.text());
    return [];
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return [];

  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.indicators || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let updated = 0;
    const errors: string[] = [];

    // Try FRED API first
    const FRED_API_KEY = Deno.env.get("FRED_API_KEY");
    let fredWorked = false;

    if (FRED_API_KEY && FRED_API_KEY.length === 32) {
      console.log("Attempting FRED API with valid key...");
      const results = await Promise.allSettled(
        FRED_SERIES.map(async (s) => ({
          ...s,
          result: await fetchFREDSeries(s.series_id, FRED_API_KEY),
        }))
      );

      for (const r of results) {
        if (r.status !== "fulfilled" || !r.value.result) continue;
        const { series_id, label, unit, result } = r.value;

        const { error } = await supabase
          .from("macro_indicators")
          .update({ value: result.value, fetched_at: new Date().toISOString() })
          .eq("series_id", series_id)
          .order("observation_date", { ascending: false })
          .limit(1);

        if (!error) {
          updated++;
          fredWorked = true;
        }
      }
    }

    // Fallback to AI-powered data if FRED didn't work
    if (!fredWorked) {
      console.log("FRED unavailable, using AI-powered macro data...");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "No data source available (FRED_API_KEY invalid, LOVABLE_API_KEY missing)" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const indicators = await fetchViaAI(LOVABLE_API_KEY);
      console.log(`AI returned ${indicators.length} indicators`);

      for (const ind of indicators) {
        // Update existing row for this series (most recent observation)
        const { data: existing } = await supabase
          .from("macro_indicators")
          .select("id")
          .eq("series_id", ind.series_id)
          .order("observation_date", { ascending: false })
          .limit(1);

        if (existing && existing.length > 0) {
          const { error } = await supabase
            .from("macro_indicators")
            .update({
              value: ind.value,
              observation_date: ind.date,
              fetched_at: new Date().toISOString(),
            })
            .eq("id", existing[0].id);

          if (error) {
            errors.push(`${ind.series_id}: ${error.message}`);
          } else {
            updated++;
          }
        } else {
          // Insert new
          const { error } = await supabase
            .from("macro_indicators")
            .insert({
              series_id: ind.series_id,
              label: ind.label,
              unit: ind.unit,
              value: ind.value,
              observation_date: ind.date,
              fetched_at: new Date().toISOString(),
            });

          if (error) {
            errors.push(`${ind.series_id}: ${error.message}`);
          } else {
            updated++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        updated,
        source: fredWorked ? "FRED" : "AI",
        errors: errors.slice(0, 10),
        message: `Updated ${updated} macro indicators from ${fredWorked ? "FRED API" : "AI (Gemini)"}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-fred-data error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
