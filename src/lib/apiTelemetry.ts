/**
 * API Telemetry & Rate Limiting utilities for edge functions
 * Import in edge functions for request tracking and rate limiting.
 * 
 * Client-side: lightweight wrapper that adds timing to supabase function calls.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Client-side telemetry wrapper ───
export type TelemetryEntry = {
  functionName: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  errorMessage?: string;
};

// In-memory ring buffer for client-side p95 tracking
const BUFFER_SIZE = 200;
const latencyBuffer: Map<string, number[]> = new Map();

export function recordClientLatency(functionName: string, latencyMs: number, statusCode: number) {
  const buf = latencyBuffer.get(functionName) ?? [];
  buf.push(latencyMs);
  if (buf.length > BUFFER_SIZE) buf.shift();
  latencyBuffer.set(functionName, buf);

  // Fire-and-forget telemetry to DB (non-blocking)
  supabase.from("api_telemetry").insert({
    function_name: functionName,
    method: "POST",
    status_code: statusCode,
    latency_ms: Math.round(latencyMs),
  }).then(() => {});
}

export function getClientP95(functionName: string): number | null {
  const buf = latencyBuffer.get(functionName);
  if (!buf?.length) return null;
  const sorted = [...buf].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)];
}

export function getClientStats(functionName: string) {
  const buf = latencyBuffer.get(functionName);
  if (!buf?.length) return null;
  const sorted = [...buf].sort((a, b) => a - b);
  return {
    count: buf.length,
    avg: Math.round(buf.reduce((a, b) => a + b, 0) / buf.length),
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}

// ─── Timed function invocation ───
export async function invokeWithTelemetry<T = any>(
  functionName: string,
  body: Record<string, any>,
): Promise<{ data: T | null; error: any; latencyMs: number }> {
  const start = performance.now();
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });
  const latencyMs = performance.now() - start;
  const statusCode = error ? 500 : 200;
  
  recordClientLatency(functionName, latencyMs, statusCode);
  
  return { data: data as T, error, latencyMs };
}

// ─── SLO Definitions ───
export const SLO_TARGETS = {
  "compute-scores": { p95_ms: 2000, error_budget_pct: 1.0 },
  "ai-research": { p95_ms: 10000, error_budget_pct: 5.0 },
  "generate-memo": { p95_ms: 15000, error_budget_pct: 5.0 },
  "enrich-company": { p95_ms: 8000, error_budget_pct: 3.0 },
  "fetch-market-data": { p95_ms: 5000, error_budget_pct: 2.0 },
  "hybrid_search": { p95_ms: 500, error_budget_pct: 0.5 },
} as const;

export type SLOTarget = typeof SLO_TARGETS;
