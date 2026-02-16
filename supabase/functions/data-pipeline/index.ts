import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEC_USER_AGENT = "Grapevine contact@grapevine.io";
const SEC_BASE = "https://data.sec.gov";

// ── Helpers ──

function padCIK(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ── Pipeline Stage Runner ──

interface StageResult {
  records: any[];
  dropped: number;
  dropReasons: string[];
}

async function logStage(
  supabase: any, runId: string, stage: string, status: string,
  startedAt: string, recordsIn: number, recordsOut: number,
  recordsDropped: number, dropReasons: string[], error?: string, metadata?: any
) {
  await supabase.from("ingestion_stage_logs").insert({
    run_id: runId, stage, status,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    records_in: recordsIn,
    records_out: recordsOut,
    records_dropped: recordsDropped,
    drop_reasons: dropReasons.map(r => ({ reason: r })),
    error_message: error ?? null,
    stage_metadata: metadata ?? {},
  });
}

async function addToDLQ(
  supabase: any, runId: string, pipeline: string, stage: string,
  sourceId: string, payload: any, error: string, errorType: string
) {
  await supabase.from("dead_letter_queue").insert({
    run_id: runId, pipeline, stage,
    source_identifier: sourceId,
    raw_payload: payload,
    error_message: error,
    error_type: errorType,
    next_retry_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
}

// ── SEC EDGAR Pipeline ──

async function secEdgarIngest(supabase: any, runId: string, options: any): Promise<StageResult> {
  const stageStart = new Date().toISOString();
  const limit = options.limit ?? 20;
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, cik_number")
    .eq("market_type", "public")
    .not("cik_number", "is", null)
    .or(`last_sec_fetch.is.null,last_sec_fetch.lt.${cutoff}`)
    .order("name")
    .limit(limit);

  if (error) throw new Error(`Fetch companies: ${error.message}`);
  const records: any[] = [];
  const dropped: string[] = [];

  for (const company of companies ?? []) {
    try {
      const paddedCIK = padCIK(company.cik_number);
      const res = await fetch(`${SEC_BASE}/api/xbrl/companyfacts/CIK${paddedCIK}.json`, {
        headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
      });

      if (!res.ok) {
        if (res.status === 404) { dropped.push(`${company.name}: CIK not found`); continue; }
        throw new Error(`SEC API ${res.status}`);
      }

      const rawData = await res.json();
      const rawStr = JSON.stringify(rawData);
      const checksum = await sha256(rawStr);

      // Persist raw snapshot
      await supabase.from("raw_source_snapshots").insert({
        run_id: runId, pipeline: "sec_edgar",
        source_identifier: paddedCIK,
        raw_payload: rawData,
        source_url: `${SEC_BASE}/api/xbrl/companyfacts/CIK${paddedCIK}.json`,
        checksum,
      });

      records.push({ company, rawData, paddedCIK, checksum });

      // Respect SEC rate limit
      await new Promise(r => setTimeout(r, 200));
    } catch (err: any) {
      dropped.push(`${company.name}: ${err.message}`);
      await addToDLQ(supabase, runId, "sec_edgar", "ingest", company.cik_number, { companyId: company.id }, err.message, "network");
    }
  }

  await logStage(supabase, runId, "ingest", "completed", stageStart, companies?.length ?? 0, records.length, dropped.length, dropped);
  return { records, dropped: dropped.length, dropReasons: dropped };
}

function secEdgarNormalize(records: any[]): StageResult {
  const targetConcepts = [
    "Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
    "NetIncomeLoss", "Assets", "EarningsPerShareBasic",
    "OperatingIncomeLoss", "GrossProfit", "StockholdersEquity",
    "LongTermDebt", "CashAndCashEquivalentsAtCarryingValue",
  ];

  const normalized: any[] = [];
  const drops: string[] = [];

  for (const { company, rawData, paddedCIK } of records) {
    const usGaap = rawData?.facts?.["us-gaap"] ?? {};
    let factCount = 0;

    for (const concept of targetConcepts) {
      const conceptData = usGaap[concept];
      if (!conceptData) continue;
      const units = conceptData.units?.USD ?? conceptData.units?.[Object.keys(conceptData.units)[0]];
      if (!units?.length) continue;

      const annualFacts = units.filter((u: any) => u.form === "10-K" && u.end).sort((a: any, b: any) => b.end.localeCompare(a.end)).slice(0, 10);
      const quarterlyFacts = units.filter((u: any) => u.form === "10-Q" && u.end).sort((a: any, b: any) => b.end.localeCompare(a.end)).slice(0, 8);

      for (const fact of [...annualFacts, ...quarterlyFacts]) {
        normalized.push({
          company_id: company.id,
          cik_number: paddedCIK,
          taxonomy: "us-gaap",
          concept,
          period_start: fact.start || null,
          period_end: fact.end,
          value: fact.val,
          unit: "USD",
          form_type: fact.form,
          filed_date: fact.filed || null,
          _source: "sec_edgar",
        });
        factCount++;
      }
    }

    if (factCount === 0) drops.push(`${company.name}: no target concepts found`);
  }

  return { records: normalized, dropped: drops.length, dropReasons: drops };
}

function dedupe(records: any[]): StageResult {
  const seen = new Map<string, any>();
  const drops: string[] = [];

  for (const r of records) {
    const key = `${r.cik_number}|${r.concept}|${r.period_end}|${r.unit}|${r.form_type}`;
    if (seen.has(key)) {
      drops.push(`Duplicate: ${key}`);
    }
    seen.set(key, r); // last wins
  }

  return { records: Array.from(seen.values()), dropped: drops.length, dropReasons: drops.length > 10 ? [`${drops.length} duplicates removed`] : drops };
}

function validate(records: any[]): StageResult {
  const valid: any[] = [];
  const drops: string[] = [];

  for (const r of records) {
    const issues: string[] = [];
    if (!r.company_id) issues.push("missing company_id");
    if (!r.cik_number) issues.push("missing cik_number");
    if (!r.period_end) issues.push("missing period_end");
    if (r.value == null || isNaN(Number(r.value))) issues.push("invalid value");
    if (!r.concept) issues.push("missing concept");

    // Schema drift detection: unexpected fields
    const expectedFields = ["company_id", "cik_number", "taxonomy", "concept", "period_start", "period_end", "value", "unit", "form_type", "filed_date", "_source"];
    const extraFields = Object.keys(r).filter(k => !expectedFields.includes(k));
    if (extraFields.length > 0) issues.push(`schema_drift: unexpected fields [${extraFields.join(",")}]`);

    if (issues.length > 0) {
      drops.push(`${r.cik_number}/${r.concept}: ${issues.join(", ")}`);
    } else {
      valid.push(r);
    }
  }

  return { records: valid, dropped: drops.length, dropReasons: drops.length > 10 ? [`${drops.length} validation failures`] : drops };
}

async function publish(supabase: any, runId: string, records: any[], pipeline: string): Promise<StageResult> {
  const drops: string[] = [];
  let published = 0;

  // Remove _source field before upsert
  const cleanRecords = records.map(({ _source, ...rest }) => rest);

  if (pipeline === "sec_edgar") {
    for (let i = 0; i < cleanRecords.length; i += 100) {
      const batch = cleanRecords.slice(i, i + 100);
      const { error } = await supabase.from("sec_financial_facts").upsert(batch, {
        onConflict: "cik_number,concept,period_end,unit,form_type",
        ignoreDuplicates: false,
      });
      if (error) {
        drops.push(`Batch ${i}: ${error.message}`);
        for (const rec of batch) {
          await addToDLQ(supabase, runId, pipeline, "publish", rec.cik_number, rec, error.message, "transform");
        }
      } else {
        published += batch.length;
      }
    }

    // Update last_sec_fetch for processed companies
    const companyIds = [...new Set(cleanRecords.map(r => r.company_id))];
    for (const cid of companyIds) {
      await supabase.from("companies").update({ last_sec_fetch: new Date().toISOString() }).eq("id", cid);
    }
  }

  return { records: cleanRecords.slice(0, published), dropped: drops.length, dropReasons: drops };
}

// ── Bankruptcy Pipeline (stub — no free public API, uses DLQ for missing data) ──

async function bankruptcyIngest(supabase: any, runId: string, _options: any): Promise<StageResult> {
  const stageStart = new Date().toISOString();
  // Placeholder: In production, this would scrape PACER/court RSS or use a paid API.
  // For now, we log a missing-data alert and return empty.
  await logStage(supabase, runId, "ingest", "completed", stageStart, 0, 0, 0,
    ["No bankruptcy feed configured — requires PACER API or court RSS integration"],
    undefined, { note: "Stub pipeline — awaiting data source integration" });
  return { records: [], dropped: 0, dropReasons: [] };
}

// ── CRE Records Pipeline (stub) ──

async function creRecordsIngest(supabase: any, runId: string, _options: any): Promise<StageResult> {
  const stageStart = new Date().toISOString();
  await logStage(supabase, runId, "ingest", "completed", stageStart, 0, 0, 0,
    ["No CRE records feed configured — requires CoStar/REIS API or manual CSV upload"],
    undefined, { note: "Stub pipeline — awaiting data source integration" });
  return { records: [], dropped: 0, dropReasons: [] };
}

// ── Main Pipeline Orchestrator ──

async function runPipeline(supabase: any, pipeline: string, options: any = {}) {
  // Create run record
  const { data: run, error: runErr } = await supabase.from("ingestion_runs").insert({
    pipeline,
    status: "running",
    triggered_by: options.triggeredBy ?? "manual",
    run_metadata: options,
  }).select().single();

  if (runErr) throw new Error(`Create run: ${runErr.message}`);
  const runId = run.id;

  try {
    // Stage 1: Ingest
    let ingestResult: StageResult;
    if (pipeline === "sec_edgar") {
      ingestResult = await secEdgarIngest(supabase, runId, options);
    } else if (pipeline === "bankruptcy") {
      ingestResult = await bankruptcyIngest(supabase, runId, options);
    } else if (pipeline === "cre_records") {
      ingestResult = await creRecordsIngest(supabase, runId, options);
    } else {
      throw new Error(`Unknown pipeline: ${pipeline}`);
    }

    await supabase.from("ingestion_runs").update({ records_ingested: ingestResult.records.length }).eq("id", runId);

    if (ingestResult.records.length === 0) {
      await supabase.from("ingestion_runs").update({
        status: "completed", completed_at: new Date().toISOString(),
        records_ingested: 0,
      }).eq("id", runId);

      // Update schedule
      await supabase.from("pipeline_schedules").update({ last_run_at: new Date().toISOString() }).eq("pipeline", pipeline);
      return { runId, status: "completed", message: `No new data to ingest for ${pipeline}` };
    }

    // Stage 2: Normalize
    const normStart = new Date().toISOString();
    const normResult = secEdgarNormalize(ingestResult.records);
    await logStage(supabase, runId, "normalize", "completed", normStart, ingestResult.records.length, normResult.records.length, normResult.dropped, normResult.dropReasons);
    await supabase.from("ingestion_runs").update({ records_normalized: normResult.records.length }).eq("id", runId);

    // Stage 3: Dedupe
    const dedupStart = new Date().toISOString();
    const dedupResult = dedupe(normResult.records);
    await logStage(supabase, runId, "dedupe", "completed", dedupStart, normResult.records.length, dedupResult.records.length, dedupResult.dropped, dedupResult.dropReasons);
    await supabase.from("ingestion_runs").update({ records_deduped: dedupResult.records.length }).eq("id", runId);

    // Stage 4: Validate
    const valStart = new Date().toISOString();
    const valResult = validate(dedupResult.records);
    await logStage(supabase, runId, "validate", "completed", valStart, dedupResult.records.length, valResult.records.length, valResult.dropped, valResult.dropReasons);
    await supabase.from("ingestion_runs").update({ records_validated: valResult.records.length }).eq("id", runId);

    // Stage 5: Publish
    const pubStart = new Date().toISOString();
    const pubResult = await publish(supabase, runId, valResult.records, pipeline);
    await logStage(supabase, runId, "publish", "completed", pubStart, valResult.records.length, pubResult.records.length, pubResult.dropped, pubResult.dropReasons);

    const finalStatus = pubResult.dropped > 0 ? "partial" : "completed";
    await supabase.from("ingestion_runs").update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
      records_published: pubResult.records.length,
      records_failed: ingestResult.dropped + normResult.dropped + dedupResult.dropped + valResult.dropped + pubResult.dropped,
    }).eq("id", runId);

    // Update schedule
    await supabase.from("pipeline_schedules").update({ last_run_at: new Date().toISOString() }).eq("pipeline", pipeline);

    // Refresh materialized views
    try { await supabase.rpc("refresh_materialized_views"); } catch (_) { /* non-critical */ }

    return {
      runId,
      status: finalStatus,
      ingested: ingestResult.records.length,
      normalized: normResult.records.length,
      deduped: dedupResult.records.length,
      validated: valResult.records.length,
      published: pubResult.records.length,
      failed: ingestResult.dropped + normResult.dropped + valResult.dropped + pubResult.dropped,
    };
  } catch (err: any) {
    await supabase.from("ingestion_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: err.message,
    }).eq("id", runId);

    // Alert on failure
    await supabase.from("activity_events").insert({
      event_type: "system",
      headline: `Pipeline failure: ${pipeline}`,
      detail: `Ingestion run ${runId} failed: ${err.message}`,
      published_at: new Date().toISOString(),
    });

    throw err;
  }
}

