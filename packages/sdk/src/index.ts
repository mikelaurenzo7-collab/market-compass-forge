import type { BotFamily, PricingTier, IntegrationCategory, IntegrationStatus } from '@beastbots/shared';

export type { BotFamily, PricingTier, IntegrationCategory, IntegrationStatus };

export interface BotManifest {
  id: string;
  family: BotFamily;
  name: string;
  description: string;
}

export function defineBot(manifest: BotManifest): BotManifest {
  return manifest;
}

// ─── API Client ───────────────────────────────────────────────────────────────

export interface BeastBotsClientOptions {
  /** Base URL of the BeastBots API (e.g. https://api.beastbots.io). */
  baseUrl: string;
  /** Bearer token for authenticated requests. */
  token?: string;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export class BeastBotsClient {
  private readonly baseUrl: string;
  private token: string | undefined;

  constructor(options: BeastBotsClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
  }

  /** Update the bearer token (e.g. after refreshing credentials). */
  setToken(token: string): void {
    this.token = token;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: RequestOptions
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: opts?.signal,
    });
    const json = (await res.json()) as { success: boolean; data?: T; error?: { message: string } };
    if (!json.success) {
      throw new Error(json.error?.message ?? 'API request failed');
    }
    return json.data as T;
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  async getToken(tenantId: string, secret: string): Promise<{ token: string; expiresIn: number }> {
    return this.request('POST', '/api/auth/token', { tenantId, secret });
  }

  // ── Integrations ──────────────────────────────────────────────────────────

  async listIntegrations(filters?: {
    category?: IntegrationCategory;
    status?: IntegrationStatus;
  }) {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/api/integrations${qs}`);
  }

  // ── Pricing / Billing ─────────────────────────────────────────────────────

  async listPlans(family?: BotFamily) {
    const path = family ? `/api/billing/plans/${family}` : '/api/billing/plans';
    return this.request('GET', path);
  }

  async subscribe(family: BotFamily, tier: PricingTier, stripePaymentMethodId: string) {
    return this.request('POST', '/api/billing/subscribe', {
      family,
      tier,
      stripePaymentMethodId,
    });
  }

  // ── Approvals ─────────────────────────────────────────────────────────────

  async listApprovals() {
    return this.request('GET', '/api/approvals');
  }

  async createApproval(botId: string, action: string, payload: Record<string, unknown>) {
    return this.request('POST', '/api/approvals', { botId, action, payload });
  }

  async resolveApproval(id: string, status: 'approved' | 'rejected') {
    return this.request('PATCH', `/api/approvals/${id}`, { status });
  }

  // ── Governance ────────────────────────────────────────────────────────────

  async listPolicies() {
    return this.request('GET', '/api/governance/policies');
  }

  async getAuditLog() {
    return this.request('GET', '/api/governance/audit-log');
  }
}
