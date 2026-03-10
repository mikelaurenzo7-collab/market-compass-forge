import type {
  BotFamily,
  Platform,
  TradingPlatform,
  StorePlatform,
  SocialPlatform,
  TradingStrategy,
  StoreStrategy,
  SocialStrategy,
  BotStatus,
  BotMetrics,
  TickResult,
} from '@beastbots/shared';

// ─── Bot Manifest ─────────────────────────────────────────────

export interface BotManifest {
  id: string;
  family: BotFamily;
  name: string;
  description: string;
  platform: Platform;
  version: string;
  author?: string;
  tags?: string[];
}

export function defineBot(manifest: BotManifest): BotManifest {
  return manifest;
}

// ─── SDK Client ───────────────────────────────────────────────

export interface BeastBotsClientConfig {
  apiUrl: string;
  apiKey: string;
}

export class BeastBotsClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: BeastBotsClientConfig) {
    this.baseUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`BeastBots API error (${response.status}): ${body}`);
    }

    const json = await response.json() as { success: boolean; data: T; error?: string };
    if (!json.success) {
      throw new Error(`BeastBots API error: ${json.error ?? 'Unknown error'}`);
    }
    return json.data;
  }

  // ─── Health ───────────────────────────────────

  async health(): Promise<{ service: string; status: string; version: string }> {
    return this.request('/api/health');
  }

  // ─── Integrations ─────────────────────────────

  async listIntegrations(category?: string): Promise<unknown[]> {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/api/integrations${params}`);
  }

  async getIntegration(id: string): Promise<unknown> {
    return this.request(`/api/integrations/${encodeURIComponent(id)}`);
  }

  // ─── Pricing ──────────────────────────────────

  async listPricing(family?: BotFamily): Promise<unknown[]> {
    const path = family ? `/api/pricing/${encodeURIComponent(family)}` : '/api/pricing';
    return this.request(path);
  }

  // ─── Bots ─────────────────────────────────────

  async listBots(tenantId: string, family?: BotFamily): Promise<unknown[]> {
    let params = `?tenantId=${encodeURIComponent(tenantId)}`;
    if (family) params += `&family=${encodeURIComponent(family)}`;
    return this.request(`/api/bots${params}`);
  }

  async getBot(id: string): Promise<unknown> {
    return this.request(`/api/bots/${encodeURIComponent(id)}`);
  }

  async createBot(params: {
    tenantId: string;
    family: BotFamily;
    platform: string;
    name: string;
    config?: Record<string, unknown>;
  }): Promise<unknown> {
    return this.request('/api/bots', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async startBot(id: string): Promise<unknown> {
    return this.request(`/api/bots/${encodeURIComponent(id)}/start`, { method: 'POST' });
  }

  async pauseBot(id: string): Promise<unknown> {
    return this.request(`/api/bots/${encodeURIComponent(id)}/pause`, { method: 'POST' });
  }

  async stopBot(id: string): Promise<unknown> {
    return this.request(`/api/bots/${encodeURIComponent(id)}/stop`, { method: 'POST' });
  }

  async killBot(id: string): Promise<unknown> {
    return this.request(`/api/bots/${encodeURIComponent(id)}/kill`, { method: 'POST' });
  }

  async deleteBot(id: string): Promise<unknown> {
    return this.request(`/api/bots/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // ─── Safety ───────────────────────────────────

  async getSafetyDefaults(family: BotFamily): Promise<unknown> {
    return this.request(`/api/safety/defaults/${encodeURIComponent(family)}`);
  }

  async getAuditLog(tenantId: string, limit?: number): Promise<unknown[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/api/safety/audit/${encodeURIComponent(tenantId)}${params}`);
  }

  async getPendingApprovals(tenantId: string): Promise<unknown[]> {
    return this.request(`/api/safety/approvals/${encodeURIComponent(tenantId)}`);
  }

  async resolveApproval(id: string, approved: boolean, resolvedBy: string): Promise<unknown> {
    return this.request(`/api/safety/approvals/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ approved, resolvedBy }),
    });
  }

  // ─── Platform Capabilities ────────────────────

  async getTradingPlatforms(): Promise<unknown[]> {
    return this.request('/api/bots/platforms/trading');
  }

  async getStorePlatforms(): Promise<unknown[]> {
    return this.request('/api/bots/platforms/store');
  }

  async getSocialPlatforms(): Promise<unknown[]> {
    return this.request('/api/bots/platforms/social');
  }
}

// ─── Convenience Constructor ──────────────────────────────────

export function createClient(config: BeastBotsClientConfig): BeastBotsClient {
  return new BeastBotsClient(config);
}

// ─── Re-exports for SDK consumers ─────────────────────────────

export type {
  BotFamily,
  Platform,
  TradingPlatform,
  StorePlatform,
  SocialPlatform,
  TradingStrategy,
  StoreStrategy,
  SocialStrategy,
  BotStatus,
  BotMetrics,
  TickResult,
};