// ── Retry DLQ entries ──

async function retryDLQ(supabase: any, pipeline?: string) {
  let query = supabase
    .from("dead_letter_queue")
    .select("*")
    .is("resolved_at", null)
    .lt("retry_count", 3)
    .lte("next_retry_at", new Date().toISOString());

  if (pipeline) query = query.eq("pipeline", pipeline);
  const { data: entries, error } = await query.limit(50);
  if (error) throw error;
  if (!entries?.length) return { retried: 0 };

  let resolved = 0;
  for (const entry of entries) {
    try {
      // Increment retry count and push next retry further out
      await supabase.from("dead_letter_queue").update({
        retry_count: entry.retry_count + 1,
        next_retry_at: new Date(Date.now() + (entry.retry_count + 1) * 15 * 60 * 1000).toISOString(),
      }).eq("id", entry.id);

      // For SEC entries, re-attempt the individual record
      if (entry.pipeline === "sec_edgar" && entry.stage === "ingest") {
        const payload = entry.raw_payload;
        if (payload.companyId) {
          const { data: company } = await supabase.from("companies").select("id, name, cik_number").eq("id", payload.companyId).single();
          if (company?.cik_number) {
            const paddedCIK = padCIK(company.cik_number);
            const res = await fetch(`${SEC_BASE}/api/xbrl/companyfacts/CIK${paddedCIK}.json`, {
              headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
            });
            if (res.ok) {
              await supabase.from("dead_letter_queue").update({
                resolved_at: new Date().toISOString(),
                resolved_by: "auto_retry",
              }).eq("id", entry.id);
              resolved++;
            }
          }
        }
      }
    } catch (_) { /* will retry next cycle */ }
  }

  return { retried: entries.length, resolved };
}

