import {
  INTEGRATIONS,
  DEFAULT_PRICING,
  createDefaultBudget,
  createDefaultCircuitBreaker,
  createDefaultPolicies,
  TRADING_PLATFORM_CONFIGS,
  STORE_PLATFORM_STRATEGIES,
  SOCIAL_PLATFORM_STRATEGIES,
} from '@beastbots/shared';
import type { BotFamily, IntegrationCategory } from '@beastbots/shared';

// ─── MCP Tool Definitions ─────────────────────────────────────

export interface McpTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (params: Record<string, unknown>) => unknown;
}

// ─── Tool: Operator Catalog ───────────────────────────────────

function operatorCatalog(params: Record<string, unknown>): unknown {
  const category = params.category as IntegrationCategory | undefined;

  let integrations = INTEGRATIONS;
  if (category) {
    integrations = integrations.filter((i) => i.category === category);
  }

  return {
    integrations,
    tradingPlatforms: TRADING_PLATFORM_CONFIGS.map((p) => ({
      platform: p.platform,
      description: p.description,
      strategies: p.supportedStrategies,
      defaultSymbols: p.defaultSymbols,
    })),
    storePlatforms: STORE_PLATFORM_STRATEGIES.map((p) => ({
      platform: p.platform,
      focusAreas: p.focusAreas,
      keyMetrics: p.keyMetrics,
    })),
    socialPlatforms: SOCIAL_PLATFORM_STRATEGIES.map((p) => ({
      platform: p.platform,
      bestFormats: p.bestFormats,
      contentPillars: p.contentPillars,
    })),
  };
}

// ─── Tool: Integration Status ─────────────────────────────────

function integrationStatus(params: Record<string, unknown>): unknown {
  const id = params.id as string | undefined;

  if (id) {
    const integration = INTEGRATIONS.find((i) => i.id === id);
    if (!integration) return { error: `Integration "${id}" not found` };
    return integration;
  }

  return {
    total: INTEGRATIONS.length,
    byStatus: {
      ga: INTEGRATIONS.filter((i) => i.status === 'ga').length,
      beta: INTEGRATIONS.filter((i) => i.status === 'beta').length,
      planned: INTEGRATIONS.filter((i) => i.status === 'planned').length,
    },
    byCategory: {
      trading: INTEGRATIONS.filter((i) => i.category === 'trading').map((i) => i.id),
      ecommerce: INTEGRATIONS.filter((i) => i.category === 'ecommerce').map((i) => i.id),
      social: INTEGRATIONS.filter((i) => i.category === 'social').map((i) => i.id),
    },
  };
}

// ─── Tool: Safety Review ──────────────────────────────────────

function safetyReview(params: Record<string, unknown>): unknown {
  const family = (params.family as BotFamily) ?? 'trading';

  return {
    family,
    safetyLayers: {
      '1_policies': createDefaultPolicies(family),
      '2_approvalQueue': 'Active — high-risk actions require human approval',
      '3_budget': createDefaultBudget(family),
      '4_circuitBreaker': createDefaultCircuitBreaker(),
      '5_auditTrail': 'Immutable, append-only, tenant-scoped',
    },
    recommendations: [
      'Start all new bots in paper trading mode',
      'Set conservative budget limits initially',
      'Review approval queue daily',
      'Monitor circuit breaker trips as health signal',
      'Export audit logs for compliance review',
    ],
  };
}

// ─── Tool: Pricing Info ───────────────────────────────────────

function pricingInfo(params: Record<string, unknown>): unknown {
  const family = params.family as BotFamily | undefined;
  const plans = family
    ? DEFAULT_PRICING.filter((p) => p.family === family)
    : DEFAULT_PRICING;

  return {
    plans,
    summary: {
      lowestTier: '$149/mo (Social Starter)',
      highestTier: '$2,999/mo (Workforce Pro)',
      tradingRange: '$399 – $1,249/mo',
      storeRange: '$249 – $799/mo',
    },
  };
}

// ─── Tool: Market Intelligence ────────────────────────────────

function marketIntelligence(params: Record<string, unknown>): unknown {
  const ticker = params.ticker as string | undefined;
  const source = params.source as string | undefined;

  const sources = ['alpha_vantage', 'coingecko', 'google_trends'];
  if (source && !sources.includes(source)) {
    return { error: `Unknown source. Available: ${sources.join(', ')}` };
  }

  return {
    description: 'Market intelligence aggregator for real-time data enrichment',
    availableSources: [
      { id: 'alpha_vantage', name: 'Alpha Vantage', provides: ['news sentiment', 'technical indicators', 'earnings data'] },
      { id: 'coingecko', name: 'CoinGecko', provides: ['fear & greed index', 'trending coins', 'market dominance'] },
      { id: 'google_trends', name: 'Google Trends (via SerpAPI)', provides: ['search interest', 'rising terms', 'demand signals'] },
    ],
    usage: ticker
      ? `To get market context for ${ticker}, call gatherMarketContext({ ticker: '${ticker}' }) from @beastbots/shared`
      : 'Provide a ticker symbol to get specific guidance',
    envVarsRequired: ['ALPHA_VANTAGE_API_KEY', 'SERP_API_KEY'],
    integrationPoints: {
      trading: 'Sentiment modifier adjusts position confidence; forecast validates direction',
      store: 'Google Trends demand signal adjusts dynamic pricing; Vision AI checks product images',
      social: 'Google Trends detects breakout topics for content timing',
      workforce: 'Document AI processes invoices and contracts automatically',
    },
  };
}

// ─── Tool: Alert Management ──────────────────────────────────

