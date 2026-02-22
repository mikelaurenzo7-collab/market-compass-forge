export type ApiAction =
  | "companies"
  | "market-data"
  | "screening"
  | "financials"
  | "funding"
  | "investors"
  | "news"
  | "distressed"
  | "deals"
  | "funds"
  | "global-opportunities"
  | "real-estate"
  | "signals"
  | "precedent-transactions";

export interface ApiMeta {
  total: number | null;
  limit: number;
  offset: number;
  action: ApiAction;
  tier: string;
  current_hour_requests?: number;
}

export interface ApiResponse<T = unknown> {
  data: T[];
  meta: ApiMeta;
  rateLimit?: {
    remaining?: number;
    tier?: string;
    limit?: number;
  };
}

export interface MarketCompassClientOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export type ApiParams = Record<string, string | number | boolean | undefined | null>;

export const buildQuery = (params: ApiParams) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  return search.toString();
};

export class MarketCompassApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: MarketCompassClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T = unknown>(action: ApiAction, params: ApiParams = {}): Promise<ApiResponse<T>> {
    const query = buildQuery({ action, ...params });
    const resp = await this.fetchImpl(`${this.baseUrl}/functions/v1/api-access?${query}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    const payload = await resp.json();
    if (!resp.ok) {
      throw new Error(payload?.error ?? `API request failed with ${resp.status}`);
    }

    return {
      ...(payload as ApiResponse<T>),
      rateLimit: {
        remaining: Number(resp.headers.get("X-RateLimit-Remaining") ?? "" ) || undefined,
        tier: resp.headers.get("X-RateLimit-Tier") ?? undefined,
        limit: Number(resp.headers.get("X-RateLimit-Limit") ?? "") || undefined,
      },
    };
  }

  companies(params: ApiParams = {}) { return this.request("companies", params); }
  marketData(params: ApiParams = {}) { return this.request("market-data", params); }
  screening(params: ApiParams = {}) { return this.request("screening", params); }
  financials(params: ApiParams = {}) { return this.request("financials", params); }
  funding(params: ApiParams = {}) { return this.request("funding", params); }
  investors(params: ApiParams = {}) { return this.request("investors", params); }
  news(params: ApiParams = {}) { return this.request("news", params); }
  distressed(params: ApiParams = {}) { return this.request("distressed", params); }
  deals(params: ApiParams = {}) { return this.request("deals", params); }
  funds(params: ApiParams = {}) { return this.request("funds", params); }
  globalOpportunities(params: ApiParams = {}) { return this.request("global-opportunities", params); }
  realEstate(params: ApiParams = {}) { return this.request("real-estate", params); }
  signals(params: ApiParams = {}) { return this.request("signals", params); }
  precedentTransactions(params: ApiParams = {}) { return this.request("precedent-transactions", params); }
}