// ── HTTP Handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getSupabase();
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "run";

    if (action === "run") {
      const pipeline = body.pipeline;
      if (!pipeline || !["sec_edgar", "bankruptcy", "cre_records"].includes(pipeline)) {
        return new Response(JSON.stringify({ error: "Invalid pipeline. Use: sec_edgar, bankruptcy, cre_records" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await runPipeline(supabase, pipeline, body.options ?? {});
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "retry_dlq") {
      const result = await retryDLQ(supabase, body.pipeline);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "status") {
      // Return recent runs and schedule status
      const { data: runs } = await supabase
        .from("ingestion_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(body.limit ?? 20);

      const { data: schedules } = await supabase.from("pipeline_schedules").select("*");

      const { data: dlqCount } = await supabase
        .from("dead_letter_queue")
        .select("id", { count: "exact", head: true })
        .is("resolved_at", null);

      return new Response(JSON.stringify({
        runs: runs ?? [],
        schedules: schedules ?? [],
        dlq_pending: dlqCount ?? 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "run_all") {
      const results: any = {};
      for (const p of ["sec_edgar", "bankruptcy", "cre_records"]) {
        try {
          results[p] = await runPipeline(supabase, p, { triggeredBy: "scheduler", ...body.options });
        } catch (err: any) {
          results[p] = { status: "failed", error: err.message };
        }
      }
      return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: run, retry_dlq, status, run_all" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("data-pipeline error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
