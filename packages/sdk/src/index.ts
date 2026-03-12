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

// ─── Response Types ───────────────────────────────────────────

export interface IntegrationInfo {
  id: string;
  name: string;
  category: string;
  status: string;
  description: string;
  authType: string;
}

export interface PricingPlan {
  family: string;
  tier: string;
  name: string;
  priceMonthly: number;
  maxBots: number;
  features: string[];
}

export interface BotInfo {
  id: string;
  name: string;
  family: BotFamily;
  platform: string;
  status: BotStatus;
  createdAt: number;
  updatedAt: number;
  config: Record<string, unknown>;
  metrics?: BotMetrics;
}

export interface BotActionResult {
  id: string;
  status: BotStatus;
}

export interface SafetyDefaults {
  policies: unknown[];
  budget: unknown;
  circuitBreaker: unknown;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  action: string;
  result: string;
  riskLevel: string;
  timestamp: number;
  details?: unknown;
}

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

  async listIntegrations(category?: string): Promise<IntegrationInfo[]> {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/api/integrations${params}`);
  }

  async getIntegration(id: string): Promise<IntegrationInfo> {
    return this.request(`/api/integrations/${encodeURIComponent(id)}`);
  }

  // ─── Pricing ──────────────────────────────────

  async listPricing(family?: BotFamily): Promise<PricingPlan[]> {
    const path = family ? `/api/pricing/${encodeURIComponent(family)}` : '/api/pricing';
    return this.request(path);
  }

  // ─── Bots ─────────────────────────────────────

  async listBots(tenantId: string, family?: BotFamily): Promise<BotInfo[]> {
    let params = `?tenantId=${encodeURIComponent(tenantId)}`;
    if (family) params += `&family=${encodeURIComponent(family)}`;
    return this.request(`/api/bots${params}`);
  }

  async getBot(id: string): Promise<BotInfo> {
    return this.request(`/api/bots/${encodeURIComponent(id)}`);
  }

  async createBot(params: {
    tenantId: string;
    family: BotFamily;
    platform: string;
    name: string;
    config?: Record<string, unknown>;
  }): Promise<BotInfo> {
    return this.request('/api/bots', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async startBot(id: string): Promise<BotActionResult> {
    return this.request(`/api/bots/${encodeURIComponent(id)}/start`, { method: 'POST' });
  }

  async pauseBot(id: string): Promise<BotActionResult> {
    return this.request(`/api/bots/${encodeURIComponent(id)}/pause`, { method: 'POST' });
  }

  async stopBot(id: string): Promise<BotActionResult> {
    return this.request(`/api/bots/${encodeURIComponent(id)}/stop`, { method: 'POST' });
  }

  async killBot(id: string): Promise<BotActionResult> {
    return this.request(`/api/bots/${encodeURIComponent(id)}/kill`, { method: 'POST' });
  }

  async deleteBot(id: string): Promise<{ deleted: boolean }> {
    return this.request(`/api/bots/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // ─── Safety ───────────────────────────────────

  async getSafetyDefaults(family: BotFamily): Promise<SafetyDefaults> {
    return this.request(`/api/safety/defaults/${encodeURIComponent(family)}`);
  }

  async getAuditLog(limit?: number, offset?: number): Promise<AuditLogEntry[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    const qs = params.toString();
    return this.request(`/api/audit${qs ? `?${qs}` : ''}`);
  }

  async getPendingApprovals(): Promise<unknown[]> {
    return this.request('/api/safety/approvals');
  }

  async resolveApproval(id: string, approved: boolean, resolvedBy: string): Promise<unknown> {
    return this.request(`/api/safety/approvals/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ approved, resolvedBy }),
    });
  }

  // ─── Analytics ─────────────────────────────────

  async getAnalytics(botId?: string): Promise<unknown> {
    const params = botId ? `?botId=${encodeURIComponent(botId)}` : '';
    return this.request(`/api/analytics${params}`);
  }

  // ─── Compliance ───────────────────────────────

  async generateComplianceReport(params: {
    reportType: string;
    families?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<unknown> {
    return this.request('/api/compliance/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async listComplianceReports(): Promise<unknown[]> {
    return this.request('/api/compliance/reports');
  }

  // ─── Performance ──────────────────────────────

  async generatePerformanceReport(params: {
    period: 'weekly' | 'monthly';
  }): Promise<unknown> {
    return this.request('/api/performance/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async listPerformanceReports(): Promise<unknown[]> {
    return this.request('/api/performance/reports');
  }

  // ─── Push Notifications ───────────────────────

  async subscribePush(endpoint: string, keys: { p256dh: string; auth: string }): Promise<unknown> {
    return this.request('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint, keys }),
    });
  }

  // ─── Federated Learning ───────────────────────

  async getFederatedStatus(): Promise<unknown> {
    return this.request('/api/federated/status');
  }

  async optInFederated(enabled: boolean): Promise<unknown> {
    return this.request('/api/federated/opt-in', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  // ─── Templates ────────────────────────────────

  async listTemplates(family?: string): Promise<unknown[]> {
    const params = family ? `?family=${encodeURIComponent(family)}` : '';
    return this.request(`/api/templates${params}`);
  }

  async deployTemplate(templateId: string, config?: Record<string, unknown>): Promise<unknown> {
    return this.request(`/api/templates/${encodeURIComponent(templateId)}/deploy`, {
      method: 'POST',
      body: JSON.stringify(config ?? {}),
    });
  }

  // ─── Notification Preferences ─────────────────

  async getNotificationPreferences(): Promise<unknown> {
    return this.request('/api/notifications/preferences');
  }

  async updateNotificationPreferences(prefs: Record<string, unknown>): Promise<unknown> {
    return this.request('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
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