function alertManagement(params: Record<string, unknown>): unknown {
  const action = params.action as string | undefined;

  const actions: Record<string, unknown> = {
    overview: {
      description: 'Multi-channel alert system (SMS + WhatsApp via Twilio, Email via Resend)',
      eventTypes: [
        'circuit_breaker_tripped', 'trade_executed', 'approval_required',
        'budget_warning', 'bot_error', 'daily_summary', 'position_liquidation', 'liquidation_risk',
      ],
      priorities: ['critical', 'high', 'medium', 'low'],
      channels: ['sms', 'whatsapp', 'email'],
      apiEndpoints: [
        'GET  /api/alerts/recipients — list alert recipients',
        'POST /api/alerts/recipients — add recipient',
        'PATCH /api/alerts/recipients/:id — update recipient',
        'DELETE /api/alerts/recipients/:id — remove recipient',
        'POST /api/alerts/test — send test alert',
        'GET  /api/alerts/status — check Twilio config status',
      ],
    },
    setup: {
      steps: [
        '1. Set env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER',
        '2. Optional: TWILIO_WHATSAPP_NUMBER for WhatsApp',
        '3. Optional: RESEND_API_KEY, RESEND_FROM_ADDRESS for email',
        '4. Add recipients via POST /api/alerts/recipients',
        '5. Send test alert via POST /api/alerts/test',
      ],
    },
  };

  if (action && actions[action]) return actions[action];
  return actions.overview;
}

// ─── Tool Registry ────────────────────────────────────────────

const tools: McpTool[] = [
  {
    name: 'operator_catalog',
    description: 'Browse the full BeastBots operator catalog — trading, store, and social bots with platform-specific capabilities',
    parameters: {
      category: { type: 'string', description: 'Filter by category: trading, ecommerce, or social', required: false },
    },
    handler: operatorCatalog,
  },
  {
    name: 'integration_status',
    description: 'Check the status of platform integrations (GA, beta, or planned)',
    parameters: {
      id: { type: 'string', description: 'Specific integration ID (e.g., "coinbase", "shopify")', required: false },
    },
    handler: integrationStatus,
  },
  {
    name: 'safety_review',
    description: 'Review the 5-layer safety model configuration for a bot family',
    parameters: {
      family: { type: 'string', description: 'Bot family: trading, store, social, or workforce', required: false },
    },
    handler: safetyReview,
  },
  {
    name: 'pricing_info',
    description: 'Get pricing plan details for BeastBots operator subscriptions',
    parameters: {
      family: { type: 'string', description: 'Filter by bot family', required: false },
    },
    handler: pricingInfo,
  },
  {
    name: 'market_intelligence',
    description: 'Explore BeastBots market intelligence capabilities — Alpha Vantage, CoinGecko, Google Trends data sources and how they enhance bot decisions',
    parameters: {
      ticker: { type: 'string', description: 'Stock or crypto ticker symbol for specific guidance', required: false },
      source: { type: 'string', description: 'Filter by source: alpha_vantage, coingecko, or google_trends', required: false },
    },
    handler: marketIntelligence,
  },
  {
    name: 'alert_management',
    description: 'Manage BeastBots alert system — SMS, WhatsApp, and email notifications for bot events',
    parameters: {
      action: { type: 'string', description: 'Action: overview or setup', required: false },
    },
    handler: alertManagement,
  },
];

// ─── Stdio JSON-RPC Server ────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function handleJsonRpc(request: JsonRpcRequest): JsonRpcResponse {
  const { id, method, params } = request;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'beastbots-mcp', version: '0.1.0' },
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: {
              type: 'object',
              properties: Object.fromEntries(
                Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type, description: v.description }])
              ),
              required: Object.entries(t.parameters).filter(([, v]) => v.required).map(([k]) => k),
            },
          })),
        },
      };

    case 'tools/call': {
      const toolName = (params?.name as string) ?? '';
      const toolParams = (params?.arguments as Record<string, unknown>) ?? {};
      const tool = tools.find((t) => t.name === toolName);
      if (!tool) {
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) }],
            isError: true,
          },
        };
      }
      const result = tool.handler(toolParams);
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        },
      };
    }

    case 'notifications/initialized':
      return { jsonrpc: '2.0', id: id ?? null, result: {} };

    default:
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}

// ─── Server Entrypoint ────────────────────────────────────────

export function startMcpServer(): {
  name: string;
  capabilities: string[];
  tools: McpTool[];
  handleToolCall: (toolName: string, params: Record<string, unknown>) => unknown;
} {
  return {
    name: 'beastbots-mcp',
    capabilities: tools.map((t) => t.name),
    tools,
    handleToolCall: (toolName: string, params: Record<string, unknown>) => {
      const tool = tools.find((t) => t.name === toolName);
      if (!tool) return { error: `Unknown tool: ${toolName}` };
      return tool.handler(params);
    },
  };
}

// Stdio mode for MCP clients (Claude, etc.)
export function startStdioServer(): void {
  let buffer = '';

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const request = JSON.parse(trimmed) as JsonRpcRequest;
        if (request.method === 'notifications/initialized') continue;
        const response = handleJsonRpc(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    }
  });
}

// ─── HTTP listener helper ─────────────────────────────────────
import http from 'http';

export function startHttpServer(port: number = 4001): http.Server {
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const request = JSON.parse(body) as JsonRpcRequest;
        const response = handleJsonRpc(request);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (e) {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        };
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorResponse));
      }
    });
  });

  server.listen(port, () => {
    console.log(`MCP HTTP server listening on http://localhost:${port}`);
  });
  return server;
}

// Auto-start in stdio mode when run directly
if (process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server.ts'))) {
  // choose mode based on env
  if (process.env.MCP_HTTP === 'true') {
    const port = Number(process.env.MCP_PORT) || 4001;
    startHttpServer(port);
  } else {
    startStdioServer();
  }
}
