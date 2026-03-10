import {
  INTEGRATIONS,
  DEFAULT_PRICING,
  createDefaultBudget,
  createDefaultCircuitBreaker,
  createDefaultPolicies,
} from '@beastbots/shared';
import type { BotFamily, IntegrationCategory } from '@beastbots/shared';
import { TRADING_PLATFORM_CONFIGS } from '@beastbots/shared/src/trading/engine.js';
import { STORE_PLATFORM_STRATEGIES } from '@beastbots/shared/src/store/strategies.js';
import { SOCIAL_PLATFORM_STRATEGIES } from '@beastbots/shared/src/social/strategies.js';

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
];

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
