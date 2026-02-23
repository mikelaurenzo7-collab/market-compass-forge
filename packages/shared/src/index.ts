/**
 * Grapevine shared types and API client
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  orgs: { id: string; role: string }[];
}

export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  org_id: string;
  position_count: number;
  total_cost: number;
  total_value: number;
}

export interface SimulationResult {
  irr_distribution: number[];
  moic_distribution: number[];
  var_95: number;
  cvar_95: number;
  mean_irr: number;
  median_irr: number;
  mean_moic: number;
  median_moic: number;
  downside_prob_below_threshold: number;
  n_trials: number;
}

export interface Simulation {
  id: string;
  portfolio_id: string;
  status: string;
  n_trials: number;
  results?: SimulationResult;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export class ApiClient {
  constructor(
    private baseUrl: string,
    private getToken: () => string | null,
    private getOrgId: () => string | null
  ) {}

  private async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const orgId = this.getOrgId();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (orgId) headers["X-Org-Id"] = orgId;

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || JSON.stringify(err));
    }
    return res.json();
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return this.fetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(
    email: string,
    password: string,
    fullName?: string,
    orgName?: string
  ): Promise<LoginResponse> {
    return this.fetch<LoginResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        org_name: orgName || "Default Organization",
      }),
    });
  }

  async listPortfolios(): Promise<Portfolio[]> {
    return this.fetch<Portfolio[]>("/portfolios");
  }

  async createPortfolio(name: string, description?: string): Promise<Portfolio> {
    return this.fetch<Portfolio>("/portfolios", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  }

  async getPortfolio(id: string): Promise<any> {
    return this.fetch(`/portfolios/${id}`);
  }

  async createSimulation(params: {
    portfolio_id: string;
    scenario_template_id?: string;
    scenario_id?: string;
    n_trials?: number;
    seed?: number;
  }): Promise<{ simulation_id: string; job_id: string; status: string }> {
    return this.fetch("/simulations", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getSimulation(id: string): Promise<Simulation> {
    return this.fetch<Simulation>(`/simulations/${id}`);
  }

  async listScenarioTemplates(): Promise<ScenarioTemplate[]> {
    return this.fetch<ScenarioTemplate[]>("/simulations/templates/list");
  }

  async listDeals(): Promise<any[]> {
    return this.fetch("/deals");
  }

  async scoreDeal(dealId?: string, data?: Record<string, any>): Promise<any> {
    return this.fetch("/deals/score", {
      method: "POST",
      body: JSON.stringify({ deal_id: dealId, ...data }),
    });
  }

  async listScenarios(): Promise<any[]> {
    return this.fetch("/scenarios");
  }

  async createScenario(params: {
    name: string;
    description?: string;
    params?: Record<string, any>;
    sector_overrides?: Record<string, any>;
  }): Promise<any> {
    return this.fetch("/scenarios", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getGraphSubgraph(centerId: string, depth?: number): Promise<any> {
    const q = depth ? `?depth=${depth}` : "";
    return this.fetch(`/graph/subgraph/${centerId}${q}`);
  }

  async getGraphCentrality(): Promise<any[]> {
    return this.fetch("/graph/insights/centrality");
  }
}
