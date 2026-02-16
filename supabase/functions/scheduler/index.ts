import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SCHEDULER] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

/** Parse a cron expression and check if "now" matches */
function cronMatches(cron: string, now: Date): boolean {
  const parts = cron.split(/\s+/);
  if (parts.length !== 5) return false;
  const [minExpr, hourExpr, _dom, _month, _dow] = parts;

  const minute = now.getUTCMinutes();
  const hour = now.getUTCHours();

  if (!fieldMatches(minExpr, minute)) return false;
  if (!fieldMatches(hourExpr, hour)) return false;
  return true;
}

function fieldMatches(expr: string, value: number): boolean {
  if (expr === "*") return true;
  // */N
  if (expr.startsWith("*/")) {
    const interval = parseInt(expr.slice(2), 10);
    return value % interval === 0;
  }
  // exact number
  return parseInt(expr, 10) === value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const baseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    logStep("Scheduler tick started");

    const now = new Date();
    // Truncate to minute for idempotency
    const minuteKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;

    // Fetch enabled jobs
    const { data: jobs, error: jobsError } = await supabase
      .from("scheduler_jobs")
      .select("*")
      .eq("enabled", true);

    if (jobsError) throw jobsError;
    if (!jobs || jobs.length === 0) {
      logStep("No enabled jobs");
      return new Response(JSON.stringify({ message: "No jobs to run" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ job: string; status: string; duration_ms?: number }> = [];

    for (const job of jobs) {
      // Check if cron matches current minute
      if (!cronMatches(job.cron_expression, now)) continue;

      const idempotencyKey = `${job.name}:${minuteKey}`;

      // Check idempotency — skip if already ran this minute
      const { data: existing } = await supabase
        .from("scheduler_runs")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing) {
        logStep("Skipping (already ran)", { job: job.name, key: idempotencyKey });
        continue;
      }

      // Insert run record (lock)
      const { data: run, error: insertErr } = await supabase
        .from("scheduler_runs")
        .insert({
          job_id: job.id,
          job_name: job.name,
          function_name: job.function_name,
          status: "running",
          idempotency_key: idempotencyKey,
        })
        .select()
        .single();

      if (insertErr) {
        // Unique constraint violation = already running
        if (insertErr.code === "23505") {
          logStep("Skipping (concurrent lock)", { job: job.name });
          continue;
        }
        logStep("Failed to create run record", { job: job.name, error: insertErr.message });
        continue;
      }

      logStep("Executing job", { job: job.name, function: job.function_name });
      const startMs = Date.now();

      try {
        const resp = await fetch(`${baseUrl}/functions/v1/${job.function_name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ triggered_by: "scheduler", job_name: job.name }),
        });

        const durationMs = Date.now() - startMs;
        const respBody = await resp.text();
        const status = resp.ok ? "success" : "failed";

        // Update run record
        await supabase.from("scheduler_runs").update({
          status,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          response_status: resp.status,
          response_body: respBody.substring(0, 2000),
          error_message: resp.ok ? null : respBody.substring(0, 500),
        }).eq("id", run.id);

        // Update job metadata
        await supabase.from("scheduler_jobs").update({
          last_run_at: new Date().toISOString(),
          last_status: status,
          last_error: resp.ok ? null : respBody.substring(0, 500),
          last_duration_ms: durationMs,
          retry_count: resp.ok ? 0 : (job.retry_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);

        results.push({ job: job.name, status, duration_ms: durationMs });
        logStep("Job completed", { job: job.name, status, durationMs, httpStatus: resp.status });
      } catch (execErr) {
        const durationMs = Date.now() - startMs;
        const errMsg = execErr instanceof Error ? execErr.message : String(execErr);

        await supabase.from("scheduler_runs").update({
          status: "error",
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          error_message: errMsg,
        }).eq("id", run.id);

        await supabase.from("scheduler_jobs").update({
          last_run_at: new Date().toISOString(),
          last_status: "error",
          last_error: errMsg,
          last_duration_ms: durationMs,
          retry_count: (job.retry_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);

        results.push({ job: job.name, status: "error", duration_ms: durationMs });
        logStep("Job error", { job: job.name, error: errMsg });
      }
    }

    logStep("Scheduler tick complete", { executed: results.length });

    return new Response(JSON.stringify({ executed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("FATAL ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
