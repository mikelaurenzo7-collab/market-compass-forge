import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Fetches real macro-economic data from the FRED (Federal Reserve Economic Data) API.
 * FRED API is completely free and requires no API key for basic access.
 * https://fred.stlouisfed.org/docs/api/fred/
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
  { series_id: "INDPRO", label: "Industrial Production", unit: "index" },
  { series_id: "PERMIT", label: "Housing Permits (SAAR)", unit: "thousands" },
  { series_id: "RSXFS", label: "Retail Sales ex Food", unit: "millions" },
  { series_id: "VIXCLS", label: "VIX", unit: "index" },
  { series_id: "DTWEXBGS", label: "USD Index (DXY)", unit: "index" },
  { series_id: "M2SL", label: "M2 Money Supply", unit: "billions" },
  { series_id: "IORB", label: "Interest on Reserves", unit: "%" },
];

async function fetchFREDSeries(seriesId: string): Promise<{ date: string; value: number } | null> {
  try {
    // FRED provides a free JSON endpoint (no key required for observation data via this approach)
    // We use the FRED API with the free demo key
    const FRED_API_KEY = Deno.env.get("FRED_API_KEY") || "DEMO_KEY";
    
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`FRED ${seriesId} HTTP ${resp.status}`);
      return null;
    }
    
    const data = await resp.json();
    const obs = data.observations?.[0];
    if (!obs || obs.value === ".") return null;
    
    return { date: obs.date, value: parseFloat(obs.value) };
  } catch (e) {
    console.error(`FRED ${seriesId} error:`, e);
    return null;
  }
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

    // Fetch all series in parallel (FRED is generous with rate limits)
    const results = await Promise.allSettled(
      FRED_SERIES.map(async (series) => {
        const result = await fetchFREDSeries(series.series_id);
        return { ...series, result };
      })
    );

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value.result) {
        if (r.status === "fulfilled") {
          errors.push(`${r.value.series_id}: no data`);
        }
        continue;
      }

      const { series_id, label, unit, result } = r.value;

      // Upsert: update if same series_id+observation_date exists, otherwise insert
      const { error: upsertErr } = await supabase
        .from("macro_indicators")
        .upsert(
          {
            series_id,
            label,
            unit,
            value: result.value,
            observation_date: result.date,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "series_id,observation_date" }
        );

      if (upsertErr) {
        // If upsert fails (no unique constraint), try insert
        const { error: insertErr } = await supabase
          .from("macro_indicators")
          .insert({
            series_id,
            label,
            unit,
            value: result.value,
            observation_date: result.date,
            fetched_at: new Date().toISOString(),
          });

        if (insertErr) {
          // Update existing
          const { error: updateErr } = await supabase
            .from("macro_indicators")
            .update({
              value: result.value,
              fetched_at: new Date().toISOString(),
            })
            .eq("series_id", series_id)
            .eq("observation_date", result.date);

          if (updateErr) {
            errors.push(`${series_id}: ${updateErr.message}`);
            continue;
          }
        }
      }

      updated++;
      console.log(`✓ ${series_id} (${label}): ${result.value} as of ${result.date}`);
    }

    return new Response(
      JSON.stringify({
        updated,
        total: FRED_SERIES.length,
        errors: errors.slice(0, 10),
        message: `Updated ${updated}/${FRED_SERIES.length} macro indicators from FRED`,
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
