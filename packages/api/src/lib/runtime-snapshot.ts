import type { BotStatus } from '@beastbots/shared';
import { getRuntime } from '@beastbots/workers';

export interface RuntimeMetricsSnapshot {
  totalTicks: number;
  successfulActions: number;
  failedActions: number;
  deniedActions: number;
  totalPnlUsd: number;
  uptimeMs: number;
  lastErrorMessage?: string;
  lastErrorAt?: number;
}

interface RuntimeStateSnapshot {
  status: BotStatus;
  lastTickAt: number;
}

export function getWorkersBaseUrl(): string | null {
  const value = process.env.WORKERS_BASE_URL?.trim();
  return value ? value.replace(/\/+$/, '') : null;
}

export function isWorkerControlPlaneEnabled(): boolean {
  if (process.env.NODE_ENV === 'test' && process.env.ALLOW_WORKER_CONTROL_PLANE_IN_TEST !== 'true') {
    return false;
  }
  return Boolean(getWorkersBaseUrl() && process.env.WORKER_AUTH_TOKEN);
}

export function getRuntimeAuthorityMode(): 'worker-control-plane' | 'local-runtime' {
  return isWorkerControlPlaneEnabled() ? 'worker-control-plane' : 'local-runtime';
}

function buildWorkerUrl(tenantId: string, botId: string, action: string, query?: Record<string, string | number | undefined>): string {
  const baseUrl = getWorkersBaseUrl();
  if (!baseUrl) throw new Error('WORKERS_BASE_URL is not configured');

  const url = new URL(`${baseUrl}/bot/${tenantId}/${botId}/${action}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function callWorkerControlPlane<T>(
  tenantId: string,
  botId: string,
  action: string,
  init?: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> },
): Promise<T> {
  const authToken = process.env.WORKER_AUTH_TOKEN;
  if (!authToken) throw new Error('WORKER_AUTH_TOKEN is not configured');

  const response = await fetch(buildWorkerUrl(tenantId, botId, action, init?.query), {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof json?.message === 'string'
      ? json.message
      : typeof json?.error === 'string'
        ? json.error
        : `Worker control plane request failed: ${response.status}`;
    throw new Error(message);
  }

  return json as T;
}

export async function getRuntimeMetricsSnapshot(tenantId: string, botId: string): Promise<{
  authority: 'worker-control-plane' | 'local-runtime';
  metrics: RuntimeMetricsSnapshot | null;
  status: BotStatus | null;
  heartbeat: number | null;
}> {
  if (isWorkerControlPlaneEnabled()) {
    const [metrics, state] = await Promise.all([
      callWorkerControlPlane<RuntimeMetricsSnapshot | { error: string }>(tenantId, botId, 'metrics').catch(() => null),
      callWorkerControlPlane<RuntimeStateSnapshot | { error: string }>(tenantId, botId, 'state').catch(() => null),
    ]);

    return {
      authority: 'worker-control-plane',
      metrics: metrics && !('error' in metrics) ? metrics : null,
      status: state && !('error' in state) ? state.status : null,
      heartbeat: state && !('error' in state) ? state.lastTickAt : null,
    };
  }

  const runtime = getRuntime(tenantId, botId);
  return {
    authority: 'local-runtime',
    metrics: runtime?.getMetrics() ?? null,
    status: runtime?.getStatus() ?? null,
    heartbeat: runtime?.getHeartbeat() ?? null,
  };
}